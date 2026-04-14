import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2, ShieldCheck, X, CheckCircle2, Smartphone } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { apiFetch } from "@/lib/apiFetch";
import { QRCodeSVG } from "qrcode.react";

const depositSchema = z.object({
  amount: z.coerce.number().min(1, "Minimum deposit is ₹1").max(10000, "Maximum ₹10,000 per transaction"),
});
type DepositForm = z.infer<typeof depositSchema>;

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000];
const QR_TIMEOUT_SEC = 900;   // 15 minutes
const POLL_MS        = 2000;  // poll every 2 seconds

// ── Payment Modal ─────────────────────────────────────────────────────────────
// Shows Pay0's UPI QR inside the app.
// All payment logic is on the backend (Pay0 webhook → instant credit).
// No API keys or secrets ever reach the frontend.
function PaymentModal({
  qrContent,
  upiLink,
  orderId,
  amount,
  onClose,
  onSuccess,
}: {
  qrContent: string;
  upiLink: string | null;
  orderId: string;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(QR_TIMEOUT_SEC);
  const [paid, setPaid]               = useState(false);
  const [expired, setExpired]         = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const token    = localStorage.getItem("ev_token");

  const stopAll = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current)  clearInterval(pollRef.current);
  };

  const checkStatus = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/pay0/order-status/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "approved") {
        stopAll();
        setPaid(true);
        setTimeout(onSuccess, 1600);
      } else if (data.status === "rejected") {
        stopAll();
        onClose();
      }
    } catch { /* retry next cycle */ }
  }, [orderId, token, onSuccess, onClose]);

  useEffect(() => {
    // Countdown
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          stopAll();
          setExpired(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    // Poll for Pay0 webhook approval
    pollRef.current = setInterval(checkStatus, POLL_MS);
    checkStatus(); // immediate first check
    return stopAll;
  }, [checkStatus]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}>

      <div className="relative w-full max-w-sm rounded-3xl flex flex-col items-center gap-5 p-6"
        style={{ background: "#0d1117", border: "1px solid rgba(108,76,241,0.25)", boxShadow: "0 0 60px rgba(108,76,241,0.2)" }}>

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <X className="w-4 h-4" style={{ color: "#f87171" }} />
        </button>

        {/* Header */}
        <div className="text-center pt-2">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#6C4CF1,#8E44AD)" }}>
              <span style={{ color: "white", fontSize: 12, fontWeight: 900 }}>M</span>
            </div>
            <span style={{ color: "white", fontWeight: 800, fontSize: 15 }}>MoneySetu</span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>Secure UPI Payment</p>
        </div>

        {/* Amount pill */}
        <div className="px-6 py-2 rounded-full"
          style={{ background: "linear-gradient(135deg,rgba(108,76,241,0.2),rgba(142,68,173,0.2))", border: "1px solid rgba(108,76,241,0.35)" }}>
          <span style={{ color: "white", fontWeight: 900, fontSize: 22 }}>
            ₹{amount.toLocaleString("en-IN")}
          </span>
        </div>

        {/* QR / Success / Expired */}
        {paid ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)" }}>
              <CheckCircle2 className="w-10 h-10" style={{ color: "#22c55e" }} />
            </div>
            <p style={{ color: "#22c55e", fontWeight: 800, fontSize: 17 }}>Payment Confirmed!</p>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Balance credited instantly</p>
          </div>

        ) : expired ? (
          <div className="w-full rounded-2xl flex flex-col gap-3 p-4"
            style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <p style={{ color: "#f59e0b", fontWeight: 800, fontSize: 14, textAlign: "center" }}>QR Expired</p>
            <div className="rounded-xl p-3" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <p style={{ color: "#4ade80", fontWeight: 700, fontSize: 11, marginBottom: 3 }}>✓ Already paid?</p>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, lineHeight: 1.5 }}>
                Your balance will be credited automatically once UPI confirms.
              </p>
            </div>
            <div className="rounded-xl p-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}>
              <p style={{ color: "#f87171", fontWeight: 700, fontSize: 11, marginBottom: 3 }}>✕ Didn't pay?</p>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, lineHeight: 1.5 }}>
                No money was deducted. This will cancel automatically.
              </p>
            </div>
            <button onClick={onClose}
              className="w-full py-2.5 rounded-xl font-bold text-sm"
              style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
              Close
            </button>
          </div>

        ) : (
          <>
            {/* QR Code — generated from UPI link returned by backend */}
            <div className="rounded-2xl p-3" style={{ background: "#ffffff" }}>
              <QRCodeSVG
                value={qrContent}
                size={210}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
                marginSize={1}
              />
            </div>

            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center" }}>
              Scan with <span style={{ color: "white", fontWeight: 700 }}>Google Pay, PhonePe, Paytm</span> or any UPI app
            </p>

            {/* Mobile: Open in UPI App button */}
            {upiLink && (
              <a href={upiLink}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 transition-all active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#6C4CF1,#8E44AD)", textDecoration: "none" }}>
                <Smartphone className="w-4 h-4" style={{ color: "white" }} />
                <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>Open in UPI App</span>
              </a>
            )}

            {/* Countdown */}
            <div className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#6C4CF1" }} />
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
                Waiting for payment · expires in{" "}
                <span style={{ color: secondsLeft < 60 ? "#ef4444" : "#f59e0b", fontWeight: 700 }}>
                  {mm}:{ss}
                </span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Deposit Page ─────────────────────────────────────────────────────────
export default function Deposit() {
  const { isDark } = useTheme();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{
    qrContent: string;
    upiLink: string | null;
    orderId: string;
    amount: number;
  } | null>(null);

  const form = useForm<DepositForm>({
    resolver: zodResolver(depositSchema),
    defaultValues: { amount: 500 },
  });

  // Handle Pay0 redirect-back (pay0=success in URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("pay0") === "success") {
      window.history.replaceState({}, "", "/deposit");
      toast({
        title: "Payment Submitted ✓",
        description: "Your balance will be credited once UPI confirms. Check your wallet shortly.",
      });
      setLocation("/transactions");
    }
  }, []);

  const handlePay = async () => {
    const valid = await form.trigger("amount");
    if (!valid) return;
    const amt = form.getValues("amount");
    setLoading(true);
    try {
      const token = localStorage.getItem("ev_token");
      const res = await apiFetch("/api/pay0/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ amount: amt }),
      });
      const data = await res.json();
      if (!res.ok || !data.payment_url) {
        toast({ title: "Try Again", description: data.error || "Could not create payment. Please retry.", variant: "destructive" });
        return;
      }
      // Show QR modal — all Pay0 API calls stay on backend
      setModal({
        qrContent: data.qr_content || data.payment_url,
        upiLink:   data.upi_link ?? null,
        orderId:   data.order_id,
        amount:    amt,
      });
    } catch {
      toast({ title: "Network Error", description: "Please check your connection and try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setModal(null);
    toast({ title: "🎉 Payment Successful!", description: "Your wallet balance has been updated." });
    setLocation("/transactions");
  };

  return (
    <AppLayout>
      {modal && (
        <PaymentModal
          qrContent={modal.qrContent}
          upiLink={modal.upiLink}
          orderId={modal.orderId}
          amount={modal.amount}
          onClose={() => setModal(null)}
          onSuccess={handleSuccess}
        />
      )}

      <div className="space-y-5 pb-8 max-w-md mx-auto">

        {/* Header banner */}
        <div className="relative rounded-3xl overflow-hidden p-6"
          style={{
            background: isDark
              ? "linear-gradient(135deg, #0f0c29, #302b63, #24243e)"
              : "linear-gradient(135deg, #ede8ff, #e8dfff, #f0eaff)",
            border: isDark ? "1px solid rgba(139,92,246,0.2)" : "1px solid rgba(109,40,217,0.18)",
          }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 70% 50%, rgba(139,92,246,0.2) 0%, transparent 65%)", pointerEvents: "none" }} />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(139,92,246,0.2)", boxShadow: "0 0 20px rgba(139,92,246,0.3)" }}>
              <ShieldCheck className="w-6 h-6" style={{ color: "#a855f7" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: isDark ? "white" : "#3b0764" }}>Add Money</h1>
              <p className="text-sm" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(109,40,217,0.7)" }}>
                Instant UPI · 100% Secure
              </p>
            </div>
          </div>
        </div>

        {/* Amount input */}
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)" }}>
          <label className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--theme-t3)" }}>
            Enter Amount
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-5 text-3xl font-black" style={{ color: "#a855f7" }}>₹</span>
            <input
              {...form.register("amount")}
              type="number"
              inputMode="numeric"
              placeholder="0"
              className="w-full text-3xl font-black text-center rounded-2xl h-16 focus:outline-none"
              style={{
                background: "rgba(139,92,246,0.07)",
                border: form.formState.errors.amount
                  ? "1.5px solid rgba(239,68,68,0.6)"
                  : "1.5px solid rgba(139,92,246,0.2)",
                paddingLeft: "40px",
                color: "var(--theme-t1)",
              }}
            />
          </div>
          {form.formState.errors.amount && (
            <p className="text-red-400 text-xs text-center">{form.formState.errors.amount.message}</p>
          )}

          {/* Quick amount chips */}
          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.map(amt => (
              <button key={amt} type="button"
                onClick={() => form.setValue("amount", amt, { shouldValidate: true })}
                className="py-2.5 rounded-xl text-xs font-black transition-all hover:scale-105 active:scale-95"
                style={form.watch("amount") === amt
                  ? { background: "linear-gradient(135deg,#6d28d9,#a855f7)", color: "white", boxShadow: "0 0 12px rgba(139,92,246,0.35)" }
                  : { background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)", color: "#c4b5fd" }
                }>
                ₹{amt >= 1000 ? `${amt / 1000}K` : amt}
              </button>
            ))}
          </div>
        </div>

        {/* Pay button */}
        <button
          type="button"
          onClick={handlePay}
          disabled={loading}
          className="w-full rounded-2xl py-4 font-black text-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg,#6C4CF1,#8E44AD)", color: "white", boxShadow: "0 8px 32px rgba(108,76,241,0.4)" }}>
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Creating order...</>
          ) : (
            <>
              <img src="/logos/upi.svg" alt="UPI" style={{ height: 22, width: "auto", filter: "brightness(0) invert(1)" }} />
              Pay via UPI
            </>
          )}
        </button>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 pt-1">
          {[
            { icon: "🔒", label: "SSL Secured" },
            { icon: "⚡", label: "Instant Credit" },
            { icon: "🛡️", label: "UPI Verified" },
          ].map(b => (
            <div key={b.label} className="flex flex-col items-center gap-1">
              <span style={{ fontSize: 18 }}>{b.icon}</span>
              <span style={{ color: "var(--theme-t4)", fontSize: 10, fontWeight: 600 }}>{b.label}</span>
            </div>
          ))}
        </div>

      </div>
    </AppLayout>
  );
}
