import { apiFetch } from "@/lib/apiFetch";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import {
  MessageCircle, Phone, HelpCircle, Mail, Search, ChevronRight, Send,
} from "lucide-react";
import { useState, useEffect } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, type: "spring" as const, damping: 22, stiffness: 280 },
  }),
};

export default function Support() {
  const { isDark } = useTheme();
  const [search, setSearch] = useState("");
  const [supportEmail, setSupportEmail] = useState("support@moneysetu.com");
  const [telegramLink, setTelegramLink] = useState("");

  useEffect(() => {
    apiFetch("/api/settings/contact")
      .then(r => r.json())
      .then(d => {
        if (d.supportEmail) setSupportEmail(d.supportEmail);
        if (d.telegram)     setTelegramLink(d.telegram);
      })
      .catch(() => {});
  }, []);

  const cardStyle = {
    background: "var(--theme-card)",
    border: "1px solid var(--theme-border)",
    boxShadow: isDark ? "0 2px 16px rgba(0,0,0,0.22)" : "0 2px 16px rgba(0,0,0,0.05)",
  };

  const supports = [
    {
      icon: MessageCircle,
      title: "Chat with Support",
      desc: "We typically reply in minutes",
      detail: "Available 24/7",
      color: "#6C4CF1",
      bg: "rgba(108,76,241,0.1)",
      available: true,
      href: telegramLink || undefined,
    },
    {
      icon: Phone,
      title: "Call Support",
      desc: "Currently Unavailable in your region",
      detail: "Service suspended",
      color: "#94a3b8",
      bg: "rgba(148,163,184,0.1)",
      available: false,
      href: undefined,
    },
    {
      icon: HelpCircle,
      title: "FAQs",
      desc: "Find answers to common questions",
      detail: "50+ articles",
      color: "#3B82F6",
      bg: "rgba(59,130,246,0.1)",
      available: true,
      href: undefined,
    },
    {
      icon: Mail,
      title: "Raise a Ticket",
      desc: "We'll get back to you via email",
      detail: "Response in 24h",
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.1)",
      available: true,
      href: `mailto:${supportEmail}`,
    },
  ];

  const faqs = [
    { q: "How long do withdrawals take?",          a: "Withdrawal requests are processed within 24 hours on business days." },
    { q: "What is the minimum investment amount?",  a: "The minimum investment depends on the plan — starting from ₹999 for the Silver Plan." },
    { q: "How are daily returns calculated?",       a: "Returns are calculated as a percentage of your invested amount, credited daily to your wallet." },
    { q: "Can I withdraw my principal early?",      a: "Partial withdrawal is available on active plans up to ₹10,000 per request." },
    { q: "How does the referral program work?",     a: "Earn commissions when your friends invest. Multi-level referral rewards are available for deeper networks." },
    { q: "Is my investment secure?",                a: "MoneySetu uses bank-grade security and encryption. All transactions are monitored 24/7." },
  ];

  const filtered = search.trim()
    ? faqs.filter(f =>
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase())
      )
    : faqs;

  return (
    <AppLayout>
      <div className="space-y-6 pb-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
        >
          <h1 className="text-2xl font-black mb-1" style={{ color: "var(--theme-t1)" }}>Help & Support</h1>
          <p className="text-sm" style={{ color: "var(--theme-t3)" }}>
            We're here to help you succeed with your investments
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, type: "spring", damping: 22, stiffness: 280 }}
          className="relative"
        >
          <Search
            className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--theme-t4)" }}
          />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search help topics…"
            className="w-full h-12 pl-11 pr-4 rounded-2xl text-sm outline-none transition-all"
            style={{
              background: "var(--theme-card)",
              border: "1px solid var(--theme-border)",
              color: "var(--theme-t1)",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "rgba(108,76,241,0.45)")}
            onBlur={e => (e.currentTarget.style.borderColor = "var(--theme-border)")}
          />
        </motion.div>

        {/* Quick Help grid */}
        <div>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--theme-t4)" }}
          >
            Quick Help
          </motion.p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {supports.map((item, i) => {
              const Icon = item.icon;
              const isUnavailable = !item.available;
              const Tag = item.href ? "a" : "div";
              const extra = item.href
                ? { href: item.href, target: item.href.startsWith("http") ? "_blank" : undefined, rel: "noopener noreferrer" }
                : {};
              return (
                <motion.div
                  key={item.title}
                  custom={i}
                  initial="hidden"
                  animate="show"
                  variants={fadeUp}
                  whileHover={item.available ? { y: -3, scale: 1.01 } : undefined}
                  whileTap={item.available ? { scale: 0.98 } : undefined}
                  style={{ opacity: isUnavailable ? 0.65 : 1 }}
                >
                  <Tag
                    {...(extra as any)}
                    className="p-4 rounded-2xl flex items-center gap-4 block"
                    style={{ ...cardStyle, cursor: item.available ? "pointer" : "default" }}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: item.bg }}
                    >
                      <Icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm" style={{ color: "var(--theme-t1)" }}>{item.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--theme-t3)" }}>{item.desc}</p>
                      <p
                        className="text-[11px] font-semibold mt-0.5"
                        style={{ color: isUnavailable ? "#94a3b8" : item.color }}
                      >
                        {isUnavailable ? "⚠ Service not available" : item.detail}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--theme-t4)" }} />
                  </Tag>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* FAQs */}
        <div>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--theme-t4)" }}
          >
            Frequently Asked Questions
          </motion.p>

          <div className="space-y-2">
            {filtered.map((faq, i) => (
              <motion.details
                key={i}
                custom={i + 4}
                initial="hidden"
                animate="show"
                variants={fadeUp}
                className="rounded-2xl overflow-hidden group"
                style={cardStyle}
              >
                <summary
                  className="px-5 py-4 flex items-center justify-between cursor-pointer list-none select-none"
                >
                  <span className="font-semibold text-sm pr-4" style={{ color: "var(--theme-t1)" }}>{faq.q}</span>
                  <ChevronRight
                    className="w-4 h-4 flex-shrink-0 transition-transform group-open:rotate-90"
                    style={{ color: "var(--theme-t4)" }}
                  />
                </summary>
                <div className="px-5 pb-4">
                  <div className="h-px mb-3" style={{ background: "var(--theme-border)" }} />
                  <p className="text-sm leading-relaxed" style={{ color: "var(--theme-t3)" }}>{faq.a}</p>
                </div>
              </motion.details>
            ))}

            {filtered.length === 0 && (
              <div className="p-8 text-center rounded-2xl" style={cardStyle}>
                <p className="text-sm" style={{ color: "var(--theme-t3)" }}>
                  No results found for "{search}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, type: "spring", damping: 22, stiffness: 280 }}
          className="p-6 rounded-2xl relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg,#4F35C2,#6C4CF1,#8E44AD)",
            boxShadow: "0 8px 32px rgba(108,76,241,0.35)",
          }}
        >
          <div
            className="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none"
            style={{ background: "rgba(255,255,255,0.08)", filter: "blur(20px)" }}
          />
          <div className="relative z-10">
            <p className="font-black text-lg mb-1" style={{ color: "white" }}>Still need help?</p>
            <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>
              Our support team is available Mon–Sat, 9 AM to 6 PM
            </p>
            <div className="flex gap-3 flex-wrap">
              {/* Email Us — uses admin-set email */}
              <a
                href={`mailto:${supportEmail}`}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.25)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Mail className="w-4 h-4" />
                Email Us
              </a>

              {/* Chat Support — links to telegram if set, otherwise disabled */}
              {telegramLink ? (
                <a
                  href={telegramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                  style={{ background: "white", color: "#6C4CF1" }}
                >
                  <Send className="w-4 h-4" />
                  Chat Support
                </a>
              ) : (
                <button
                  disabled
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold opacity-50 cursor-not-allowed"
                  style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}
                >
                  <Send className="w-4 h-4" />
                  Chat Support
                </button>
              )}
            </div>
          </div>
        </motion.div>

      </div>
    </AppLayout>
  );
}
