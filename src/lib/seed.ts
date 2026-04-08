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

export async function seedDefaultAdmin() {
  try {
    // Always ensure the admin user exists with username="admin"
    const [existingAdmin] = await db
      .select()
      .from(usersTable)
      .where(sql`is_admin = true`)
      .limit(1);

    if (existingAdmin) {
      if (!existingAdmin.username) {
        await db
          .update(usersTable)
          .set({ username: "admin" })
          .where(sql`id = ${existingAdmin.id}`);
        logger.info(`Updated admin user (id=${existingAdmin.id}) username to 'admin'`);
      } else {
        logger.info(`Admin user already set up: username=${existingAdmin.username}`);
      }
    } else {
      const adminHash = await bcrypt.hash("admin123", 10);
      await db.insert(usersTable).values({
        name: "Admin",
        username: "admin",
        phone: null,
        passwordHash: adminHash,
        isAdmin: true,
        referralCode: "ADMIN001",
      });
      logger.info("Created admin user: username=admin / admin123");
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
