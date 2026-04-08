import { useState, useEffect } from "react";
import { X, MessageCircle } from "lucide-react";

const WhatsAppSVG = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
    <path d="M24 4C12.954 4 4 12.954 4 24c0 3.552.925 6.889 2.545 9.779L4 44l10.457-2.509A19.9 19.9 0 0024 44c11.046 0 20-8.954 20-20S35.046 4 24 4z" fill="#25D366"/>
    <path d="M34.57 29.3c-.504-.252-2.98-1.47-3.44-1.638-.462-.168-.797-.252-1.134.252-.336.504-1.302 1.638-1.596 1.974-.294.336-.588.378-1.092.126-.504-.252-2.128-.784-4.054-2.502-1.498-1.337-2.51-2.988-2.804-3.492-.294-.504-.032-.777.221-1.028.228-.226.504-.588.756-.882.252-.294.336-.504.504-.84.168-.336.084-.63-.042-.882-.126-.252-1.134-2.73-1.554-3.738-.41-.982-.826-.85-1.134-.865l-.966-.016a1.853 1.853 0 00-1.344.63c-.462.504-1.764 1.722-1.764 4.2s1.806 4.872 2.058 5.208c.252.336 3.552 5.424 8.604 7.608 1.202.518 2.14.828 2.87 1.06 1.206.382 2.304.328 3.172.199.968-.144 2.98-1.218 3.4-2.394.42-1.176.42-2.184.294-2.394-.126-.168-.462-.294-.966-.546z" fill="white"/>
  </svg>
);

const InstagramSVG = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
    <defs>
      <radialGradient id="ig-grad1" cx="30%" cy="107%" r="150%">
        <stop offset="0%" stopColor="#fdf497"/>
        <stop offset="5%" stopColor="#fdf497"/>
        <stop offset="45%" stopColor="#fd5949"/>
        <stop offset="60%" stopColor="#d6249f"/>
        <stop offset="90%" stopColor="#285AEB"/>
      </radialGradient>
    </defs>
    <rect width="48" height="48" rx="12" fill="url(#ig-grad1)"/>
    <circle cx="24" cy="24" r="8" stroke="white" strokeWidth="2.5" fill="none"/>
    <circle cx="33.5" cy="14.5" r="2" fill="white"/>
    <rect x="7" y="7" width="34" height="34" rx="9" stroke="white" strokeWidth="2.5" fill="none"/>
  </svg>
);

const TelegramSVG = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
    <circle cx="24" cy="24" r="20" fill="#29B6F6"/>
    <path d="M10.5 23.5l7.5 3 2.5 7.5 4-5 7 5 5-21-26 10.5z" fill="white"/>
    <path d="M18 26.5l.8 6.5 2.7-4.5" fill="#B0BEC5"/>
    <path d="M18 26.5l13-9.5" stroke="#B0BEC5" strokeWidth="0.5"/>
  </svg>
);

