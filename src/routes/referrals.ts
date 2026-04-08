import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, referralCommissionsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/referrals/stats", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const [me] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!me) { res.status(404).json({ error: "User not found" }); return; }

    // Direct referrals (level 1)
    const level1 = await db.select().from(usersTable)
      .where(eq(usersTable.referredBy, me.referralCode));

    // Level 2 referrals
    const l1Codes = level1.map(u => u.referralCode);
    const level2 = l1Codes.length > 0
      ? await db.select().from(usersTable)
          .where(sql`referred_by = ANY(${l1Codes})`)
      : [];

    // Level 3 referrals
    const l2Codes = level2.map(u => u.referralCode);
    const level3 = l2Codes.length > 0
      ? await db.select().from(usersTable)
          .where(sql`referred_by = ANY(${l2Codes})`)
      : [];

    // Commissions earned
    const [commTotal] = await db.select({
      total: sql<number>`COALESCE(SUM(amount)::numeric, 0)`,
    }).from(referralCommissionsTable)
      .where(eq(referralCommissionsTable.userId, userId));

    const commByLevel = await db.select({
      level: referralCommissionsTable.level,
      total: sql<number>`COALESCE(SUM(amount)::numeric, 0)`,
    }).from(referralCommissionsTable)
      .where(eq(referralCommissionsTable.userId, userId))
      .groupBy(referralCommissionsTable.level);

    const recentComms = await db.select({
      id: referralCommissionsTable.id,
      level: referralCommissionsTable.level,
      amount: referralCommissionsTable.amount,
      sourceAmount: referralCommissionsTable.sourceAmount,
      createdAt: referralCommissionsTable.createdAt,
      fromUserId: referralCommissionsTable.fromUserId,
    }).from(referralCommissionsTable)
      .where(eq(referralCommissionsTable.userId, userId))
      .orderBy(sql`created_at DESC`)
      .limit(20);

    res.json({
      referralCode: me.referralCode,
      level1Count: level1.length,
      level2Count: level2.length,
      level3Count: level3.length,
      totalTeam: level1.length + level2.length + level3.length,
      totalCommissions: parseFloat(commTotal?.total?.toString() || "0"),
      commissionsByLevel: {
        1: parseFloat(commByLevel.find(c => c.level === 1)?.total?.toString() || "0"),
        2: parseFloat(commByLevel.find(c => c.level === 2)?.total?.toString() || "0"),
        3: parseFloat(commByLevel.find(c => c.level === 3)?.total?.toString() || "0"),
      },
      recentCommissions: recentComms.map(c => ({
        id: c.id,
        level: c.level,
        amount: parseFloat(c.amount.toString()),
        sourceAmount: parseFloat(c.sourceAmount.toString()),
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Referral stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
