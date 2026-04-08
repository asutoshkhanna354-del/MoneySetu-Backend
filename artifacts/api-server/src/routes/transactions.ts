import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, usersTable } from "@workspace/db/schema";
import { eq, desc, and, ne, gte, notInArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

// POST /api/withdraw — user requests a withdrawal (₹10–₹10,000, once per 10 days)
router.post("/withdraw", requireAuth, async (req, res) => {
  try {
    const { amount, accountNo, ifsc, phone, accountName, notes } = req.body;
    const userId = req.user!.userId;

    const withdrawAmt = parseFloat(amount);
    if (!amount || isNaN(withdrawAmt) || withdrawAmt < 10) {
      res.status(400).json({ error: "Minimum withdrawal is ₹10" });
      return;
    }
    if (withdrawAmt > 10000) {
      res.status(400).json({ error: "Maximum withdrawal is ₹10,000 per request" });
      return;
    }

    // 10-day cooldown check — find last non-rejected withdrawal
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const [recentWithdrawal] = await db
      .select()
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.userId, userId),
        eq(transactionsTable.type, "withdrawal"),
        ne(transactionsTable.status, "rejected"),
        gte(transactionsTable.createdAt, tenDaysAgo),
      ))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(1);

    if (recentWithdrawal) {
      const nextEligible = new Date(recentWithdrawal.createdAt.getTime() + 10 * 24 * 60 * 60 * 1000);
      const daysLeft = Math.ceil((nextEligible.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      res.status(400).json({
        error: `You can only withdraw once every 10 days. Next withdrawal available in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}.`,
        nextEligibleDate: nextEligible.toISOString(),
        daysLeft,
      });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const balance = parseFloat(user.balance || "0");
    if (balance < withdrawAmt) {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }

    // Deduct balance immediately (held pending admin approval)
    await db.update(usersTable)
      .set({ balance: (balance - withdrawAmt).toString() })
      .where(eq(usersTable.id, userId));

    // Create pending withdrawal transaction
    const paymentDetails = [
      accountNo && `Acc: ${accountNo}`,
      ifsc && `IFSC: ${ifsc}`,
      phone && `Phone: ${phone}`,
      accountName && `Name: ${accountName}`,
      notes && `Note: ${notes}`,
    ]
      .filter(Boolean).join(" | ");

    const [tx] = await db.insert(transactionsTable).values({
      userId,
      type: "withdrawal",
      amount: withdrawAmt.toString(),
      status: "pending",
      paymentMethod: "BANK",
      notes: paymentDetails || null,
    }).returning();

    res.json({ id: tx.id, amount: withdrawAmt, status: "pending", message: "Withdrawal request submitted. Will be processed within 24 hours." });
  } catch (err) {
    req.log.error({ err }, "Withdraw error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/transactions/clear — user clears their own transaction history
// Keeps pending/processing txns so active withdrawals aren't lost
router.delete("/transactions/clear", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;

    // Find IDs of active (pending/processing) transactions to keep
    const active = await db
      .select({ id: transactionsTable.id })
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.userId, userId),
        notInArray(transactionsTable.status, ["approved", "rejected", "cancelled"]),
      ));

    const keepIds = active.map(r => r.id);

    if (keepIds.length > 0) {
      await db.delete(transactionsTable).where(and(
        eq(transactionsTable.userId, userId),
        notInArray(transactionsTable.id, keepIds),
      ));
    } else {
      await db.delete(transactionsTable).where(eq(transactionsTable.userId, userId));
    }

    res.json({ success: true, kept: keepIds.length });
  } catch (err) {
    req.log.error({ err }, "Clear transactions error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/transactions", requireAuth, async (req, res) => {
  try {
    const results = await db
      .select({
        transaction: transactionsTable,
        user: usersTable,
      })
      .from(transactionsTable)
      .leftJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
      .where(eq(transactionsTable.userId, req.user!.userId))
      .orderBy(desc(transactionsTable.createdAt));

    res.json(results.map(({ transaction, user }) => ({
      id: transaction.id,
      userId: transaction.userId,
      userName: user?.name || "",
      type: transaction.type,
      amount: parseFloat(transaction.amount),
      status: transaction.status,
      paymentMethod: transaction.paymentMethod,
      notes: transaction.notes,
      createdAt: transaction.createdAt,
    })));
  } catch (err) {
    req.log.error({ err }, "Get transactions error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
