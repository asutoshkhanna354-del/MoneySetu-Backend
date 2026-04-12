import { db } from "@workspace/db";
import { usersTable, investmentPlansTable } from "@workspace/db/schema";
import { sql, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logger } from "./logger.js";

const PLAN_IMAGES: Record<string, string> = {
  Bronze:   "https://lh3.googleusercontent.com/d/1Y_h7mitEwxSrn8R1AFG6mD-JFlmLBCIu",
  Silver:   "https://lh3.googleusercontent.com/d/1Pjla3LhhFiqV4YMKpfp_sGggnFMuRfp7",
  Gold:     "https://lh3.googleusercontent.com/d/16bmT3DfV4OXDMfUbO0NkHyo1osxR952D",
  Platinum: "https://lh3.googleusercontent.com/d/1G7RGSDX0ZrfzyQWY_NG0U8iYh2WzAdQN",
  Diamond:  "https://lh3.googleusercontent.com/d/1SDAdZJ-OuwUh1IeC1grksgzVBw3V1G17",
};

export async function runMigrations() {
  try {
    // Create all tables (safe on fresh DB — IF NOT EXISTS skips existing ones)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id               SERIAL PRIMARY KEY,
        name             TEXT NOT NULL,
        username         TEXT UNIQUE,
        phone            TEXT UNIQUE,
        email            TEXT UNIQUE,
        password_hash    TEXT NOT NULL,
        is_admin         BOOLEAN NOT NULL DEFAULT false,
        referral_code    TEXT NOT NULL UNIQUE,
        referred_by      TEXT,
        balance          NUMERIC(15,2) NOT NULL DEFAULT 0,
        total_invested   NUMERIC(15,2) NOT NULL DEFAULT 0,
        total_earnings   NUMERIC(15,2) NOT NULL DEFAULT 0,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS investment_plans (
        id                    SERIAL PRIMARY KEY,
        name                  TEXT NOT NULL,
        description           TEXT NOT NULL,
        min_amount            NUMERIC(15,2) NOT NULL,
        max_amount            NUMERIC(15,2) NOT NULL,
        daily_return_percent  NUMERIC(5,2) NOT NULL,
        duration_days         INTEGER NOT NULL,
        is_active             BOOLEAN NOT NULL DEFAULT true,
        image_url             TEXT,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_investments (
        id                    SERIAL PRIMARY KEY,
        user_id               INTEGER NOT NULL REFERENCES users(id),
        plan_id               INTEGER NOT NULL REFERENCES investment_plans(id),
        amount                NUMERIC(15,2) NOT NULL,
        daily_return_percent  NUMERIC(5,2) NOT NULL,
        duration_days         INTEGER NOT NULL,
        status                TEXT NOT NULL DEFAULT 'active',
        start_date            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        end_date              TIMESTAMPTZ NOT NULL,
        total_earned          NUMERIC(15,2) NOT NULL DEFAULT 0,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER NOT NULL REFERENCES users(id),
        type            TEXT NOT NULL,
        amount          NUMERIC(15,2) NOT NULL,
        status          TEXT NOT NULL DEFAULT 'pending',
        payment_method  TEXT,
        notes           TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS referral_commissions (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER NOT NULL REFERENCES users(id),
        from_user_id   INTEGER NOT NULL REFERENCES users(id),
        level          INTEGER NOT NULL,
        amount         NUMERIC(15,2) NOT NULL,
        source_amount  NUMERIC(15,2) NOT NULL,
        type           TEXT NOT NULL DEFAULT 'deposit',
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS site_settings (
        id          SERIAL PRIMARY KEY,
        key         TEXT NOT NULL UNIQUE,
        value       TEXT NOT NULL DEFAULT '',
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS fake_activity (
        id          SERIAL PRIMARY KEY,
        user_name   TEXT NOT NULL,
        type        TEXT NOT NULL,
        amount      NUMERIC(15,2) NOT NULL,
        city        TEXT,
        is_active   BOOLEAN NOT NULL DEFAULT true,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    logger.info("Migration OK: all tables ensured");
  } catch (err) {
    logger.error({ err }, "Migration warning (non-fatal)");
  }
}

export async function seedDefaultAdmin() {
  try {
    // Always ensure the admin user exists with username="admin"
    const [existingAdmin] = await db
      .select()
      .from(usersTable)
      .where(sql`is_admin = true`)
      .limit(1);

    const ADMIN_USERNAME = "adminmoneysetuscam";
    const ADMIN_PASSWORD = "Scammer113@";

    if (existingAdmin) {
      const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await db
        .update(usersTable)
        .set({ username: ADMIN_USERNAME, passwordHash: adminHash })
        .where(sql`id = ${existingAdmin.id}`);
      logger.info(`Admin credentials updated: username=${ADMIN_USERNAME}`);
    } else {
      const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await db.insert(usersTable).values({
        name: "Admin",
        username: ADMIN_USERNAME,
        phone: null,
        passwordHash: adminHash,
        isAdmin: true,
        referralCode: "ADMIN001",
      });
      logger.info(`Created admin user: username=${ADMIN_USERNAME}`);
    }

    // Seed MoneySetu investment plans if none exist
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(investmentPlansTable);

    if (count === 0) {
      await db.insert(investmentPlansTable).values([
        {
          name: "Bronze",
          description: "Starter plan — perfect for first-time investors",
          minAmount: "100",
          maxAmount: "4999",
          dailyReturnPercent: "1.0",
          durationDays: 15,
          isActive: true,
          imageUrl: PLAN_IMAGES.Bronze,
        },
        {
          name: "Silver",
          description: "Entry-level plan for new investors",
          minAmount: "5000",
          maxAmount: "9999",
          dailyReturnPercent: "2.0",
          durationDays: 30,
          isActive: true,
          imageUrl: PLAN_IMAGES.Silver,
        },
        {
          name: "Gold",
          description: "Balanced returns for growing investors",
          minAmount: "10000",
          maxAmount: "49999",
          dailyReturnPercent: "3.0",
          durationDays: 60,
          isActive: true,
          imageUrl: PLAN_IMAGES.Gold,
        },
        {
          name: "Platinum",
          description: "High-yield returns for serious investors",
          minAmount: "50000",
          maxAmount: "199999",
          dailyReturnPercent: "4.0",
          durationDays: 90,
          isActive: true,
          imageUrl: PLAN_IMAGES.Platinum,
        },
        {
          name: "Diamond",
          description: "Maximum returns for elite investors",
          minAmount: "200000",
          maxAmount: "10000000",
          dailyReturnPercent: "5.0",
          durationDays: 180,
          isActive: true,
          imageUrl: PLAN_IMAGES.Diamond,
        },
      ]);
      logger.info("Seeded 5 MoneySetu investment plans");
    } else {
      // Ensure image URLs and Bronze plan are always up-to-date
      const existing = await db.select().from(investmentPlansTable);
      const existingNames = existing.map(p => p.name);

      // Update image URLs for existing plans
      for (const [name, imageUrl] of Object.entries(PLAN_IMAGES)) {
        const plan = existing.find(p => p.name === name);
        if (plan) {
          await db.update(investmentPlansTable)
            .set({ imageUrl })
            .where(eq(investmentPlansTable.id, plan.id));
        }
      }

      // Always keep Bronze and Silver amounts correct
      const bronzePlan = existing.find(p => p.name === "Bronze");
      if (bronzePlan) {
        await db.update(investmentPlansTable)
          .set({ minAmount: "100", maxAmount: "4999" })
          .where(eq(investmentPlansTable.id, bronzePlan.id));
      }
      const silverPlan = existing.find(p => p.name === "Silver");
      if (silverPlan) {
        await db.update(investmentPlansTable)
          .set({ minAmount: "5000", maxAmount: "9999" })
          .where(eq(investmentPlansTable.id, silverPlan.id));
      }

      // Insert Bronze if missing
      if (!existingNames.includes("Bronze")) {
        await db.insert(investmentPlansTable).values({
          name: "Bronze",
          description: "Starter plan — perfect for first-time investors",
          minAmount: "100",
          maxAmount: "4999",
          dailyReturnPercent: "1.0",
          durationDays: 15,
          isActive: true,
          imageUrl: PLAN_IMAGES.Bronze,
        });
        logger.info("Added Bronze investment plan");
      }

      logger.info("Investment plan images updated");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed");
  }
}
