import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, transactionsTable, investmentPlansTable, referralCommissionsTable, fakeActivityTable } from "@workspace/db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth.js";
import { applyReferralCommissions } from "../lib/referrals.js";
import bcrypt from "bcryptjs";

const router = Router();

router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
    res.json(users.map(u => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      isAdmin: u.isAdmin,
      referralCode: u.referralCode,
      createdAt: u.createdAt,
      balance: parseFloat(u.balance),
      totalInvested: parseFloat(u.totalInvested),
      totalEarnings: parseFloat(u.totalEarnings),
    })));
  } catch (err) {
    req.log.error({ err }, "Admin get users error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/users/:userId/balance", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { balance } = req.body;
    if (isNaN(userId) || balance === undefined || balance < 0) {
      res.status(400).json({ error: "Invalid user ID or balance" });
      return;
    }

    const [user] = await db
      .update(usersTable)
      .set({ balance: balance.toString() })
      .where(eq(usersTable.id, userId))
      .returning();

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Log a transaction for balance adjustment
    await db.insert(transactionsTable).values({
      userId,
      type: "deposit",
      amount: Math.abs(balance - parseFloat(user.balance || "0")).toString(),
      status: "approved",
      notes: req.body.note || "Admin balance adjustment",
    }).catch(() => {}); // non-critical

    res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      isAdmin: user.isAdmin,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
      balance: parseFloat(user.balance),
      totalInvested: parseFloat(user.totalInvested),
      totalEarnings: parseFloat(user.totalEarnings),
    });
  } catch (err) {
    req.log.error({ err }, "Admin update balance error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/transactions", requireAdmin, async (req, res) => {
  try {
    const results = await db
      .select({
        transaction: transactionsTable,
        user: usersTable,
      })
      .from(transactionsTable)
      .leftJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
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
    req.log.error({ err }, "Admin get transactions error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Update any user's username + password (admin only) ───────────────────────
router.patch("/admin/users/:userId/credentials", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { username, password } = req.body;
    if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }
    if (!username && !password) { res.status(400).json({ error: "Provide username or password" }); return; }

    const updates: Record<string, string> = {};
    if (username) updates.username = username.trim();
    if (password) updates.passwordHash = await bcrypt.hash(password, 12);

    const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ success: true, id: user.id, username: user.username });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/admin/users/:userId/make-admin", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }
    const [user] = await db
      .update(usersTable)
      .set({ isAdmin: true })
      .where(eq(usersTable.id, userId))
      .returning();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ id: user.id, name: user.name, isAdmin: user.isAdmin });
  } catch (err) {
    req.log.error({ err }, "Admin make-admin error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/transactions/:transactionId/approve", requireAdmin, async (req, res) => {
  try {
    const transactionId = parseInt(req.params.transactionId);
    const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, transactionId));
    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    if (!["pending", "processing"].includes(tx.status)) {
      res.status(400).json({ error: "Transaction cannot be approved (already resolved)" });
      return;
    }

    const adminMessage = req.body.adminMessage?.trim() || "";
    const updatedNotes = adminMessage
      ? `${tx.notes ? tx.notes + " | " : ""}✅ Admin: ${adminMessage}`
      : tx.notes;

    const [updated] = await db
      .update(transactionsTable)
      .set({ status: "approved", notes: updatedNotes, updatedAt: new Date() })
      .where(eq(transactionsTable.id, transactionId))
      .returning();

    // If it's a deposit, add to user balance and apply referral commissions
    if (tx.type === "deposit") {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
      if (user) {
        await db.update(usersTable).set({
          balance: (parseFloat(user.balance) + parseFloat(tx.amount)).toString(),
        }).where(eq(usersTable.id, tx.userId));
        await applyReferralCommissions(tx.userId, parseFloat(tx.amount));
      }
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
    res.json({
      id: updated.id,
      userId: updated.userId,
      userName: user?.name || "",
      type: updated.type,
      amount: parseFloat(updated.amount),
      status: updated.status,
      paymentMethod: updated.paymentMethod,
      notes: updated.notes,
      createdAt: updated.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Admin approve transaction error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/transactions/:transactionId/reject", requireAdmin, async (req, res) => {
  try {
    const transactionId = parseInt(req.params.transactionId);
    const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, transactionId));
    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    if (tx.status !== "pending" && tx.status !== "processing") {
      res.status(400).json({ error: "Transaction is not pending or processing" });
      return;
    }

    const adminMessage = req.body.adminMessage?.trim() || "";
    const updatedNotes = adminMessage
      ? `${tx.notes ? tx.notes + " | " : ""}❌ Admin: ${adminMessage}`
      : tx.notes;

    const [updated] = await db
      .update(transactionsTable)
      .set({ status: "rejected", notes: updatedNotes, updatedAt: new Date() })
      .where(eq(transactionsTable.id, transactionId))
      .returning();

    // If withdrawal is rejected, refund balance back to user
    if (tx.type === "withdrawal") {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
      if (user) {
        await db.update(usersTable).set({
          balance: (parseFloat(user.balance || "0") + parseFloat(tx.amount)).toString(),
        }).where(eq(usersTable.id, tx.userId));
      }
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
    res.json({
      id: updated.id,
      userId: updated.userId,
      userName: user?.name || "",
      type: updated.type,
      amount: parseFloat(updated.amount),
      status: updated.status,
      paymentMethod: updated.paymentMethod,
      notes: updated.notes,
      createdAt: updated.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Admin reject transaction error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/investment-plans", requireAdmin, async (req, res) => {
  try {
    const { name, description, minAmount, maxAmount, dailyReturnPercent, durationDays, isActive, imageUrl } = req.body;
    if (!name || !description || !minAmount || !maxAmount || !dailyReturnPercent || !durationDays) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    const [plan] = await db.insert(investmentPlansTable).values({
      name,
      description,
      minAmount: minAmount.toString(),
      maxAmount: maxAmount.toString(),
      dailyReturnPercent: dailyReturnPercent.toString(),
      durationDays,
      isActive: isActive !== false,
      imageUrl: imageUrl || null,
    }).returning();

    res.status(201).json({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      minAmount: parseFloat(plan.minAmount),
      maxAmount: parseFloat(plan.maxAmount),
      dailyReturnPercent: parseFloat(plan.dailyReturnPercent),
      durationDays: plan.durationDays,
      isActive: plan.isActive,
      imageUrl: plan.imageUrl,
    });
  } catch (err) {
    req.log.error({ err }, "Admin create plan error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/investment-plans/:planId", requireAdmin, async (req, res) => {
  try {
    const planId = parseInt(req.params.planId);
    const { name, description, minAmount, maxAmount, dailyReturnPercent, durationDays, isActive, imageUrl } = req.body;

    const [plan] = await db
      .update(investmentPlansTable)
      .set({
        name,
        description,
        minAmount: minAmount?.toString(),
        maxAmount: maxAmount?.toString(),
        dailyReturnPercent: dailyReturnPercent?.toString(),
        durationDays,
        isActive,
        imageUrl: imageUrl !== undefined ? (imageUrl || null) : undefined,
      })
      .where(eq(investmentPlansTable.id, planId))
      .returning();

    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    res.json({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      minAmount: parseFloat(plan.minAmount),
      maxAmount: parseFloat(plan.maxAmount),
      dailyReturnPercent: parseFloat(plan.dailyReturnPercent),
      durationDays: plan.durationDays,
      isActive: plan.isActive,
      imageUrl: plan.imageUrl,
    });
  } catch (err) {
    req.log.error({ err }, "Admin update plan error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/investment-plans/:planId", requireAdmin, async (req, res) => {
  try {
    const planId = parseInt(req.params.planId);
    await db.update(investmentPlansTable).set({ isActive: false }).where(eq(investmentPlansTable.id, planId));
    res.json({ message: "Plan deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Admin delete plan error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Fake Activity ───────────────────────────────────────────────────────────
router.get("/admin/fake-activity", requireAdmin, async (req, res) => {
  try {
    const items = await db.select().from(fakeActivityTable).orderBy(desc(fakeActivityTable.createdAt));
    res.json(items.map(f => ({ ...f, amount: parseFloat(f.amount) })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/fake-activity", requireAdmin, async (req, res) => {
  try {
    const { userName, type, amount, city } = req.body;
    if (!userName || !type || !amount) {
      res.status(400).json({ error: "userName, type and amount are required" });
      return;
    }
    const [item] = await db.insert(fakeActivityTable).values({
      userName,
      type,
      amount: amount.toString(),
      city: city || null,
      isActive: true,
    }).returning();
    res.status(201).json({ ...item, amount: parseFloat(item.amount) });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/fake-activity/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(fakeActivityTable).where(eq(fakeActivityTable.id, id));
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Seed fake activity with realistic data
router.post("/admin/fake-activity/seed", requireAdmin, async (req, res) => {
  try {
    const names = ["Rahul S", "Priya M", "Arun K", "Sunita D", "Vikram J", "Deepa R", "Nikhil P", "Ananya B", "Rohit G", "Kavya T", "Manish L", "Sneha N"];
    const cities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune", "Kolkata", "Jaipur", "Surat", "Lucknow"];
    const types = ["deposit", "withdrawal", "investment", "earning"];
    const amounts = [500, 1000, 2000, 5000, 10000, 25000, 50000, 100000];
    const items = [];
    for (let i = 0; i < 20; i++) {
      items.push({
        userName: names[Math.floor(Math.random() * names.length)],
        type: types[Math.floor(Math.random() * types.length)],
        amount: amounts[Math.floor(Math.random() * amounts.length)].toString(),
        city: cities[Math.floor(Math.random() * cities.length)],
        isActive: true,
      });
    }
    await db.insert(fakeActivityTable).values(items);
    res.json({ message: `Seeded ${items.length} fake activities` });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Cancel all stuck (pending + processing) transactions
router.post("/admin/transactions/cancel-processing", requireAdmin, async (_req, res) => {
  try {
    const stuck = await db
      .select({ id: transactionsTable.id })
      .from(transactionsTable)
      .where(inArray(transactionsTable.status, ["pending", "processing"]));

    if (stuck.length === 0) {
      return res.json({ message: "No stuck transactions found", count: 0 });
    }

    const ids = stuck.map(t => t.id);
    await db
      .update(transactionsTable)
      .set({ status: "cancelled" })
      .where(inArray(transactionsTable.id, ids));

    res.json({ message: `Cancelled ${ids.length} stuck transaction(s)`, count: ids.length });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

