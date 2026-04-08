import { db } from "@workspace/db";
import { usersTable, referralCommissionsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const REFERRAL_RATES = [0.05, 0.03, 0.01]; // L1=5%, L2=3%, L3=1%

export async function applyReferralCommissions(depositUserId: number, depositAmount: number) {
  try {
    const [depositor] = await db.select().from(usersTable).where(eq(usersTable.id, depositUserId));
    if (!depositor?.referredBy) return;

    let currentCode = depositor.referredBy;
    for (let level = 1; level <= 3; level++) {
      const [referrer] = await db.select().from(usersTable)
        .where(eq(usersTable.referralCode, currentCode));
      if (!referrer) break;

      const commAmount = parseFloat((depositAmount * REFERRAL_RATES[level - 1]).toFixed(2));
      await db.insert(referralCommissionsTable).values({
        userId: referrer.id,
        fromUserId: depositUserId,
        level,
        amount: commAmount.toString(),
        sourceAmount: depositAmount.toString(),
      });
      await db.update(usersTable).set({
        balance: sql`balance + ${commAmount}`,
        totalEarnings: sql`total_earnings + ${commAmount}`,
      }).where(eq(usersTable.id, referrer.id));

      if (!referrer.referredBy) break;
      currentCode = referrer.referredBy;
    }
  } catch (err) {
    console.error("Referral commission error:", err);
  }
}
