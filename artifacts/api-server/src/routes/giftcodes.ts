import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, transactionsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

// ── POST /api/gift-code/redeem ────────────────────────────────────────────────
router.post("/gift-code/redeem", requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "Gift code is required" });
      return;
    }

    const userId = req.user!.userId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    // Fetch the gift code
    const [gc] = await db.execute<{
      id: number; code: string; amount: string;
      is_active: boolean; max_uses: number; uses: number;
      requires_plan: boolean; expires_at: string | null;
    }>(sql`SELECT * FROM gift_codes WHERE LOWER(code) = LOWER(${code.trim()}) LIMIT 1`);

    if (!gc) { res.status(404).json({ error: "Invalid gift code" }); return; }
    if (!gc.is_active) { res.status(400).json({ error: "This gift code is no longer active" }); return; }
    if (gc.expires_at && new Date(gc.expires_at) < new Date()) {
      res.status(400).json({ error: "This gift code has expired" }); return;
    }
    if (gc.uses >= gc.max_uses) {
      res.status(400).json({ error: "This gift code has reached its usage limit" }); return;
    }

    // Check if user already redeemed this code
    const [already] = await db.execute<{ id: number }>(
      sql`SELECT id FROM gift_code_redemptions WHERE code_id = ${gc.id} AND user_id = ${userId} LIMIT 1`
    );
    if (already) { res.status(400).json({ error: "You have already redeemed this gift code" }); return; }

    // Check if user has an active investment plan (if required)
    if (gc.requires_plan) {
      const [activePlan] = await db.execute<{ id: number }>(
        sql`SELECT id FROM user_investments WHERE user_id = ${userId} AND status = 'active' LIMIT 1`
      );
      if (!activePlan) {
        res.status(400).json({ error: "You need an active investment plan to redeem this gift code" }); return;
      }
    }

    const amount = parseFloat(gc.amount);

    // Record redemption + increment uses (atomic)
    await db.execute(sql`
      INSERT INTO gift_code_redemptions (code_id, user_id, amount)
      VALUES (${gc.id}, ${userId}, ${amount})
    `);
    await db.execute(sql`UPDATE gift_codes SET uses = uses + 1 WHERE id = ${gc.id}`);

    // Credit user balance
    await db.execute(sql`
      UPDATE users SET balance = balance + ${amount}, total_earnings = total_earnings + ${amount} WHERE id = ${userId}
    `);

    // Record transaction
    await db.insert(transactionsTable).values({
      userId,
      type: "bonus",
      amount: amount.toString(),
      status: "approved",
      notes: `Gift code: ${gc.code}`,
    });

    res.json({ success: true, amount, message: `₹${amount} credited to your wallet!` });
  } catch (err: any) {
    if (err?.message?.includes("unique") || err?.code === "23505") {
      res.status(400).json({ error: "You have already redeemed this gift code" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/admin/gift-codes ─────────────────────────────────────────────────
router.get("/admin/gift-codes", requireAdmin, async (req, res) => {
  try {
    const codes = await db.execute<{
      id: number; code: string; amount: string; is_active: boolean;
      max_uses: number; uses: number; requires_plan: boolean;
      expires_at: string | null; created_at: string;
    }>(sql`SELECT * FROM gift_codes ORDER BY created_at DESC`);
    res.json(codes.map(c => ({
      id: c.id, code: c.code, amount: parseFloat(c.amount),
      isActive: c.is_active, maxUses: c.max_uses, uses: c.uses,
      requiresPlan: c.requires_plan, expiresAt: c.expires_at, createdAt: c.created_at,
    })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/admin/gift-codes ────────────────────────────────────────────────
router.post("/admin/gift-codes", requireAdmin, async (req, res) => {
  try {
    const { code, amount, maxUses = 100, requiresPlan = true, expiresAt } = req.body;
    if (!code || !amount || amount < 1 || amount > 200) {
      res.status(400).json({ error: "Code and amount (₹1–₹200) are required" }); return;
    }
    const codeUpper = code.trim().toUpperCase();
    await db.execute(sql`
      INSERT INTO gift_codes (code, amount, max_uses, requires_plan, expires_at)
      VALUES (${codeUpper}, ${parseFloat(amount)}, ${maxUses}, ${requiresPlan}, ${expiresAt ?? null})
    `);
    res.json({ success: true, code: codeUpper });
  } catch (err: any) {
    if (err?.code === "23505") { res.status(400).json({ error: "A gift code with that name already exists" }); return; }
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /api/admin/gift-codes/:id/toggle ────────────────────────────────────
router.patch("/admin/gift-codes/:id/toggle", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.execute(sql`UPDATE gift_codes SET is_active = NOT is_active WHERE id = ${id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/admin/gift-codes/:id ─────────────────────────────────────────
router.delete("/admin/gift-codes/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.execute(sql`DELETE FROM gift_code_redemptions WHERE code_id = ${id}`);
    await db.execute(sql`DELETE FROM gift_codes WHERE id = ${id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
