import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, usersTable } from "@workspace/db/schema";
import { eq, like, and, lt } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { applyReferralCommissions } from "../lib/referrals.js";

const PAY0_API_KEY = process.env.PAY0_API_KEY || "84b95c685a4576f1a6ac1a07b44d4a0f";
const PAY0_SECRET  = process.env.PAY0_SECRET  || "I4tGlqvPjx395748364";

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

    if (!amountNum || amountNum < 100) {
      res.status(400).json({ error: "Minimum deposit is ₹100" });
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

    // After Pay0 payment, redirect back to app
    const origin = req.headers.origin
      || (req.headers.host ? `${req.protocol}://${req.headers.host}` : "");
    const redirectUrl = `${origin}/deposit?pay0=success&oid=${orderId}`;

    // Create transaction as "processing" — bypasses admin review.
    // Webhook auto-approves (credits balance) or rejects based on Pay0 response.
    await db.insert(transactionsTable).values({
      userId: req.user!.userId,
      type: "deposit",
      amount: amountNum.toFixed(2),
      status: "processing",
      paymentMethod: "UPI",
      notes: `pay0:${orderId}`,
    });

    // Call Pay0 API
    const params = new URLSearchParams({
      customer_mobile: user.phone || "9999999999",
      customer_name:   user.name  || "Customer",
      user_token:      PAY0_API_KEY,
      amount:          Math.round(amountNum).toString(),
      order_id:        orderId,
      redirect_url:    redirectUrl,
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
    const isSuccess = String(status || "").toUpperCase() === "SUCCESS";

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
// Runs every 2 minutes. Any "processing" Pay0 deposit older than 6 minutes is
// checked via the Pay0 status API; if not SUCCESS it gets marked rejected.
export async function startPay0StatusChecker() {
  const CHECK_INTERVAL_MS = 2 * 60 * 1000;   // every 2 min
  const STALE_AFTER_MS    = 6 * 60 * 1000;   // 6 min timeout

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
        const orderId = (tx.notes || "").replace("pay0:", "").trim();
        let resolved = false;

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
          });
          const raw = await resp.text();
          let data: any = {};
          try { data = JSON.parse(raw); } catch { /* ignore */ }

          const apiStatus = String(data?.result?.status || data?.status || "").toUpperCase();

          if (apiStatus === "SUCCESS") {
            // Approve: credit user balance
            await db.update(transactionsTable).set({
              status: "approved",
              notes: `✅ UPI payment confirmed via Pay0 (Order: ${orderId})`,
              updatedAt: new Date(),
            }).where(eq(transactionsTable.id, tx.id));

            const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
            if (user) {
              await db.update(usersTable).set({
                balance: (parseFloat(user.balance) + parseFloat(tx.amount)).toFixed(2),
              }).where(eq(usersTable.id, tx.userId));
              await applyReferralCommissions(tx.userId, parseFloat(tx.amount));
            }
            console.log(`✅ Pay0 cron approved stale tx#${tx.id} ₹${tx.amount}`);
            resolved = true;
          } else if (apiStatus && apiStatus !== "PENDING" && apiStatus !== "PROCESSING") {
            resolved = true; // fall through to reject
          }
        } catch {
          // Pay0 API unreachable — still cancel after timeout
          resolved = true;
        }

        if (resolved) {
          // If not already set to approved above, reject it
          const [current] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, tx.id));
          if (current?.status === "processing") {
            await db.update(transactionsTable).set({
              status: "rejected",
              notes: `❌ Payment cancelled or expired (Order: ${orderId})`,
              updatedAt: new Date(),
            }).where(eq(transactionsTable.id, tx.id));
            console.log(`❌ Pay0 cron cancelled stale tx#${tx.id} (${orderId})`);
          }
        }
      }
    } catch (err: any) {
      console.error("Pay0 status cron error:", err.message);
    }
  }

  // Run periodically
  setInterval(checkStaleOrders, CHECK_INTERVAL_MS);
  console.log("Pay0 stale-order cleanup cron started (runs every 10 min, cancels after 20 min)");
}
