import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2, ShieldCheck, Lock, X, CheckCircle2, ChevronRight } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { apiFetch } from "@/lib/apiFetch";
import { QRCodeSVG } from "qrcode.react";

const depositSchema = z.object({
  amount: z.coerce.number().min(100, "Minimum deposit is ₹100").max(10000, "Maximum ₹10,000 per transaction"),
});
type DepositForm = z.infer<typeof depositSchema>;

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000];
const QR_TIMEOUT_SEC = 300;
const POLL_INTERVAL_MS = 4000;

// ── Brand configs ─────────────────────────────────────────────────────────────
type BrandConfig = {
  name: string;
  accent: string;
  headerBg: string;
  headerBorder: string;
  logoEl: React.ReactNode;
};

const GoogleG = () => (
  <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fff" }}>
    <svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  </div>
);

const BRANDS: Record<string, BrandConfig> = {
  gpay: {
    name: "Google Pay",
    accent: "#4285F4",
    headerBg: "rgba(255,255,255,0.06)",
    headerBorder: "1px solid rgba(255,255,255,0.08)",
    logoEl: <GoogleG />,
  },
  phonepe: {
    name: "PhonePe",
    accent: "#5f259f",
    headerBg: "rgba(95,37,159,0.12)",
    headerBorder: "1px solid rgba(95,37,159,0.25)",
    logoEl: (
      <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#f5f3ff" }}>
        <img src="/logos/phonepe.svg" alt="PhonePe" style={{ width: 40, height: 40 }} />
      </div>
    ),
  },
  paytm: {
    name: "Paytm",
    accent: "#00BAF2",
    headerBg: "rgba(0,186,242,0.08)",
    headerBorder: "1px solid rgba(0,186,242,0.2)",
    logoEl: (
      <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fff" }}>
        <img src="/logos/paytm_logo.png" alt="Paytm" style={{ height: 30, width: "auto", objectFit: "contain" }} />
      </div>
    ),
  },
  upi: {
    name: "UPI",
    accent: "#097939",
    headerBg: "rgba(9,121,57,0.08)",
    headerBorder: "1px solid rgba(9,121,57,0.2)",
    logoEl: (
      <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fff" }}>
        <img src="/logos/upi.svg" alt="UPI" style={{ height: 36, width: "auto" }} />
      </div>
    ),
  },
  netbanking: {
    name: "Net Banking",
    accent: "#2563eb",
    headerBg: "rgba(37,99,235,0.1)",
    headerBorder: "1px solid rgba(37,99,235,0.2)",
    logoEl: (
      <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #1e3a5f, #2563eb)" }}>
        <svg width="32" height="32" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 20h40v4H4z" fill="white" opacity="0.5"/>
          <rect x="6" y="24" width="36" height="16" rx="2" fill="white" opacity="0.9"/>
          <rect x="10" y="28" width="8" height="5" rx="1" fill="#2563eb"/>
          <rect x="20" y="28" width="8" height="5" rx="1" fill="#2563eb"/>
          <rect x="30" y="28" width="8" height="5" rx="1" fill="#2563eb"/>
          <path d="M24 8l20 12H4z" fill="white"/>
        </svg>
      </div>
    ),
  },
};