export function ContactUs() {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState({ whatsapp: "", instagram: "", telegram: "" });

  useEffect(() => {
    fetch("/api/settings/contact")
      .then(r => r.json())
      .then(data => setLinks({ whatsapp: data.whatsapp || "", instagram: data.instagram || "", telegram: data.telegram || "" }))
      .catch(() => {});
  }, []);

  const hasWhatsapp  = links.whatsapp.trim()  !== "";
  const hasInstagram = links.instagram.trim() !== "";
  const hasTelegram  = links.telegram.trim()  !== "";

  return (
    <>
      {/* Floating Contact Us button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 md:bottom-8 md:right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #7B2FBE, #a855f7)",
          color: "white",
          boxShadow: "0 4px 24px rgba(168,85,247,0.45)",
        }}
      >
        <MessageCircle className="w-4 h-4" />
        <span>Contact Us</span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setOpen(false)}
        >
          {/* Modal */}
          <div
            className="relative w-full max-w-sm mx-4 mb-8 md:mb-0 p-6 rounded-3xl"
            style={{
              background: "linear-gradient(145deg, #0f0f1a, #1a1030)",
              border: "1px solid rgba(168,85,247,0.25)",
              boxShadow: "0 0 60px rgba(168,85,247,0.2)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full transition-colors"
              style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.06)" }}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}>
                <MessageCircle className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Contact Us</h3>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {hasWhatsapp || hasInstagram || hasTelegram ? "Reach us on your preferred platform" : "No contact channels available yet"}
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              {/* WhatsApp */}
              <a
                href={hasWhatsapp ? links.whatsapp : undefined}
                target="_blank"
                rel="noopener noreferrer"
                onClick={!hasWhatsapp ? (e) => e.preventDefault() : undefined}
                className={`flex items-center gap-4 w-full px-5 py-4 rounded-2xl transition-all ${
                  hasWhatsapp ? "hover:scale-[1.02] active:scale-[0.98] cursor-pointer" : "cursor-not-allowed opacity-40"
                }`}
                style={{
                  background: hasWhatsapp ? "linear-gradient(135deg, rgba(37,211,102,0.12), rgba(37,211,102,0.06))" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${hasWhatsapp ? "rgba(37,211,102,0.3)" : "rgba(255,255,255,0.07)"}`,
                  boxShadow: hasWhatsapp ? "0 0 20px rgba(37,211,102,0.08)" : "none",
                }}
              >
                <WhatsAppSVG />
                <div className="text-left">
                  <p className="font-semibold text-sm text-white">WhatsApp</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {hasWhatsapp ? "Chat with us" : "Not configured yet"}
                  </p>
                </div>
                {hasWhatsapp && (
                  <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(37,211,102,0.15)", color: "#25D366" }}>Open</span>
                )}
              </a>

              {/* Instagram */}
              <a
                href={hasInstagram ? links.instagram : undefined}
                target="_blank"
                rel="noopener noreferrer"
                onClick={!hasInstagram ? (e) => e.preventDefault() : undefined}
                className={`flex items-center gap-4 w-full px-5 py-4 rounded-2xl transition-all ${
                  hasInstagram ? "hover:scale-[1.02] active:scale-[0.98] cursor-pointer" : "cursor-not-allowed opacity-40"
                }`}
                style={{
                  background: hasInstagram ? "linear-gradient(135deg, rgba(214,36,159,0.12), rgba(253,89,73,0.06))" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${hasInstagram ? "rgba(214,36,159,0.3)" : "rgba(255,255,255,0.07)"}`,
                  boxShadow: hasInstagram ? "0 0 20px rgba(214,36,159,0.08)" : "none",
                }}
              >
                <InstagramSVG />
                <div className="text-left">
                  <p className="font-semibold text-sm text-white">Instagram</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {hasInstagram ? "Follow & DM us" : "Not configured yet"}
                  </p>
                </div>
                {hasInstagram && (
                  <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(214,36,159,0.15)", color: "#d6249f" }}>Open</span>
                )}
              </a>

              {/* Telegram */}
              <a
                href={hasTelegram ? links.telegram : undefined}
                target="_blank"
                rel="noopener noreferrer"
                onClick={!hasTelegram ? (e) => e.preventDefault() : undefined}
                className={`flex items-center gap-4 w-full px-5 py-4 rounded-2xl transition-all ${
                  hasTelegram ? "hover:scale-[1.02] active:scale-[0.98] cursor-pointer" : "cursor-not-allowed opacity-40"
                }`}
                style={{
                  background: hasTelegram ? "linear-gradient(135deg, rgba(41,182,246,0.12), rgba(41,182,246,0.06))" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${hasTelegram ? "rgba(41,182,246,0.3)" : "rgba(255,255,255,0.07)"}`,
                  boxShadow: hasTelegram ? "0 0 20px rgba(41,182,246,0.08)" : "none",
                }}
              >
                <TelegramSVG />
                <div className="text-left">
                  <p className="font-semibold text-sm text-white">Telegram</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {hasTelegram ? "Message us on Telegram" : "Not configured yet"}
                  </p>
                </div>
                {hasTelegram && (
                  <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(41,182,246,0.15)", color: "#29B6F6" }}>Open</span>
                )}
              </a>
            </div>

            {(!hasWhatsapp && !hasInstagram && !hasTelegram) && (
              <p className="mt-4 text-center text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                Admin can enable contact channels in the admin panel.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
