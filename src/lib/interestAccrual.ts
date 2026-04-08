import { db } from "@workspace/db";
import { userInvestmentsTable, usersTable, transactionsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "./logger.js";

export async function accrueInterest() {
  try {
    const now = new Date();

    // Get all active investments
    const activeInvestments = await db.select()
      .from(userInvestmentsTable)
      .where(eq(userInvestmentsTable.status, "active"));

    let processed = 0;

    for (const inv of activeInvestments) {
      // Check if investment has expired
      const endDate = new Date(inv.endDate);
      if (now >= endDate) {
        await db.update(userInvestmentsTable)
          .set({ status: "completed" })
          .where(eq(userInvestmentsTable.id, inv.id));
        continue;
      }

      // Calculate today's interest
      const dailyEarning = parseFloat(inv.amount) * (parseFloat(inv.dailyReturnPercent) / 100);
      const earned = parseFloat(dailyEarning.toFixed(2));

      // Credit to user balance
      await db.update(usersTable).set({
        balance: sql`balance + ${earned}`,
        totalEarnings: sql`total_earnings + ${earned}`,
      }).where(eq(usersTable.id, inv.userId));

      // Update totalEarned on investment
      await db.update(userInvestmentsTable).set({
        totalEarned: sql`total_earned + ${earned}`,
      }).where(eq(userInvestmentsTable.id, inv.id));

      // Log as an earning transaction
      await db.insert(transactionsTable).values({
        userId: inv.userId,
        type: "earning",
        amount: earned.toString(),
        status: "approved",
        notes: `Daily interest from plan (${inv.dailyReturnPercent}%)`,
      });

      processed++;
    }

    if (processed > 0) {
      logger.info({ processed }, "Interest accrued for investments");
    }
  } catch (err) {
    logger.error({ err }, "Interest accrual error");
  }
}

export function startInterestCron() {
  // Run once at startup (for testing), then every 24 hours
  const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  logger.info("Interest accrual cron started (runs every 24h)");

  // Run at midnight every day
  const scheduleNext = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // next midnight
    const msUntilMidnight = midnight.getTime() - now.getTime();

    setTimeout(async () => {
      await accrueInterest();
      setInterval(accrueInterest, INTERVAL_MS);
    }, msUntilMidnight);
  };

  scheduleNext();
}