// ── UPI app list for the picker ───────────────────────────────────────────────
const UPI_APPS = [
  {
    id: "gpay",
    name: "Google Pay",
    scheme: (params: string) => `tez://upi/pay?${params}`,
    bg: "#fff",
    logo: (
      <svg width="32" height="32" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: "phonepe",
    name: "PhonePe",
    scheme: (params: string) => `phonepe://pay?${params}`,
    bg: "#f5f3ff",
    logo: <img src="/logos/phonepe.svg" alt="PhonePe" style={{ width: 32, height: 32 }} />,
  },
  {
    id: "paytm",
    name: "Paytm",
    scheme: (params: string) => `paytmmp://pay?${params}`,
    bg: "#fff",
    logo: <img src="/logos/paytm_logo.png" alt="Paytm" style={{ height: 20, width: "auto", objectFit: "contain" }} />,
  },
  {
    id: "bhim",
    name: "BHIM",
    scheme: (params: string) => `bhim://pay?${params}`,
    bg: "#1a56db",
    logo: (
      <svg width="32" height="32" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="32" fill="#1a56db"/>
        <text x="32" y="38" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="sans-serif">BHIM</text>
      </svg>
    ),
  },
  {
    id: "amazonpay",
    name: "Amazon Pay",
    scheme: (params: string) => `upi://pay?${params}`,
    bg: "#FF9900",
    logo: (
      <svg width="32" height="32" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="8" fill="#FF9900"/>
        <text x="32" y="38" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="sans-serif">amazon</text>
      </svg>
    ),
  },
  {
    id: "other",
    name: "Other UPI App",
    scheme: (params: string) => `upi://pay?${params}`,
    bg: "rgba(139,92,246,0.15)",
    logo: (
      <img src="/logos/upi.svg" alt="UPI" style={{ height: 28, width: "auto" }} />
    ),
  },
];

// ── Build deep link from upiLink for a specific app ───────────────────────────
function buildDeepLink(appScheme: (p: string) => string, upiLink: string): string {
  const params = upiLink.replace(/^upi:\/\/[^?]*\?/, "");
  return appScheme(params);
}

// ── UPI App Picker Sheet ──────────────────────────────────────────────────────
function UPIAppPicker({
  upiLink,
  paymentUrl,
  onClose,
}: {
  upiLink: string | null;
  paymentUrl: string;
  onClose: () => void;
}) {
  const getLinkForApp = (app: typeof UPI_APPS[number]) => {
    if (upiLink) return buildDeepLink(app.scheme, upiLink);
    return paymentUrl;
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}>
      <div className="rounded-t-3xl p-6 space-y-4" style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-base font-black text-white">Choose UPI App</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--theme-card2)" }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-xs" style={{ color: "var(--theme-t3)" }}>
          Tap your app — it will open with the payment ready to confirm
        </p>
        <div className="space-y-2">
          {UPI_APPS.map(app => (
            <a key={app.id}
              href={getLinkForApp(app)}
              className="flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all active:scale-[0.98]"
              style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)", textDecoration: "none" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: app.bg }}>
                {app.logo}
              </div>
              <span className="text-white font-semibold text-sm flex-1">{app.name}</span>
              <ChevronRight className="w-4 h-4" style={{ color: "var(--theme-t4)" }} />
            </a>
          ))}
        </div>
        <p className="text-[10px] text-center pb-1" style={{ color: "var(--theme-t4)" }}>
          Or scan the QR above with any UPI app's camera
        </p>
      </div>
    </div>
  );
}

