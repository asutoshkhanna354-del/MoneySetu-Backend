import { Router } from "express";
import { db } from "@workspace/db";
import { investmentPlansTable, userInvestmentsTable, usersTable, transactionsTable } from "@workspace/db/schema";
import { eq, and, ne, gte, desc, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/investment-plans", async (_req, res) => {
  try {
    const plans = await db.select().from(investmentPlansTable).where(eq(investmentPlansTable.isActive, true)).orderBy(asc(investmentPlansTable.minAmount));
    res.json(plans.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      minAmount: parseFloat(p.minAmount),
      maxAmount: parseFloat(p.maxAmount),
      dailyReturnPercent: parseFloat(p.dailyReturnPercent),
      durationDays: p.durationDays,
      isActive: p.isActive,
      imageUrl: p.imageUrl,
    })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/investments", requireAuth, async (req, res) => {
  try {
    const investments = await db
      .select({
        investment: userInvestmentsTable,
        plan: investmentPlansTable,
      })
      .from(userInvestmentsTable)
      .leftJoin(investmentPlansTable, eq(userInvestmentsTable.planId, investmentPlansTable.id))
      .where(eq(userInvestmentsTable.userId, req.user!.userId));

    res.json(investments.map(({ investment, plan }) => ({
      id: investment.id,
      planId: investment.planId,
      planName: plan?.name || "Unknown Plan",
      amount: parseFloat(investment.amount),
      dailyReturnPercent: parseFloat(investment.dailyReturnPercent),
      durationDays: investment.durationDays,
      status: investment.status,
      startDate: investment.startDate,
      endDate: investment.endDate,
      totalEarned: parseFloat(investment.totalEarned),
    })));
  } catch (err) {
    req.log.error({ err }, "Get investments error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/investments", requireAuth, async (req, res) => {
  try {
    const { planId, amount } = req.body;
    if (!planId || !amount || amount <= 0) {
      res.status(400).json({ error: "Invalid plan or amount" });
      return;
    }

    const [plan] = await db.select().from(investmentPlansTable).where(
      and(eq(investmentPlansTable.id, planId), eq(investmentPlansTable.isActive, true))
    );
    if (!plan) {
      res.status(400).json({ error: "Investment plan not found or inactive" });
      return;
    }

    const minAmt = parseFloat(plan.minAmount);
    const maxAmt = parseFloat(plan.maxAmount);
    if (amount < minAmt || amount > maxAmt) {
      res.status(400).json({ error: `Amount must be between ₹${minAmt} and ₹${maxAmt}` });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
    if (!user || parseFloat(user.balance) < amount) {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    const [investment] = await db.insert(userInvestmentsTable).values({
      userId: req.user!.userId,
      planId,
      amount: amount.toString(),
      dailyReturnPercent: plan.dailyReturnPercent,
      durationDays: plan.durationDays,
      status: "active",
      startDate,
      endDate,
    }).returning();

    // Deduct from balance and update totalInvested
    await db.update(usersTable).set({
      balance: (parseFloat(user.balance) - amount).toString(),
      totalInvested: (parseFloat(user.totalInvested) + amount).toString(),
    }).where(eq(usersTable.id, req.user!.userId));

    // Record transaction
    await db.insert(transactionsTable).values({
      userId: req.user!.userId,
      type: "investment",
      amount: amount.toString(),
      status: "approved",
      notes: `Invested in ${plan.name}`,
    });

    res.status(201).json({
      id: investment.id,
      planId: investment.planId,
      planName: plan.name,
      amount: parseFloat(investment.amount),
      dailyReturnPercent: parseFloat(investment.dailyReturnPercent),
      durationDays: investment.durationDays,
      status: investment.status,
      startDate: investment.startDate,
      endDate: investment.endDate,
      totalEarned: parseFloat(investment.totalEarned),
    });
  } catch (err) {
    req.log.error({ err }, "Create investment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/investments/:id/partial-withdraw — withdraw up to ₹10K from an active investment; rest keeps earning
router.post("/investments/:id/partial-withdraw", requireAuth, async (req, res) => {
  try {
    const investmentId = parseInt(req.params.id);
    const userId = req.user!.userId;
    const { amount, accountNo, ifsc, phone, accountName } = req.body;

    const withdrawAmt = parseFloat(amount);
    if (!amount || isNaN(withdrawAmt) || withdrawAmt < 10) {
      res.status(400).json({ error: "Minimum partial withdrawal is ₹10" });
      return;
    }
    if (withdrawAmt > 10000) {
      res.status(400).json({ error: "Maximum partial withdrawal is ₹10,000" });
      return;
    }

    // 10-day cooldown across all withdrawals
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
        error: `Withdrawal cooldown active. Next withdrawal available in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}.`,
        daysLeft,
      });
      return;
    }

    // Load the investment
    const [inv] = await db
      .select({ investment: userInvestmentsTable, plan: investmentPlansTable })
      .from(userInvestmentsTable)
      .leftJoin(investmentPlansTable, eq(userInvestmentsTable.planId, investmentPlansTable.id))
      .where(and(eq(userInvestmentsTable.id, investmentId), eq(userInvestmentsTable.userId, userId)));

    if (!inv) { res.status(404).json({ error: "Investment not found" }); return; }
    if (inv.investment.status !== "active") { res.status(400).json({ error: "Investment is not active" }); return; }

    const currentPrincipal = parseFloat(inv.investment.amount);
    if (withdrawAmt > currentPrincipal) {
      res.status(400).json({ error: `Cannot withdraw more than your investment principal of ₹${currentPrincipal.toFixed(2)}` });
      return;
    }

    const remainingPrincipal = currentPrincipal - withdrawAmt;

    // Update investment: reduce principal (or close if fully withdrawn)
    if (remainingPrincipal <= 0) {
      await db.update(userInvestmentsTable)
        .set({ amount: "0", status: "completed" })
        .where(eq(userInvestmentsTable.id, investmentId));
    } else {
      await db.update(userInvestmentsTable)
        .set({ amount: remainingPrincipal.toString() })
        .where(eq(userInvestmentsTable.id, investmentId));
    }

    // Create pending withdrawal transaction (goes to admin for UPI payout)
    const paymentDetails = [
      accountNo && `Acc: ${accountNo}`,
      ifsc && `IFSC: ${ifsc}`,
      phone && `Phone: ${phone}`,
      accountName && `Name: ${accountName}`,
    ]
      .filter(Boolean).join(" | ");

    await db.insert(transactionsTable).values({
      userId,
      type: "withdrawal",
      amount: withdrawAmt.toString(),
      status: "pending",
      paymentMethod: "BANK",
      notes: `Partial withdrawal from ${inv.plan?.name || "Investment"} | ${paymentDetails || "No bank details provided"}`,
    });

    res.json({
      success: true,
      withdrawn: withdrawAmt,
      remainingPrincipal,
      investmentClosed: remainingPrincipal <= 0,
      message: `₹${withdrawAmt.toFixed(2)} withdrawal submitted. Will be processed within 24 hours.`,
    });
  } catch (err) {
    req.log.error({ err }, "Partial withdraw error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/investments/:id/redeem — redeem a matured FD-style investment
router.post("/investments/:id/redeem", requireAuth, async (req, res) => {
  try {
    const investmentId = parseInt(req.params.id);
    const userId = req.user!.userId;

    const [inv] = await db
      .select({ investment: userInvestmentsTable, plan: investmentPlansTable })
      .from(userInvestmentsTable)
      .leftJoin(investmentPlansTable, eq(userInvestmentsTable.planId, investmentPlansTable.id))
      .where(and(eq(userInvestmentsTable.id, investmentId), eq(userInvestmentsTable.userId, userId)));

    if (!inv) {
      res.status(404).json({ error: "Investment not found" });
      return;
    }
    if (inv.investment.status !== "active") {
      res.status(400).json({ error: "Investment already redeemed or not active" });
      return;
    }
    if (new Date() < new Date(inv.investment.endDate)) {
      const daysLeft = Math.ceil((new Date(inv.investment.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      res.status(400).json({ error: `Investment matures in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Cannot redeem early.` });
      return;
    }

    const principal = parseFloat(inv.investment.amount);
    const earned = parseFloat(inv.investment.totalEarned);
    const totalReturn = principal + earned;

    // Mark investment as completed
    await db.update(userInvestmentsTable)
      .set({ status: "completed" })
      .where(eq(userInvestmentsTable.id, investmentId));

    // Credit principal + earnings to user wallet
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (user) {
      await db.update(usersTable)
        .set({ balance: (parseFloat(user.balance) + totalReturn).toString() })
        .where(eq(usersTable.id, userId));
    }

    // Record as withdrawal/earning transaction
    await db.insert(transactionsTable).values({
      userId,
      type: "withdrawal",
      amount: totalReturn.toString(),
      status: "approved",
      notes: `FD Redeemed: ${inv.plan?.name || "Plan"} | Principal ₹${principal.toFixed(2)} + Earnings ₹${earned.toFixed(2)}`,
    });

    res.json({ success: true, principal, earned, totalReturn, message: `₹${totalReturn.toFixed(2)} credited to your wallet.` });
  } catch (err) {
    req.log.error({ err }, "Redeem investment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
