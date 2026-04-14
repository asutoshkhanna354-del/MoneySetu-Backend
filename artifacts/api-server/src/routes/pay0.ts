import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, usersTable } from "@workspace/db/schema";
import { eq, like, and, lt } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { applyReferralCommissions } from "../lib/referrals.js";

const PAY0_API_KEY = process.env.PAY0_API_KEY || "84b95c685a4576f1a6ac1a07b44d4a0f";
const PAY0_SECRET  = process.env.PAY0_SECRET  || "I4tGlqvPjx395748364";
const BACKEND_URL  = process.env.BACKEND_URL  || "https://moneysetu-backend.onrender.com";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://moneysetu.netlify.app";

const router = Router();

// ── Helper: credit a transaction and update user balance ──────────────────────
async function creditTransaction(tx: typeof transactionsTable.$inferSelect, orderId: string) {
  if (tx.status === "approved") return; // already credited, idempotent

  await db.update(transactionsTable).set({
    status: "approved",
    notes: `✅ UPI payment confirmed (Order: ${orderId})`,
    updatedAt: new Date(),
  }).where(eq(transactionsTable.id, tx.id));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
  if (user) {
    await db.update(usersTable).set({
      balance: (parseFloat(user.balance) + parseFloat(tx.amount)).toFixed(2),
    }).where(eq(usersTable.id, tx.userId));
    await applyReferralCommissions(tx.userId, parseFloat(tx.amount));
  }
  console.log(`✅ Pay0 deposit approved: tx#${tx.id} user#${tx.userId} ₹${tx.amount} order:${orderId}`);
}

// ── Helper: check Pay0 API for order status ───────────────────────────────────
async function checkPay0Api(orderId: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ user_token: PAY0_API_KEY, order_id: orderId });
    const resp = await fetch("https://pay0.shop/api/check-order-status", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(8000),
    });
    const raw = await resp.text();
    let data: any = {};
    try { data = JSON.parse(raw); } catch { /* ignore */ }
    return String(data?.result?.status || data?.status || "").toUpperCase() || null;
  } catch {
    return null;
  }
}