// ── Reusable QR Payment Modal ─────────────────────────────────────────────────
function PaymentQRModal({
  brand,
  methodId,
  paymentUrl,
  upiLink,
  qrContent,
  orderId,
  amount,
  onClose,
  onSuccess,
}: {
  brand: BrandConfig;
  methodId: string;
  paymentUrl: string;
  upiLink: string | null;
  qrContent: string;
  orderId: string;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(QR_TIMEOUT_SEC);
  const [paid, setPaid] = useState(false);
  const [showUpiPicker, setShowUpiPicker] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const token = localStorage.getItem("ev_token");

  const checkStatus = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/pay0/order-status/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "approved") {
        setPaid(true);
        if (pollRef.current) clearInterval(pollRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeout(onSuccess, 1800);
      } else if (data.status === "rejected") {
        if (pollRef.current) clearInterval(pollRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
        onClose();
      }
    } catch { }
  }, [orderId, token, onSuccess, onClose]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          if (pollRef.current) clearInterval(pollRef.current!);
          clearInterval(intervalRef.current!);
          onClose();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    pollRef.current = setInterval(checkStatus, POLL_INTERVAL_MS);
    checkStatus();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [checkStatus]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  // Per-method app deep link — use UPI intent if available, else fall back to payment page
  const getAppLink = () => {
    if (upiLink) {
      const params = upiLink.replace(/^upi:\/\/[^?]*\?/, "");
      if (methodId === "gpay")    return `tez://upi/pay?${params}`;
      if (methodId === "phonepe") return `phonepe://pay?${params}`;
      if (methodId === "paytm")   return `paytmmp://pay?${params}`;
    }
    return paymentUrl;
  };
  const appLink = getAppLink();

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#000", overflowY: "auto" }}>
      {/* UPI App Picker overlay */}
      {showUpiPicker && (
        <UPIAppPicker upiLink={upiLink} paymentUrl={paymentUrl} onClose={() => setShowUpiPicker(false)} />
      )}

      {/* Close button */}
      <button onClick={onClose}
        className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "rgba(239,68,68,0.9)" }}>
        <X className="w-5 h-5 text-white" />
      </button>

      <div className="flex flex-col items-center w-full max-w-sm mx-auto px-5 pt-10 pb-8 gap-5">

        {/* Brand header card */}
        <div className="w-full rounded-2xl p-4 flex items-center gap-4"
          style={{ background: brand.headerBg, border: brand.headerBorder }}>
          {brand.logoEl}
          <div>
            <p className="text-xs font-semibold" style={{ color: "var(--theme-t3)" }}>Payment to</p>
            <p className="text-base font-black text-white">MoneySetu</p>
            <p className="text-xs font-semibold" style={{ color: "#4ade80" }}>✓ Verified Business</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs" style={{ color: "var(--theme-t3)" }}>Amount</p>
            <p className="text-lg font-black text-white">₹{amount.toLocaleString("en-IN")}</p>
          </div>
        </div>

        <p className="text-base font-semibold text-white text-center">
          {methodId === "netbanking"
            ? "Scan QR with your banking app"
            : "Scan QR with any UPI app"}
        </p>

        {/* QR / Success */}
        {paid ? (
          <div className="w-full max-w-[260px] rounded-3xl flex flex-col items-center justify-center gap-3 py-12"
            style={{ background: "#fff" }}>
            <CheckCircle2 className="w-20 h-20" style={{ color: "#22c55e" }} />
            <p className="text-black font-black text-lg">Payment Received!</p>
          </div>
        ) : (
          <div className="rounded-3xl p-4 flex items-center justify-center"
            style={{ background: "#fff", boxShadow: `0 0 40px ${brand.accent}33` }}>
            <QRCodeSVG value={qrContent} size={220} bgColor="#ffffff" fgColor="#000000" level="M" marginSize={0} />
          </div>
        )}

        {/* Countdown */}
        {!paid && (
          <p className="text-sm font-semibold" style={{ color: "var(--theme-t2)" }}>
            Expires in{" "}
            <span style={{ color: "#f59e0b", fontWeight: 800 }}>{mm}:{ss}</span>
          </p>
        )}

        {/* Progress dots */}
        {!paid && (
          <div className="flex gap-1.5">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="rounded-full" style={{
                width: i === 3 ? 20 : 8, height: 8,
                background: i === 3 ? brand.accent : "rgba(255,255,255,0.15)",
                transition: "all 0.3s",
              }} />
            ))}
          </div>
        )}

        {/* ── Action buttons per method ── */}

        {/* GPay → branded button, always visible */}
        {!paid && methodId === "gpay" && (
          <a href={appLink}
            className="w-full flex items-center justify-center gap-3 rounded-2xl py-0 transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "#fff", height: "58px", textDecoration: "none", boxShadow: "0 2px 16px rgba(66,133,244,0.18)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span style={{ color: "#3c4043", fontWeight: 600, fontSize: "17px", fontFamily: "'Google Sans','Roboto',Arial,sans-serif" }}>
              Open in Google Pay
            </span>
          </a>
        )}

        {/* PhonePe → branded button, always visible */}
        {!paid && methodId === "phonepe" && (
          <a href={appLink}
            className="w-full flex items-center justify-center gap-3 rounded-2xl transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "#f5f3ff", height: "58px", textDecoration: "none", boxShadow: "0 2px 16px rgba(95,37,159,0.18)" }}>
            <img src="/logos/phonepe.svg" alt="PhonePe" style={{ width: 32, height: 32 }} />
            <span style={{ color: "#5f259f", fontWeight: 700, fontSize: "17px" }}>Open in PhonePe</span>
          </a>
        )}

        {/* Paytm → branded button, always visible */}
        {!paid && methodId === "paytm" && (
          <a href={appLink}
            className="w-full flex items-center justify-center gap-3 rounded-2xl transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "#fff", height: "58px", textDecoration: "none", boxShadow: "0 2px 16px rgba(0,186,242,0.15)", border: "1px solid rgba(0,186,242,0.25)" }}>
            <img src="/logos/paytm_logo.png" alt="Paytm" style={{ height: 26, width: "auto", objectFit: "contain" }} />
            <span style={{ color: "#00BAF2", fontWeight: 700, fontSize: "17px" }}>Open in Paytm</span>
          </a>
        )}

        {/* Any UPI App → always show picker button */}
        {!paid && methodId === "upi" && (
          <button onClick={() => setShowUpiPicker(true)}
            className="w-full flex items-center justify-center gap-3 rounded-2xl transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "#fff", height: "58px", border: "1px solid rgba(9,121,57,0.2)", boxShadow: "0 2px 16px rgba(9,121,57,0.1)" }}>
            <img src="/logos/upi.svg" alt="UPI" style={{ height: 26, width: "auto" }} />
            <span style={{ color: "#097939", fontWeight: 700, fontSize: "17px" }}>Choose UPI App</span>
          </button>
        )}

        {!paid && (
          <button onClick={onClose} className="text-xs" style={{ color: "var(--theme-t4)" }}>
            Cancel payment
          </button>
        )}
      </div>
    </div>
  );
}

