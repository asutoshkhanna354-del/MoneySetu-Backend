import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2, ShieldCheck, X, CheckCircle2, ScanLine } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { apiFetch } from "@/lib/apiFetch";
import { QRCodeSVG } from "qrcode.react";

const depositSchema = z.object({
  amount: z.coerce.number().min(1, "Minimum deposit is ₹1").max(10000, "Maximum ₹10,000 per transaction"),
});
type DepositForm = z.infer<typeof depositSchema>;

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000];
const QR_TIMEOUT_SEC = 300; // 5 minutes
const POLL_MS = 2000;

// ── QR Payment Modal ────────────────────────────────────────────────────────────
function PaymentQRModal({
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
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { stopAll(); setExpired(true); return 0; }
        return s - 1;
      });
    }, 1000);
    pollRef.current = setInterval(checkStatus, POLL_MS);
    checkStatus();
    return stopAll;
  }, [checkStatus]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto" style={{ background: "#000" }}>
      {/* Close button */}
      <button onClick={onClose}
        className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "rgba(239,68,68,0.85)" }}>
        <X className="w-5 h-5 text-white" />
      </button>

      <div className="flex flex-col items-center w-full max-w-sm mx-auto px-5 pt-10 pb-10 gap-5">

        {/* Amount header */}
        <div className="w-full rounded-2xl p-4 flex items-center justify-between"
          style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}>
          <div>
            <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>Paying</p>
            <p className="text-2xl font-black text-white">₹{amount.toLocaleString("en-IN")}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-xs font-semibold" style={{ color: "#4ade80" }}>Secure UPI</p>
          </div>
        </div>

        {/* Main content */}
        {paid ? (
          <div className="flex flex-col items-center gap-4 py-10">
            <div className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)" }}>
              <CheckCircle2 className="w-12 h-12" style={{ color: "#22c55e" }} />
            </div>
            <p className="text-xl font-black text-white">Payment Confirmed!</p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>Balance credited to your wallet</p>
          </div>

        ) : expired ? (
          <div className="w-full rounded-2xl flex flex-col gap-3 p-5"
            style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <p className="font-black text-center" style={{ color: "#f59e0b" }}>QR Expired</p>
            <div className="rounded-xl p-3" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <p className="text-xs font-bold mb-1" style={{ color: "#4ade80" }}>✓ Already paid?</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                Your balance will be credited automatically once UPI confirms.
              </p>
            </div>
            <div className="rounded-xl p-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}>
              <p className="text-xs font-bold mb-1" style={{ color: "#f87171" }}>✕ Didn't pay?</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                No money was deducted. This request will cancel automatically.
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
            {/* Instruction */}
            <div className="w-full rounded-xl px-4 py-3 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>
                📱 On mobile — tap the button below to pay
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                On desktop — scan QR with your phone camera
              </p>
            </div>

            {/* QR Code */}
            <div className="rounded-3xl p-5 flex items-center justify-center"
              style={{ background: "#fff", boxShadow: "0 0 48px rgba(139,92,246,0.45)" }}>
              <QRCodeSVG value={qrContent} size={230} bgColor="#ffffff" fgColor="#000000" level="M" marginSize={0} />
            </div>

            {/* Timer */}
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>Expires in</p>
              <p className="text-2xl font-black tabular-nums" style={{ color: secondsLeft < 60 ? "#ef4444" : "#f59e0b" }}>
                {mm}:{ss}
              </p>
            </div>

            {/* Scanning indicator */}
            <div className="flex items-center gap-2 rounded-xl px-4 py-2.5"
              style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
              <ScanLine className="w-4 h-4 animate-pulse" style={{ color: "#a855f7" }} />
              <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
                Waiting for payment confirmation…
              </span>
            </div>

            {/* Tap to Pay button (mobile) */}
            {upiLink && (
              <a href={upiLink} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 transition-all active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg,#6d28d9,#a855f7)",
                  textDecoration: "none",
                  boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
                }}>
                <span className="font-bold text-white text-base">Tap to Pay</span>
              </a>
            )}

            <button onClick={onClose} className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              Cancel payment
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Deposit Page ───────────────────────────────────────────────────────────
export default function Deposit() {
  const { isDark } = useTheme();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [paying, setPaying] = useState(false);
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("pay0") === "success") {
      window.history.replaceState({}, "", "/deposit");
      toast({
        title: "Payment Submitted ✓",
        description: "Your balance will be credited once UPI confirms.",
      });
      setLocation("/transactions");
    }
  }, []);

  const handlePay = async () => {
    const valid = await form.trigger("amount");
    if (!valid) return;
    const amt = form.getValues("amount");
    setPaying(true);
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
      setModal({
        qrContent: data.qr_content || data.payment_url,
        upiLink:   data.upi_link ?? null,
        orderId:   data.order_id,
        amount:    amt,
      });
    } catch {
      toast({ title: "Network Error", description: "Please check your connection and try again.", variant: "destructive" });
    } finally {
      setPaying(false);
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
        <PaymentQRModal
          qrContent={modal.qrContent}
          upiLink={modal.upiLink}
          orderId={modal.orderId}
          amount={modal.amount}
          onClose={() => setModal(null)}
          onSuccess={handleSuccess}
        />
      )}

      <div className="space-y-5 pb-8 max-w-md mx-auto">

        {/* Header */}
        <div className="relative rounded-3xl overflow-hidden p-6"
          style={{
            background: isDark
              ? "linear-gradient(135deg,#0f0c29,#302b63,#24243e)"
              : "linear-gradient(135deg,#ede8ff,#e8dfff,#f0eaff)",
            border: isDark ? "1px solid rgba(139,92,246,0.2)" : "1px solid rgba(109,40,217,0.18)",
          }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(circle at 70% 50%,rgba(139,92,246,0.2) 0%,transparent 65%)" }} />
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

        {/* Single Pay button */}
        <button
          onClick={handlePay}
          disabled={paying}
          className="w-full h-16 rounded-2xl font-black text-lg text-white flex items-center justify-center gap-3 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg,#6d28d9,#a855f7)",
            boxShadow: "0 4px 24px rgba(139,92,246,0.45)",
          }}>
          {paying ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Generating QR…</>
          ) : (
            <><ScanLine className="w-5 h-5" /> Proceed to Pay</>
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