// ── Create Pay0 order (authenticated) ────────────────────────────────────────
router.post("/pay0/create-order", requireAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    const amountNum = parseFloat(amount);

    if (!amountNum || amountNum < 1) {
      res.status(400).json({ error: "Minimum deposit is ₹1" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const orderId     = `ms${Date.now()}${req.user!.userId}`;
    const redirectUrl = `${FRONTEND_URL}/deposit?pay0=success&oid=${orderId}`;
    const webhookUrl  = `${BACKEND_URL}/api/pay0/webhook`;

    // Save transaction as "processing" BEFORE calling Pay0
    await db.insert(transactionsTable).values({
      userId:        req.user!.userId,
      type:          "deposit",
      amount:        amountNum.toFixed(2),
      status:        "processing",
      paymentMethod: "UPI",
      notes:         `pay0:${orderId}`,
    });

    const params = new URLSearchParams({
      customer_mobile: user.phone || "9999999999",
      customer_name:   user.name  || "Customer",
      user_token:      PAY0_API_KEY,
      amount:          Math.round(amountNum).toString(),
      order_id:        orderId,
      redirect_url:    redirectUrl,
      webhook_url:     webhookUrl,
      notify_url:      webhookUrl,
      callback_url:    webhookUrl,
      remark1:         "MoneySetu Deposit",
      remark2:         `uid${user.id}`,
    });

    const response = await fetch("https://pay0.shop/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    params.toString(),
      signal:  AbortSignal.timeout(15000),
    });

    const raw = await response.text();
    let data: any = {};
    try { data = JSON.parse(raw); } catch { /* non-JSON */ }

    if (!data?.status) {
      console.error("Pay0 create-order error response:", raw);
      res.status(502).json({ error: data?.message || "Could not create payment order. Please retry." });
      return;
    }

    const paymentUrl = data?.result?.payment_url || null;
    if (!paymentUrl) {
      console.error("Pay0 missing payment_url:", raw);
      res.status(502).json({ error: "Could not get payment URL from Pay0." });
      return;
    }

    // CRITICAL FIX: Use Pay0's own payment URL as the QR content.
    // Do NOT try to extract/cache VPAs — Pay0 uses per-order dynamic VPAs.
    // When user scans this QR → Pay0's page opens → user pays → Pay0 sends webhook.
    // This is the ONLY reliable way to ensure Pay0 can track and confirm the payment.
    console.log(`Pay0 order created: ${orderId} ₹${amountNum} webhook→${webhookUrl}`);
    res.json({
      payment_url: paymentUrl,
      qr_content:  paymentUrl,   // QR encodes Pay0's payment URL
      upi_link:    paymentUrl,   // "Open in App" also uses Pay0's URL
      order_id:    orderId,
    });
  } catch (err: any) {
    console.error("Pay0 create-order error:", err.message);
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

// ── Poll order status (frontend polls every 2s) ───────────────────────────────
// Checks our DB first; if still "processing", actively queries Pay0's API.
// This is the fallback when webhook fails (Render cold start, network blip, etc.)
router.get("/pay0/order-status/:orderId", requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const [tx] = await db
      .select()
      .from(transactionsTable)
      .where(like(transactionsTable.notes, `%pay0:${orderId}%`));

    if (!tx || tx.userId !== req.user!.userId) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    // Already resolved — just return the DB status
    if (tx.status !== "processing") {
      res.json({ status: tx.status, amount: tx.amount });
      return;
    }

    // Still processing — actively query Pay0's API right now (don't wait for webhook)
    const apiStatus = await checkPay0Api(orderId);
    console.log(`Pay0 poll check orderId=${orderId} apiStatus=${apiStatus}`);

    if (apiStatus && ["SUCCESS", "PAID", "COMPLETED"].includes(apiStatus)) {
      await creditTransaction(tx, orderId);
      res.json({ status: "approved", amount: tx.amount });
      return;
    }

    if (apiStatus && !["PENDING", "PROCESSING", "CREATED", "INITIATED", ""].includes(apiStatus)) {
      // Pay0 says explicitly failed
      await db.update(transactionsTable).set({
        status:    "rejected",
        notes:     `❌ Payment failed (Order: ${orderId}, Status: ${apiStatus})`,
        updatedAt: new Date(),
      }).where(eq(transactionsTable.id, tx.id));
      res.json({ status: "rejected", amount: tx.amount });
      return;
    }

    // Still pending at Pay0
    res.json({ status: tx.status, amount: tx.amount });
  } catch (err: any) {
    console.error("pay0/order-status error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Pay0 webhook ─────────────────────────────────────────────────────────────
// Pay0 POSTs form-encoded data when payment status changes.
// Accept ALL incoming requests — no auth check (Pay0 doesn't sign webhooks).
router.post("/pay0/webhook", async (req, res) => {
  // Respond 200 IMMEDIATELY so Pay0 doesn't time out waiting
  res.status(200).send("OK");

  try {
    const { status, order_id, amount, customer_mobile, remark1, remark2 } = req.body;
    console.log("Pay0 webhook received:", JSON.stringify({ status, order_id, amount, customer_mobile }));

    if (!order_id) return;

    const [tx] = await db
      .select()
      .from(transactionsTable)
      .where(like(transactionsTable.notes, `%pay0:${order_id}%`));

    if (!tx) {
      console.warn("Pay0 webhook: no transaction found for order:", order_id);
      return;
    }

    if (tx.status !== "processing") return; // already handled

    const isSuccess = ["SUCCESS", "PAID", "COMPLETED"].includes(String(status || "").toUpperCase());

    if (isSuccess) {
      await creditTransaction(tx, order_id);
    } else {
      await db.update(transactionsTable).set({
        status:    "rejected",
        notes:     `❌ Payment failed (Order: ${order_id}, Status: ${status})`,
        updatedAt: new Date(),
      }).where(eq(transactionsTable.id, tx.id));
      console.log(`❌ Pay0 deposit rejected: tx#${tx.id} status=${status}`);
    }
  } catch (err: any) {
    console.error("Pay0 webhook processing error:", err.message);
  }
});

// ── UTR submission (user proves they paid when gateway fails) ─────────────────
// User submits their UPI Transaction Reference (UTR). We flip the transaction
// status to "pending" so admin can see it, verify, and manually approve.
router.post("/pay0/submit-utr", requireAuth, async (req, res) => {
  try {
    const { orderId, utr } = req.body;
    if (!orderId || !utr || String(utr).trim().length < 6) {
      res.status(400).json({ error: "Please provide a valid UTR number." });
      return;
    }

    const [tx] = await db
      .select()
      .from(transactionsTable)
      .where(like(transactionsTable.notes, `%pay0:${orderId}%`));

    if (!tx || tx.userId !== req.user!.userId) {
      res.status(404).json({ error: "Transaction not found." });
      return;
    }

    if (tx.status === "approved") {
      res.json({ success: true, message: "Your payment is already credited!" });
      return;
    }

    if (tx.status === "rejected") {
      res.status(400).json({ error: "This order was cancelled. Please contact support." });
      return;
    }

    // Move to "pending" so admin can see + approve in their panel
    await db.update(transactionsTable).set({
      status: "pending",
      notes:  `🔁 UTR submitted by user: ${String(utr).trim()} (Order: ${orderId})`,
      updatedAt: new Date(),
    }).where(eq(transactionsTable.id, tx.id));

    console.log(`UTR submitted: tx#${tx.id} user#${tx.userId} ₹${tx.amount} UTR=${utr}`);
    res.json({ success: true, message: "UTR submitted. Admin will verify and credit your balance within 30 minutes." });
  } catch (err: any) {
    console.error("submit-utr error:", err.message);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

export default router;

// ── Pay0 stale-order cleanup cron ─────────────────────────────────────────────
// Runs every 5 min. Orders processing for >15 min are checked via Pay0 API.
// Only hard-cancels after 60 min. Never cancels on API error.
export async function startPay0StatusChecker() {
  const CHECK_INTERVAL_MS = 5  * 60 * 1000;
  const STALE_AFTER_MS    = 15 * 60 * 1000;
  const HARD_CANCEL_MS    = 60 * 60 * 1000;

  async function checkStaleOrders() {
    try {
      const cutoff = new Date(Date.now() - STALE_AFTER_MS);
      const stale = await db
        .select().from(transactionsTable)
        .where(and(
          eq(transactionsTable.status, "processing"),
          eq(transactionsTable.type, "deposit"),
          lt(transactionsTable.createdAt, cutoff),
          like(transactionsTable.notes, "pay0:%"),
        ));

      for (const tx of stale) {
        const match = (tx.notes || "").match(/pay0:(\S+)/);
        if (!match) continue;
        const orderId = match[1];
        const ageMs   = Date.now() - new Date(tx.createdAt!).getTime();

        if (ageMs > HARD_CANCEL_MS) {
          await db.update(transactionsTable).set({
            status:    "rejected",
            notes:     `❌ Payment expired (Order: ${orderId})`,
            updatedAt: new Date(),
          }).where(eq(transactionsTable.id, tx.id));
          console.log(`❌ Pay0 cron hard-expired tx#${tx.id} (${orderId}) after 60 min`);
          continue;
        }

        const apiStatus = await checkPay0Api(orderId);
        console.log(`Pay0 cron check tx#${tx.id} (${orderId}): apiStatus=${apiStatus}`);

        if (!apiStatus) continue; // API unreachable — leave as processing

        if (["SUCCESS", "PAID", "COMPLETED"].includes(apiStatus)) {
          await creditTransaction(tx, orderId);
        } else if (!["PENDING", "PROCESSING", "CREATED", "INITIATED", ""].includes(apiStatus)) {
          await db.update(transactionsTable).set({
            status:    "rejected",
            notes:     `❌ Payment failed (Order: ${orderId}, Status: ${apiStatus})`,
            updatedAt: new Date(),
          }).where(eq(transactionsTable.id, tx.id));
          console.log(`❌ Pay0 cron rejected tx#${tx.id} status=${apiStatus}`);
        }
      }
    } catch (err: any) {
      console.error("Pay0 status cron error:", err.message);
    }
  }

  setInterval(checkStaleOrders, CHECK_INTERVAL_MS);
  console.log("✅ Pay0 stale-order cleanup cron started (checks every 5 min, hard-expires after 60 min)");
}