// ── Payment buttons ───────────────────────────────────────────────────────────

const GPayButton = ({ onClick, loading, disabled }: { onClick: () => void; loading: boolean; disabled: boolean }) => (
  <button onClick={onClick} disabled={disabled}
    className="w-full flex items-center justify-center gap-2 rounded-2xl transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
    style={{ background: "#000", height: "64px", border: "1px solid var(--theme-borderhi)" }}>
    {loading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : (
      <>
        <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span style={{ color: "white", fontWeight: 500, fontSize: "18px", fontFamily: "'Google Sans','Roboto',Arial,sans-serif", letterSpacing: "0.25px" }}>Pay</span>
      </>
    )}
  </button>
);

const PhonePeButton = ({ onClick, loading, disabled }: { onClick: () => void; loading: boolean; disabled: boolean }) => (
  <button onClick={onClick} disabled={disabled}
    className="w-full flex items-center justify-center gap-3 rounded-2xl transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
    style={{ background: "#f5f3ff", height: "64px" }}>
    {loading ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#5f259f" }} />
      : <><img src="/logos/phonepe.svg" alt="PhonePe" style={{ width: 36, height: 36 }} /><span style={{ color: "#5f259f", fontWeight: 800, fontSize: "18px" }}>PhonePe</span></>}
  </button>
);

const PaytmButton = ({ onClick, loading, disabled }: { onClick: () => void; loading: boolean; disabled: boolean }) => (
  <button onClick={onClick} disabled={disabled}
    className="w-full flex items-center justify-center gap-3 rounded-2xl transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
    style={{ background: "#fff", height: "64px", border: "1px solid rgba(0,186,242,0.3)" }}>
    {loading ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#00BAF2" }} />
      : <img src="/logos/paytm_logo.png" alt="Paytm" style={{ height: 24, width: "auto", objectFit: "contain" }} />}
  </button>
);

const UPIButton = ({ onClick, loading, disabled }: { onClick: () => void; loading: boolean; disabled: boolean }) => (
  <button onClick={onClick} disabled={disabled}
    className="w-full flex items-center justify-center gap-3 rounded-2xl transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
    style={{ background: "white", height: "64px", border: "1px solid rgba(0,0,0,0.08)" }}>
    {loading ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#097939" }} />
      : <><img src="/logos/upi.svg" alt="UPI" style={{ height: 28, width: "auto" }} /><span style={{ color: "#1a1a2e", fontWeight: 800, fontSize: "18px" }}>Any UPI App</span></>}
  </button>
);

const NetBankingButton = ({ onClick, loading, disabled }: { onClick: () => void; loading: boolean; disabled: boolean }) => (
  <button onClick={onClick} disabled={disabled}
    className="w-full flex items-center justify-center gap-3 rounded-2xl transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
    style={{ background: "linear-gradient(135deg, #1e3a5f, #2563eb)", height: "64px" }}>
    {loading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : (
      <>
        <svg width="28" height="28" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 20h40v4H4z" fill="white" opacity="0.3"/>
          <rect x="6" y="24" width="36" height="16" rx="2" fill="white" opacity="0.9"/>
          <rect x="10" y="28" width="8" height="5" rx="1" fill="#2563eb"/>
          <rect x="20" y="28" width="8" height="5" rx="1" fill="#2563eb"/>
          <rect x="30" y="28" width="8" height="5" rx="1" fill="#2563eb"/>
          <path d="M24 8l20 12H4z" fill="white"/>
        </svg>
        <span style={{ color: "white", fontWeight: 800, fontSize: "18px", letterSpacing: "-0.3px" }}>Net Banking</span>
      </>
    )}
  </button>
);

