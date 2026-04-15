import { apiFetch } from "@/lib/apiFetch";
import { useState, useEffect } from "react";
import { X, Info, Send } from "lucide-react";

export function PlatformInfoModal() {
  const [open, setOpen] = useState(() => {
    return sessionStorage.getItem("platform_info_shown") !== "1";
  });
  const [telegramLink, setTelegramLink] = useState("");

  useEffect(() => {
    apiFetch("/api/settings/contact")
      .then(r => r.json())
      .then(d => setTelegramLink(d.telegram || ""))
      .catch(() => {});
  }, []);

  const handleClose = () => {
    sessionStorage.setItem("platform_info_shown", "1");
    setOpen(false);
  };

  if (!open) return null;

  const items = [
    { label: "Platform launch time", value: "6 February - 2026" },
    { label: "Sign-up Bonus", value: "₹5" },
    { label: "Daily Gift Code", value: "₹7 to ₹200 (Need Plan)" },
    { label: "Level 3 agent commission", value: "1st Level: 10% Happy Earning" },
    { label: "Income", value: "Daily Income & Daily Withdrawal" },
    { label: "Min. Withdrawal", value: "₹250 – ₹10,000" },
    { label: "Withdrawals", value: "Unlimited" },
  ];

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center px-5"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)" }}
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-[340px] rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #0e0e20, #150e2c)",
          border: "1px solid rgba(168,85,247,0.28)",
          boxShadow: "0 0 40px rgba(168,85,247,0.2)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Purple top bar */}
        <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg,#7c3aed,#a855f7,#7c3aed)" }} />

        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full"
          style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="px-4 pt-4 pb-4">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.25)" }}>
              <Info className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="font-black text-white text-sm leading-tight">Platform Information</h2>
              <p className="text-[10px]" style={{ color: "rgba(168,85,247,0.65)" }}>Important details for all members</p>
            </div>
          </div>

          {/* Items — inline rows, very compact */}
          <div className="space-y-1.5 mb-3.5">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black"
                  style={{ background: "rgba(168,85,247,0.18)", color: "#a855f7" }}
                >
                  {i + 1}
                </span>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {item.label}:{" "}
                  <span className="font-bold" style={{ color: "#a855f7" }}>{item.value}</span>
                </span>
              </div>
            ))}
          </div>

          {/* Telegram button */}
          <a
            href={telegramLink || undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={!telegramLink ? (e) => e.preventDefault() : undefined}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95"
            style={{
              background: telegramLink ? "linear-gradient(135deg,#0088cc,#29B6F6)" : "rgba(255,255,255,0.05)",
              color: telegramLink ? "white" : "rgba(255,255,255,0.25)",
              boxShadow: telegramLink ? "0 3px 14px rgba(41,182,246,0.3)" : "none",
              cursor: telegramLink ? "pointer" : "not-allowed",
            }}
          >
            <Send className="w-3.5 h-3.5" />
            Telegram Channel
          </a>

          <p className="text-center text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>
            Tap outside to close
          </p>
        </div>
      </div>
    </div>
  );
}
