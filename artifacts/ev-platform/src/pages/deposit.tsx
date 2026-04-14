import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2, ShieldCheck } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { apiFetch } from "@/lib/apiFetch";

const depositSchema = z.object({
  amount: z.coerce.number().min(1, "Minimum deposit is ₹1").max(10000, "Maximum ₹10,000 per transaction"),
});
type DepositForm = z.infer<typeof depositSchema>;

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000];
const POLL_MS = 2000;

type Brand = {
  name: string;
  logo: React.ReactNode;
  pillStyle: React.CSSProperties;
};

const BRANDS: Record<string, Brand> = {
  gpay: {
    name: "Google Pay",
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
    logo: <img src="/logos/phonepe.svg" alt="PhonePe" style={{ width: 32, height: 32 }} />,
    pillStyle: { background: "#f5f3ff", color: "#5f259f" },
  },
  paytm: {
    name: "Paytm",
    logo: <img src="/logos/paytm_logo.png" alt="Paytm" style={{ height: 26, width: "auto", objectFit: "contain" }} />,
    pillStyle: { background: "#ffffff", color: "#00BAF2" },
  },
  upi: {
    name: "Any UPI App",
    logo: <img src="/logos/upi.svg" alt="UPI" style={{ height: 28, width: "auto" }} />,
    pillStyle: { background: "#ffffff", color: "#111111" },
  },
  netbanking: {
    name: "Net Banking",
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

// ── Full-screen iframe overlay — Pay0 runs entirely inside it ──────────────────
function PaymentIframe({ paymentUrl, orderId, onSuccess }: {
  paymentUrl: string;
  orderId: string;
  onSuccess: () => void;
}) {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const token   = localStorage.getItem("ev_token");

  const checkStatus = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/pay0/order-status/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "approved") {
        if (pollRef.current) clearInterval(pollRef.current);
        onSuccess();
      }
    } catch { /* retry */ }
  }, [orderId, token, onSuccess]);

  useEffect(() => {
    pollRef.current = setInterval(checkStatus, POLL_MS);
    checkStatus();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [checkStatus]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
      <iframe
        src={paymentUrl}
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        allow="payment"
        title="Secure Payment"
      />
    </div>
  );
}

// ── Branded pill button ─────────────────────────────────────────────────────────
function MethodCard({ brand, loading, disabled, onClick }: {
  brand: Brand; loading: boolean; disabled: boolean; onClick: () => void;
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
  const [iframeData, setIframeData] = useState<{ paymentUrl: string; orderId: string } | null>(null);

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
      setIframeData({ paymentUrl: data.payment_url, orderId: data.order_id });
    } catch {
      toast({ title: "Network Error", description: "Please check your connection and try again.", variant: "destructive" });
    } finally {
      setLoadingMethod(null);
    }
  };

  const handleSuccess = () => {
    setIframeData(null);
    toast({ title: "🎉 Payment Successful!", description: "Your wallet balance has been updated." });
    setLocation("/transactions");
  };

  return (
    <AppLayout>
      {iframeData && (
        <PaymentIframe
          paymentUrl={iframeData.paymentUrl}
          orderId={iframeData.orderId}
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
            <MethodCard key={key} brand={brand}
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
