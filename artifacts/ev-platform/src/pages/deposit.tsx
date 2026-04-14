import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2, ShieldCheck, X, CheckCircle2, Send } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { apiFetch } from "@/lib/apiFetch";
import { QRCodeSVG } from "qrcode.react";

const depositSchema = z.object({
  amount: z.coerce.number().min(1, "Minimum deposit is ₹1").max(10000, "Maximum ₹10,000 per transaction"),
});
type DepositForm = z.infer<typeof depositSchema>;

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000];
const QR_TIMEOUT_SEC = 300;
const POLL_MS = 2000;

// ── Brand configs ──────────────────────────────────────────────────────────────
type Brand = {
  name: string;
  accent: string;
  appScheme: ((params: string) => string) | null;
  logo: React.ReactNode;
  pillStyle: React.CSSProperties;
};

const BRANDS: Record<string, Brand> = {
  gpay: {
    name: "Pay",
    accent: "#4285F4",
    appScheme: (p) => `tez://upi/pay?${p}`,
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
    appScheme: (p) => `phonepe://pay?${p}`,
    logo: <img src="/logos/phonepe.svg" alt="PhonePe" style={{ width: 32, height: 32 }} />,
    pillStyle: { background: "#f5f3ff", color: "#5f259f" },
  },
  paytm: {
    name: "Paytm",
    accent: "#00BAF2",
    appScheme: (p) => `paytmmp://pay?${p}`,
    logo: <img src="/logos/paytm_logo.png" alt="Paytm" style={{ height: 26, width: "auto", objectFit: "contain" }} />,
    pillStyle: { background: "#ffffff", color: "#00BAF2" },
  },
  upi: {
    name: "Any UPI App",
    accent: "#097939",
    appScheme: (p) => `upi://pay?${p}`,
    logo: <img src="/logos/upi.svg" alt="UPI" style={{ height: 28, width: "auto" }} />,
    pillStyle: { background: "#ffffff", color: "#111111" },
  },
  netbanking: {
    name: "Net Banking",
    accent: "#2563eb",
    appScheme: null,
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

// ── Payment QR Modal ────────────────────────────────────────────────────────────
function PaymentQRModal({
  brand,
  brandKey,
  qrContent,
  upiLink,
  orderId,
  amount,
  onClose,
  onSuccess,
}: {
  brand: Brand;
  brandKey: string;
  qrContent: string;
  upiLink: string | null;
  orderId: string;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(QR_TIMEOUT_SEC);
  const [paid, setPaid]                   = useState(false);
  const [expired, setExpired]             = useState(false);
  const [utrInput, setUtrInput]           = useState("");
  const [utrSubmitting, setUtrSubmitting] = useState(false);
  const [utrSubmitted, setUtrSubmitted]   = useState(false);
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
      if (data.status === "approved") { stopAll(); setPaid(true); setTimeout(onSuccess, 1600); }
      else if (data.status === "rejected") { stopAll(); onClose(); }
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

  const appLink = upiLink && brand.appScheme
    ? brand.appScheme(upiLink.replace(/^upi:\/\/[^?]*\?/, ""))
    : upiLink;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto" style={{ background: "#000" }}>
      <button onClick={onClose}
        className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "rgba(239,68,68,0.85)" }}>
        <X className="w-5 h-5 text-white" />
      </button>

      <div className="flex flex-col items-center w-full max-w-sm mx-auto px-5 pt-10 pb-10 gap-5">

        {/* Header */}
        <div className="w-full rounded-2xl p-4 flex items-center gap-3"
          style={{ background: `${brand.accent}15`, border: `1px solid ${brand.accent}35` }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.08)" }}>
            {brand.logo}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>Pay via</p>
            <p className="text-base font-black text-white">{brand.name}</p>
            <p className="text-xs font-semibold" style={{ color: "#4ade80" }}>✓ Secure UPI Payment</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Amount</p>
            <p className="text-lg font-black text-white">₹{amount.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* States */}
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
          <div className="w-full flex flex-col gap-3">
            <p className="font-black text-center text-lg" style={{ color: "#f59e0b" }}>QR Expired</p>

            {utrSubmitted ? (
              <div className="rounded-2xl p-5 flex flex-col items-center gap-3"
                style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
                <CheckCircle2 className="w-10 h-10" style={{ color: "#22c55e" }} />
                <p className="font-black text-white text-center">UTR Submitted!</p>
                <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                  Admin will verify and credit your balance within 30 minutes.
                </p>
                <button onClick={onClose} className="w-full py-2.5 rounded-xl font-bold text-sm mt-1"
                  style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="rounded-2xl p-4 flex flex-col gap-3"
                  style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)" }}>
                  <p className="text-sm font-black" style={{ color: "#c4b5fd" }}>✅ Already paid?</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                    Enter your UPI Transaction ID (UTR) from your payment app. Admin will verify and credit your balance.
                  </p>
                  <input
                    type="text"
                    value={utrInput}
                    onChange={e => setUtrInput(e.target.value)}
                    placeholder="e.g. 504316819123"
                    className="w-full rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(139,92,246,0.3)", color: "white" }}
                  />
                  <button onClick={submitUtr} disabled={utrSubmitting || utrInput.trim().length < 6}
                    className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#6d28d9,#a855f7)", color: "white" }}>
                    {utrSubmitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
                      : <><Send className="w-4 h-4" />Submit UTR for Verification</>}
                  </button>
                </div>

                <div className="rounded-xl p-3" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "#f87171" }}>✕ Didn't pay?</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                    No money was deducted. This request will cancel automatically.
                  </p>
                </div>
                <button onClick={onClose} className="text-xs text-center" style={{ color: "rgba(255,255,255,0.3)" }}>Close</button>
              </>
            )}
          </div>

        ) : (
          <>
            <p className="text-sm font-semibold text-center" style={{ color: "rgba(255,255,255,0.6)" }}>
              {upiLink
                ? `Scan with any UPI app or tap Open in ${brand.name}`
                : "Scan the QR with your phone camera to pay"}
            </p>

            {/* QR */}
            <div className="rounded-3xl p-4 flex items-center justify-center"
              style={{ background: "#fff", boxShadow: `0 0 40px ${brand.accent}55` }}>
              <QRCodeSVG value={qrContent} size={220} bgColor="#ffffff" fgColor="#000000" level="M" marginSize={0} />
            </div>

            {/* Timer */}
            <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>
              Expires in{" "}
              <span style={{ color: secondsLeft < 60 ? "#ef4444" : "#f59e0b", fontWeight: 800 }}>
                {mm}:{ss}
              </span>
            </p>

            {/* Animated dots */}
            <div className="flex gap-1.5">
              {[0,1,2,3,4].map(i => (
                <div key={i} className="rounded-full" style={{
                  width: i === 2 ? 20 : 8, height: 8,
                  background: i === 2 ? brand.accent : "rgba(255,255,255,0.12)",
                  transition: "all 0.3s",
                }} />
              ))}
            </div>

            {/* Open in App (mobile deep link) */}
            {appLink && (
              <a href={appLink} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-3 rounded-2xl py-4 transition-all active:scale-[0.98] hover:opacity-90"
                style={{ background: brand.accent, textDecoration: "none", boxShadow: `0 4px 20px ${brand.accent}50` }}>
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">{brand.logo}</div>
                <span className="font-bold text-white text-base">Open in {brand.name}</span>
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

// ── Branded pill button ─────────────────────────────────────────────────────────
function MethodCard({
  brandKey, brand, loading, disabled, onClick,
}: {
  brandKey: string; brand: Brand; loading: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-3 rounded-2xl transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ ...brand.pillStyle, height: 64, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: (brand.pillStyle.color as string) }} />
      ) : (
        <>
          <span className="flex items-center justify-center">{brand.logo}</span>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: 0.2, color: (brand.pillStyle.color as string) }}>
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
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loadingMethod, setLoadingMethod] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    brandKey: string;
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
      toast({ title: "Payment Submitted ✓", description: "Your balance will be credited once UPI confirms." });
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
      setModal({ brandKey, qrContent: data.qr_content || data.payment_url, upiLink: data.upi_link ?? null, orderId: data.order_id, amount: amt });
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
        <PaymentQRModal
          brand={BRANDS[modal.brandKey] || BRANDS.upi}
          brandKey={modal.brandKey}
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

        {/* Payment method buttons */}
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-widest px-1" style={{ color: "var(--theme-t3)" }}>
            Choose Payment Method
          </p>
          {Object.entries(BRANDS).map(([key, brand]) => (
            <MethodCard
              key={key}
              brandKey={key}
              brand={brand}
              loading={loadingMethod === key}
              disabled={loadingMethod !== null}
              onClick={() => handlePay(key)}
            />
          ))}
        </div>

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
