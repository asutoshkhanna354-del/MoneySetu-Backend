import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, transactionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { userInvestmentsTable } from "@workspace/db/schema";

const router = Router();

router.get("/balance", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const activeInvestments = await db.select()
      .from(userInvestmentsTable)
      .where(eq(userInvestmentsTable.userId, req.user!.userId));

    const activeCount = activeInvestments.filter(i => i.status === "active").length;

    res.json({
      balance: parseFloat(user.balance),
      totalInvested: parseFloat(user.totalInvested),
      totalEarnings: parseFloat(user.totalEarnings),
      activeInvestments: activeCount,
    });
  } catch (err) {
    req.log.error({ err }, "Get balance error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/deposit", requireAuth, async (req, res) => {
  try {
    const { amount, paymentMethod, notes } = req.body;
    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }
    if (!paymentMethod) {
      res.status(400).json({ error: "Payment method required" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));

    const [transaction] = await db.insert(transactionsTable).values({
      userId: req.user!.userId,
      type: "deposit",
      amount: amount.toString(),
      status: "pending",
      paymentMethod,
      notes: notes || null,
    }).returning();

    res.json({
      id: transaction.id,
      userId: transaction.userId,
      userName: user?.name || "",
      type: transaction.type,
      amount: parseFloat(transaction.amount),
      status: transaction.status,
      paymentMethod: transaction.paymentMethod,
      notes: transaction.notes,
      createdAt: transaction.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Deposit error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
