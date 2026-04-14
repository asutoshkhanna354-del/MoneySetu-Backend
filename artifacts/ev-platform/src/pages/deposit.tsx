import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2, ShieldCheck, X, CheckCircle2, Send, ExternalLink } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { apiFetch } from "@/lib/apiFetch";

const depositSchema = z.object({
  amount: z.coerce.number().min(1, "Minimum deposit is ₹1").max(10000, "Maximum ₹10,000 per transaction"),
});
type DepositForm = z.infer<typeof depositSchema>;

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000];
const TIMER_SEC = 300; // 5 minutes
const POLL_MS   = 2000;

// ── Brand configs ──────────────────────────────────────────────────────────────
type Brand = {
  name: string;
  accent: string;
  logo: React.ReactNode;
  pillStyle: React.CSSProperties;
};

const BRANDS: Record<string, Brand> = {
  gpay: {
    name: "Google Pay",
    accent: "#4285F4",
    logo: (
      <svg width="32" height="32" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    pillStyle: { background: "#000000", color: "#ffffff" },
  },
  phonepe: {
    name: "PhonePe",
    accent: "#5f259f",
    logo: <img src="/logos/phonepe.svg" alt="PhonePe" style={{ width: 32, height: 32 }} />,
    pillStyle: { background: "#f5f3ff", color: "#5f259f" },
  },
  paytm: {
    name: "Paytm",
    accent: "#00BAF2",
    logo: <img src="/logos/paytm_logo.png" alt="Paytm" style={{ height: 26, width: "auto", objectFit: "contain" }} />,
    pillStyle: { background: "#ffffff", color: "#00BAF2" },
  },
  upi: {
    name: "Any UPI App",
    accent: "#097939",
    logo: <img src="/logos/upi.svg" alt="UPI" style={{ height: 28, width: "auto" }} />,
    pillStyle: { background: "#ffffff", color: "#111111" },
  },
  netbanking: {
    name: "Net Banking",
    accent: "#2563eb",
    logo: (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#1e3a5f,#2563eb)" }}>
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path d="M4 20h40v4H4z" fill="white" opacity="0.5"/>
          <rect x="6" y="24" width="36" height="16" rx="2" fill="white" opacity="0.9"/>
          <rect x="10" y="28" width="8" height="5" rx="1" fill="#2563eb"/>
          <rect x="20" y="28" width="8" height="5" rx="1" fill="#2563eb"/>
          <rect x="30" y="28" width="8" height="5" rx="1" fill="#2563eb"/>
          <path d="M24 8l20 12H4z" fill="white"/>
        </svg>
      </div>
    ),
    pillStyle: { background: "linear-gradient(135deg,#1e3a8a,#2563eb)", color: "#ffffff" },
  },
};

// ── Waiting Modal (popup opened, we wait for Pay0 confirmation) ────────────────
function WaitingModal({
  brand,
  paymentUrl,
  orderId,
  amount,
  onClose,
  onSuccess,
}: {
  brand: Brand;
  paymentUrl: string;
  orderId: string;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [secondsLeft, setSecondsLeft]     = useState(TIMER_SEC);
  const [paid, setPaid]                   = useState(false);
  const [expired, setExpired]             = useState(false);
  const [utrInput, setUtrInput]           = useState("");
  const [utrSubmitting, setUtrSubmitting] = useState(false);
  const [utrSubmitted, setUtrSubmitted]   = useState(false);
  const [dot, setDot]                     = useState(0);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const dotRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const popupRef  = useRef<Window | null>(null);
  const token     = localStorage.getItem("ev_token");

  const stopAll = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current)  clearInterval(pollRef.current);
    if (dotRef.current)   clearInterval(dotRef.current);
    popupRef.current?.close();
  };

  const openPopup = () => {
    popupRef.current?.close();
    popupRef.current = window.open(
      paymentUrl,
      "pay0_payment",
      "width=500,height=720,left=200,top=80,resizable=yes,scrollbars=yes"
    );
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
        setTimeout(onSuccess, 1800);
      } else if (data.status === "rejected") {
        stopAll();
        onClose();
      }
    } catch { /* retry next cycle */ }
  }, [orderId, token, onSuccess, onClose]);

  useEffect(() => {
    // Open the Pay0 payment popup immediately
    openPopup();

    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { stopAll(); setExpired(true); return 0; }
        return s - 1;
      });
    }, 1000);

    pollRef.current = setInterval(checkStatus, POLL_MS);
    dotRef.current  = setInterval(() => setDot(d => (d + 1) % 4), 500);
    checkStatus();
    return stopAll;
  }, [checkStatus]);

  const submitUtr = async () => {
    const utr = utrInput.trim();
    if (utr.length < 6) return;
    setUtrSubmitting(true);
    try {
      const res = await apiFetch("/api/pay0/submit-utr", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ orderId, utr }),
      });
      const data = await res.json();
      if (res.ok && data.success) setUtrSubmitted(true);
      else alert(data.error || "Could not submit. Please try again.");
    } catch { alert("Network error. Please try again."); }
    finally { setUtrSubmitting(false); }
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const dots = ".".repeat(dot + 1).padEnd(4, "\u00A0");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}>

      <div className="w-full max-w-sm mx-auto px-4 pt-10 pb-10 flex flex-col gap-5">

        {/* Close */}
        <div className="flex justify-end">
          <button onClick={() => { stopAll(); onClose(); }}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.85)" }}>
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Card */}
        <div className="rounded-3xl overflow-hidden" style={{ background: "#111827" }}>

          {/* Brand strip */}
          <div className="p-5 flex items-center gap-4"
            style={{ background: `linear-gradient(135deg, ${brand.accent}22, ${brand.accent}08)`, borderBottom: `1px solid ${brand.accent}30` }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${brand.accent}20` }}>
              {brand.logo}
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Paying via</p>
              <p className="text-lg font-black text-white">{brand.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Amount</p>
              <p className="text-xl font-black text-white">₹{amount.toLocaleString("en-IN")}</p>
            </div>
          </div>

          {/* States */}
          {paid ? (
            <div className="flex flex-col items-center gap-4 py-12 px-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)" }}>
                <CheckCircle2 className="w-10 h-10" style={{ color: "#22c55e" }} />
              </div>
              <p className="text-xl font-black text-white">Payment Confirmed!</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>Crediting your wallet…</p>
            </div>

          ) : expired ? (
            <div className="p-5 flex flex-col gap-4">
              <p className="text-center font-black" style={{ color: "#f59e0b" }}>Session Expired</p>

              {utrSubmitted ? (
                <div className="rounded-2xl p-4 flex flex-col items-center gap-3"
                  style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color: "#22c55e" }} />
                  <p className="font-black text-white text-sm text-center">UTR Submitted!</p>
                  <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Admin will verify and credit within 30 minutes.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl p-4 flex flex-col gap-3"
                    style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                    <p className="text-sm font-black" style={{ color: "#c4b5fd" }}>✅ Already paid?</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                      Enter your UPI Transaction ID (UTR/Ref No.) from your payment app.
                    </p>
                    <input
                      type="text" value={utrInput} onChange={e => setUtrInput(e.target.value)}
                      placeholder="e.g. 504316819123"
                      className="w-full rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(139,92,246,0.3)", color: "white" }}
                    />
                    <button onClick={submitUtr} disabled={utrSubmitting || utrInput.trim().length < 6}
                      className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg,#6d28d9,#a855f7)", color: "white" }}>
                      {utrSubmitting
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                        : <><Send className="w-4 h-4" /> Submit UTR for Verification</>}
                    </button>
                  </div>

                  <div className="rounded-xl p-3" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <p className="text-xs font-bold mb-1" style={{ color: "#f87171" }}>✕ Didn't pay?</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      No money was deducted. This request cancels automatically.
                    </p>
                  </div>
                </>
              )}

              <button onClick={() => { stopAll(); onClose(); }}
                className="text-xs text-center mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                Close
              </button>
            </div>

          ) : (
            <div className="p-6 flex flex-col items-center gap-5">
              {/* Pulsing payment icon */}
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: `${brand.accent}15`, border: `2px solid ${brand.accent}40` }}>
                  <div className="w-8 h-8 flex items-center justify-center">
                    {brand.logo}
                  </div>
                </div>
                {/* Ripple rings */}
                <div className="absolute w-28 h-28 rounded-full animate-ping"
                  style={{ background: `${brand.accent}12`, animationDuration: "1.5s" }} />
                <div className="absolute w-36 h-36 rounded-full animate-ping"
                  style={{ background: `${brand.accent}07`, animationDuration: "2s", animationDelay: "0.5s" }} />
              </div>

              <div className="text-center">
                <p className="text-base font-black text-white">Payment Window Open</p>
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Complete your payment in the {brand.name} window{dots}
                </p>
              </div>

              {/* Timer */}
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Session expires in</p>
                <p className="text-2xl font-black tabular-nums"
                  style={{ color: secondsLeft < 60 ? "#ef4444" : secondsLeft < 120 ? "#f59e0b" : "#a855f7" }}>
                  {mm}:{ss}
                </p>
              </div>

              {/* Status pill */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: brand.accent }} />
                <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Waiting for payment confirmation
                </span>
              </div>

              {/* Reopen button */}
              <button onClick={openPopup}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: brand.accent, color: "white", boxShadow: `0 4px 20px ${brand.accent}45` }}>
                <ExternalLink className="w-4 h-4" />
                Reopen {brand.name} Window
              </button>

              <button onClick={() => { stopAll(); onClose(); }}
                className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                Cancel payment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Branded pill button ─────────────────────────────────────────────────────────
function MethodCard({ brandKey, brand, loading, disabled, onClick }: {
  brandKey: string; brand: Brand; loading: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full flex items-center justify-center gap-3 rounded-2xl transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ ...brand.pillStyle, height: 64, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: brand.pillStyle.color as string }} />
      ) : (
        <>
          <span className="flex items-center justify-center">{brand.logo}</span>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: 0.2, color: brand.pillStyle.color as string }}>
            {brand.name}
          </span>
        </>
      )}
    </button>
  );
}

// ── Main Deposit Page ───────────────────────────────────────────────────────────
export default function Deposit() {
  const { isDark } = useTheme();
  const { toast }  = useToast();
  const [, setLocation] = useLocation();
  const [loadingMethod, setLoadingMethod] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    brandKey: string;
    paymentUrl: string;
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
      toast({ title: "Payment Submitted ✓", description: "Your balance will be credited once confirmed." });
      setLocation("/transactions");
    }
  }, []);

  const handlePay = async (brandKey: string) => {
    const valid = await form.trigger("amount");
    if (!valid) return;
    const amt = form.getValues("amount");
    setLoadingMethod(brandKey);
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
      // Open Pay0 payment page in popup + show waiting modal
      setModal({ brandKey, paymentUrl: data.payment_url, orderId: data.order_id, amount: amt });
    } catch {
      toast({ title: "Network Error", description: "Please check your connection and try again.", variant: "destructive" });
    } finally {
      setLoadingMethod(null);
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
        <WaitingModal
          brand={BRANDS[modal.brandKey] || BRANDS.upi}
          paymentUrl={modal.paymentUrl}
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
              type="number" inputMode="numeric" placeholder="0"
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

        {/* Payment method buttons */}
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-widest px-1" style={{ color: "var(--theme-t3)" }}>
            Choose Payment Method
          </p>
          {Object.entries(BRANDS).map(([key, brand]) => (
            <MethodCard key={key} brandKey={key} brand={brand}
              loading={loadingMethod === key}
              disabled={loadingMethod !== null}
              onClick={() => handlePay(key)} />
          ))}
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 pt-1">
          {[{ icon: "🔒", label: "SSL Secured" }, { icon: "⚡", label: "Instant Credit" }, { icon: "🛡️", label: "UPI Verified" }].map(b => (
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