const METHODS: { id: string; Button: React.FC<any> }[] = [
  { id: "gpay",       Button: GPayButton       },
  { id: "phonepe",    Button: PhonePeButton    },
  { id: "paytm",      Button: PaytmButton      },
  { id: "upi",        Button: UPIButton        },
  { id: "netbanking", Button: NetBankingButton },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Deposit() {
  const { isDark } = useTheme();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loadingMethod, setLoadingMethod] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<{
    methodId: string;
    paymentUrl: string;
    upiLink: string | null;
    qrContent: string;
    orderId: string;
    amount: number;
  } | null>(null);

  const form = useForm<DepositForm>({
    resolver: zodResolver(depositSchema),
    defaultValues: { amount: 1000 },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("pay0") === "success") {
      toast({ title: "Payment Successful!", description: "Your deposit is being confirmed." });
      window.history.replaceState({}, "", "/deposit");
      setLocation("/transactions");
    }
  }, []);

  const handlePay = async (methodId: string) => {
    const valid = await form.trigger("amount");
    if (!valid) return;

    const amt = form.getValues("amount");
    setLoadingMethod(methodId);

    try {
      const token = localStorage.getItem("ev_token");
      const res = await apiFetch("/api/pay0/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ amount: amt }),
      });

      const data = await res.json();

      if (!res.ok || !data.payment_url) {
        toast({
          title: "High Traffic — Please Try Again",
          description: "Our payment gateway is experiencing high load. Please wait a moment and try again.",
          variant: "destructive",
        });
        return;
      }

      setActiveModal({
        methodId,
        paymentUrl: data.payment_url,
        upiLink: data.upi_link ?? null,
        qrContent: data.qr_content ?? data.payment_url,
        orderId: data.order_id,
        amount: amt,
      });
    } catch {
      toast({
        title: "High Traffic — Please Try Again",
        description: "Our payment gateway is experiencing high load. Please wait a moment and try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingMethod(null);
    }
  };

  const handleSuccess = () => {
    setActiveModal(null);
    toast({ title: "Payment Successful! 🎉", description: "Your balance has been credited." });
    setLocation("/transactions");
  };

  return (
    <AppLayout>
      {activeModal && (
        <PaymentQRModal
          brand={BRANDS[activeModal.methodId] || BRANDS.upi}
          methodId={activeModal.methodId}
          paymentUrl={activeModal.paymentUrl}
          upiLink={activeModal.upiLink}
          qrContent={activeModal.qrContent}
          orderId={activeModal.orderId}
          amount={activeModal.amount}
          onClose={() => setActiveModal(null)}
          onSuccess={handleSuccess}
        />
      )}

      <div className="space-y-5 pb-8 max-w-md mx-auto">
        {/* Header */}
        <div className="relative rounded-3xl overflow-hidden p-6"
          style={{ background: isDark ? "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" : "linear-gradient(135deg, #ede8ff, #e8dfff, #f0eaff)", border: isDark ? "1px solid rgba(139,92,246,0.2)" : "1px solid rgba(109,40,217,0.18)" }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 70% 50%, rgba(139,92,246,0.2) 0%, transparent 65%)", pointerEvents: "none" }} />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(139,92,246,0.2)", boxShadow: "0 0 20px rgba(139,92,246,0.3)" }}>
              <ShieldCheck className="w-6 h-6" style={{ color: "#a855f7" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Add Money</h1>
              <p className="text-sm" style={{ color: "var(--theme-t3)" }}>100% secure • Instant credit</p>
            </div>
          </div>
        </div>

        {/* Amount */}
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
              placeholder="0"
              className="w-full text-3xl font-black text-white text-center rounded-2xl h-16 focus:outline-none"
              style={{
                background: "rgba(139,92,246,0.07)",
                border: form.formState.errors.amount ? "1.5px solid rgba(239,68,68,0.6)" : "1.5px solid rgba(139,92,246,0.2)",
                paddingLeft: "40px",
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
                  ? { background: "linear-gradient(135deg, #6d28d9, #a855f7)", color: "white", boxShadow: "0 0 12px rgba(139,92,246,0.35)" }
                  : { background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)", color: "#c4b5fd" }
                }>
                ₹{amt >= 1000 ? `${amt / 1000}K` : amt}
              </button>
            ))}
          </div>
        </div>

        {/* Payment methods */}
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest px-1" style={{ color: "var(--theme-t3)" }}>
            Choose Payment Method
          </p>
          {METHODS.map(({ id, Button }) => (
            <Button key={id}
              onClick={() => handlePay(id)}
              loading={loadingMethod === id}
              disabled={loadingMethod !== null}
            />
          ))}
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 pt-2">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3" style={{ color: "var(--theme-t4)" }} />
            <span className="text-xs" style={{ color: "var(--theme-t4)" }}>256-bit encrypted</span>
          </div>
          <div className="w-px h-3" style={{ background: "var(--theme-card3)" }} />
          <span className="text-xs" style={{ color: "var(--theme-t4)" }}>RBI compliant</span>
          <div className="w-px h-3" style={{ background: "var(--theme-card3)" }} />
          <span className="text-xs" style={{ color: "var(--theme-t4)" }}>Instant credit</span>
        </div>
      </div>
    </AppLayout>
  );
}
