import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, usersTable } from "@workspace/db/schema";
import { eq, like, and, lt } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { applyReferralCommissions } from "../lib/referrals.js";

const PAY0_API_KEY = process.env.PAY0_API_KEY || "84b95c685a4576f1a6ac1a07b44d4a0f";
const PAY0_SECRET  = process.env.PAY0_SECRET  || "I4tGlqvPjx395748364";

// The public Render backend URL — used for webhook registration with Pay0
const BACKEND_URL = process.env.BACKEND_URL || "https://moneysetu-backend.onrender.com";
// The public Netlify frontend URL — used for post-payment redirect
const FRONTEND_URL = process.env.FRONTEND_URL || "https://moneysetu.netlify.app";

// Pay0 only returns a web URL. We fetch their payment page once to extract
// the merchant UPI VPA (pa=...) and cache it for all future orders.
let cachedVpa: string | null = null;

async function fetchMerchantVpa(paymentUrl: string): Promise<string | null> {
  if (cachedVpa) return cachedVpa;
  try {
    const res = await fetch(paymentUrl, { signal: AbortSignal.timeout(6000) });
    const html = await res.text();
    const match = html.match(/[?&]pa=([^&"'<>\s]+)/);
    if (match?.[1]) {
      cachedVpa = decodeURIComponent(match[1]);
      console.log("Pay0 merchant VPA cached:", cachedVpa);
      return cachedVpa;
    }
  } catch (e: any) {
    console.warn("Could not fetch Pay0 page for VPA:", e.message);
  }
  return null;
}

const router = Router();

// ── Create Pay0 order (authenticated) ────────────────────────────────────────
router.post("/pay0/create-order", requireAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    const amountNum = parseFloat(amount);

    if (!amountNum || amountNum < 1) {
      res.status(400).json({ error: "Minimum deposit is ₹1" });
      return;
    }

    // Fetch user for name + phone
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Unique order ID
    const orderId = `ms${Date.now()}${req.user!.userId}`;

    // Redirect user back to app after Pay0 payment screen
    const redirectUrl = `${FRONTEND_URL}/deposit?pay0=success&oid=${orderId}`;

    // Webhook URL — Pay0 POSTs payment result here
    const webhookUrl = `${BACKEND_URL}/api/pay0/webhook`;

    // Create transaction as "processing"
    await db.insert(transactionsTable).values({
      userId: req.user!.userId,
      type: "deposit",
      amount: amountNum.toFixed(2),
      status: "processing",
      paymentMethod: "UPI",
      notes: `pay0:${orderId}`,
    });

    // Call Pay0 API — include webhook/notify URL so Pay0 can POST back on success
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
      body: params.toString(),
    });

    const raw = await response.text();
    let data: any = {};
    try { data = JSON.parse(raw); } catch { /* non-JSON */ }

    // Pay0 success: { status: true, result: { orderId, payment_url } }
    if (!data?.status) {
      console.error("Pay0 error response:", raw);
      res.status(502).json({ error: data?.message || "Could not create payment order" });
      return;
    }

    const paymentUrl = data?.result?.payment_url || null;

    if (!paymentUrl) {
      console.error("Pay0 missing payment_url:", raw);
      res.status(502).json({ error: "Could not get payment URL from Pay0" });
      return;
    }

    // Pay0 only returns a web URL. Fetch their payment page to extract the
    // merchant UPI VPA, then build a proper upi:// intent we can use for
    // QR codes and deep links into GPay / PhonePe / Paytm.
    const vpa = await fetchMerchantVpa(paymentUrl);
    const upiLink = vpa
      ? `upi://pay?pa=${encodeURIComponent(vpa)}&pn=MoneySetu&am=${Math.round(amountNum)}&cu=INR&tn=Deposit&tr=${orderId}`
      : null;

    const qrContent = upiLink || paymentUrl;

    console.log(`Pay0 order created: ${orderId} ₹${amountNum} webhook→${webhookUrl}`);
    res.json({ payment_url: paymentUrl, upi_link: upiLink, qr_content: qrContent, order_id: orderId });
  } catch (err: any) {
    console.error("Pay0 create-order error:", err.message);
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

// ── Poll order status (for in-app QR polling) ────────────────────────────────
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

    res.json({ status: tx.status, amount: tx.amount });
  } catch (err: any) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Pay0 webhook ─────────────────────────────────────────────────────────────
// Pay0 sends a form-encoded POST when payment status changes.
// Webhook fields: status, order_id, customer_mobile, amount, remark1, remark2
router.post("/pay0/webhook", async (req, res) => {
  try {
    // Pay0 sends form-encoded body (application/x-www-form-urlencoded)
    const { status, order_id, amount, customer_mobile, remark1, remark2 } = req.body;

    console.log("Pay0 webhook received:", { status, order_id, amount, customer_mobile, remark1, remark2 });

    if (!order_id) {
      res.status(400).send("Missing order_id");
      return;
    }

    // Find transaction by pay0 order tag stored in notes
    const [tx] = await db
      .select()
      .from(transactionsTable)
      .where(like(transactionsTable.notes, `%pay0:${order_id}%`));

    if (!tx) {
      console.warn("Pay0 webhook: no transaction found for order:", order_id);
      res.status(200).send("OK");
      return;
    }

    if (tx.status !== "processing") {
      // Already resolved — idempotent
      res.status(200).send("OK");
      return;
    }

    // Pay0 webhook status field: "SUCCESS" for success, anything else = failed
    const isSuccess = ["SUCCESS", "PAID", "COMPLETED"].includes(String(status || "").toUpperCase());

    if (isSuccess) {
      await db
        .update(transactionsTable)
        .set({
          status: "approved",
          notes: `✅ UPI payment confirmed (Order: ${order_id})`,
          updatedAt: new Date(),
        })
        .where(eq(transactionsTable.id, tx.id));

      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
      if (user) {
        await db.update(usersTable).set({
          balance: (parseFloat(user.balance) + parseFloat(tx.amount)).toFixed(2),
        }).where(eq(usersTable.id, tx.userId));

        await applyReferralCommissions(tx.userId, parseFloat(tx.amount));
      }

      console.log(`✅ Pay0 deposit approved: tx#${tx.id} user#${tx.userId} ₹${tx.amount}`);
    } else {
      await db
        .update(transactionsTable)
        .set({
          status: "rejected",
          notes: `❌ UPI payment failed (Order: ${order_id}, Status: ${status})`,
          updatedAt: new Date(),
        })
        .where(eq(transactionsTable.id, tx.id));

      console.log(`❌ Pay0 deposit rejected: tx#${tx.id} status=${status}`);
    }

    res.status(200).send("OK");
  } catch (err: any) {
    console.error("Pay0 webhook error:", err.message);
    res.status(500).send("Error");
  }
});

export default router;

// ── Pay0 stale-order cleanup cron ─────────────────────────────────────────────
// Runs every 5 minutes. Any "processing" Pay0 deposit older than 20 minutes is
// checked via the Pay0 status API.
// IMPORTANT: if the status API is unreachable we do NOT cancel — we only cancel
// when Pay0 explicitly tells us the order failed/expired, or after a 60-min hard limit.
export async function startPay0StatusChecker() {
  const CHECK_INTERVAL_MS  = 5  * 60 * 1000;   // check every 5 min
  const STALE_AFTER_MS     = 20 * 60 * 1000;   // start checking after 20 min
  const HARD_CANCEL_MS     = 60 * 60 * 1000;   // hard-cancel after 60 min regardless

  async function checkStaleOrders() {
    try {
      const cutoff = new Date(Date.now() - STALE_AFTER_MS);
      const stale = await db
        .select()
        .from(transactionsTable)
        .where(
          and(
            eq(transactionsTable.status, "processing"),
            eq(transactionsTable.type, "deposit"),
            lt(transactionsTable.createdAt, cutoff),
            like(transactionsTable.notes, "pay0:%"),
          )
        );

      for (const tx of stale) {
        const match = (tx.notes || "").match(/pay0:(\S+)/);
        if (!match) continue;
        const orderId = match[1];

        // Hard-cancel: order is older than 60 minutes — credit never arrived
        const ageMs = Date.now() - new Date(tx.createdAt!).getTime();
        if (ageMs > HARD_CANCEL_MS) {
          await db.update(transactionsTable).set({
            status: "rejected",
            notes: `❌ Payment expired (Order: ${orderId})`,
            updatedAt: new Date(),
          }).where(eq(transactionsTable.id, tx.id));
          console.log(`❌ Pay0 cron hard-expired tx#${tx.id} (${orderId}) after 60 min`);
          continue;
        }

        // Try Pay0 check-order-status API
        try {
          const params = new URLSearchParams({
            user_token: PAY0_API_KEY,
            order_id:   orderId,
          });
          const resp = await fetch("https://pay0.shop/api/check-order-status", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
            signal: AbortSignal.timeout(8000),
          });
          const raw = await resp.text();
          let data: any = {};
          try { data = JSON.parse(raw); } catch { /* ignore */ }

          const apiStatus = String(data?.result?.status || data?.status || "").toUpperCase();
          console.log(`Pay0 cron check tx#${tx.id} (${orderId}): apiStatus=${apiStatus}`);

          if (["SUCCESS", "PAID", "COMPLETED"].includes(apiStatus)) {
            // Approve and credit balance
            await db.update(transactionsTable).set({
              status: "approved",
              notes: `✅ UPI payment confirmed via status check (Order: ${orderId})`,
              updatedAt: new Date(),
            }).where(eq(transactionsTable.id, tx.id));

            const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
            if (user) {
              await db.update(usersTable).set({
                balance: (parseFloat(user.balance) + parseFloat(tx.amount)).toFixed(2),
              }).where(eq(usersTable.id, tx.userId));
              await applyReferralCommissions(tx.userId, parseFloat(tx.amount));
            }
            console.log(`✅ Pay0 cron approved tx#${tx.id} ₹${tx.amount}`);

          } else if (apiStatus && !["PENDING", "PROCESSING", "CREATED", ""].includes(apiStatus)) {
            // Pay0 explicitly returned a failure status — cancel it
            await db.update(transactionsTable).set({
              status: "rejected",
              notes: `❌ Payment failed (Order: ${orderId}, Status: ${apiStatus})`,
              updatedAt: new Date(),
            }).where(eq(transactionsTable.id, tx.id));
            console.log(`❌ Pay0 cron rejected tx#${tx.id} status=${apiStatus}`);
          }
          // If PENDING/PROCESSING/CREATED or empty — leave as "processing", check again next cycle

        } catch (e: any) {
          // Pay0 API unreachable (Render cold start, network blip, timeout)
          // DO NOT cancel — leave as "processing" and check again next cycle
          console.warn(`Pay0 cron: status check failed for tx#${tx.id} (${orderId}): ${e.message} — skipping this cycle`);
        }
      }
    } catch (err: any) {
      console.error("Pay0 status cron error:", err.message);
    }
  }

  setInterval(checkStaleOrders, CHECK_INTERVAL_MS);
  console.log("Pay0 stale-order cleanup cron started (checks every 5 min, hard-expires after 60 min)");
}
