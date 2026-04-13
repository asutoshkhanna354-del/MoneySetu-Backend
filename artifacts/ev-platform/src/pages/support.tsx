import { AppLayout } from "@/components/layout/AppLayout";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import {
  MessageCircle, Phone, HelpCircle, Ticket, Search,
  ArrowUpRight, ChevronRight, Mail, Clock,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, type: "spring", damping: 22, stiffness: 280 } }),
};

export default function Support() {
  const { isDark } = useTheme();
  const [search, setSearch] = useState("");

  const cardStyle = {
    background: "var(--theme-card)",
    border: "1px solid var(--theme-border)",
    boxShadow: isDark ? "0 2px 16px rgba(0,0,0,0.25)" : "0 2px 16px rgba(0,0,0,0.06)",
  };

  const supports = [
    {
      icon: MessageCircle,
      title: "Chat with Support",
      desc: "We typically reply in minutes",
      detail: "Available 24/7",
      color: "#6C4CF1",
      bg: "rgba(108,76,241,0.12)",
      action: "Start Chat",
    },
    {
      icon: Phone,
      title: "Call Support",
      desc: "Mon - Sat: 9:00 AM - 6:00 PM",
      detail: "+91 98765 43210",
      color: "#22C55E",
      bg: "rgba(34,197,94,0.12)",
      action: "Call Now",
    },
    {
      icon: HelpCircle,
      title: "FAQs",
      desc: "Find answers to common questions",
      detail: "50+ articles",
      color: "#3B82F6",
      bg: "rgba(59,130,246,0.12)",
      action: "Browse FAQs",
    },
    {
      icon: Mail,
      title: "Raise a Ticket",
      desc: "We'll get back to you via email",
      detail: "Response in 24h",
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.12)",
      action: "Open Ticket",
    },
  ];

  const faqs = [
    { q: "How long do withdrawals take?", a: "Withdrawal requests are processed within 24 hours on business days." },
    { q: "What is the minimum investment amount?", a: "The minimum investment depends on the plan — starting from ₹999 for the Silver Plan." },
    { q: "How are daily returns calculated?", a: "Returns are calculated as a percentage of your invested amount, credited daily." },
    { q: "Can I withdraw my principal early?", a: "Partial withdrawal is available on active plans up to ₹10,000 per request." },
    { q: "How does the referral program work?", a: "Earn commissions when your friends invest. Multi-level referral rewards are available." },
  ];

  const filtered = search
    ? faqs.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()))
    : faqs;

  return (
    <AppLayout>
      <div className="space-y-6 pb-4">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
        >
          <h1 className="text-2xl font-black mb-1" style={{ color: "var(--theme-t1)" }}>Help & Support</h1>
          <p className="text-sm" style={{ color: "var(--theme-t3)" }}>We're here to help you succeed with your investments</p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, type: "spring", damping: 22, stiffness: 280 }}
          className="relative"
        >
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--theme-t4)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search help topics…"
            className="w-full h-12 pl-11 pr-4 rounded-2xl text-sm outline-none transition-all"
            style={{
              background: "var(--theme-card)",
              border: "1px solid var(--theme-border)",
              color: "var(--theme-t1)",
              boxShadow: isDark ? "0 2px 12px rgba(0,0,0,0.2)" : "0 2px 12px rgba(0,0,0,0.05)",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "rgba(108,76,241,0.5)")}
            onBlur={e => (e.currentTarget.style.borderColor = "var(--theme-border)")}
          />
        </motion.div>

        {/* Quick Help */}
        <div>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--theme-t4)" }}
          >
            Quick Help
          </motion.p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {supports.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  custom={i}
                  initial="hidden"
                  animate="show"
                  variants={fadeUp}
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-4 rounded-2xl flex items-center gap-4 cursor-pointer"
                  style={cardStyle}
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
                    <p className="text-[11px] font-semibold mt-0.5" style={{ color: item.color }}>{item.detail}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--theme-t4)" }} />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* FAQs */}
        <div>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
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
                  style={{ color: "var(--theme-t1)" }}
                >
                  <span className="font-semibold text-sm pr-4">{faq.q}</span>
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
                <p className="text-sm" style={{ color: "var(--theme-t3)" }}>No results for "{search}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: "spring", damping: 22, stiffness: 280 }}
          className="p-6 rounded-2xl relative overflow-hidden"
          style={{ background: "linear-gradient(135deg,#4F35C2,#6C4CF1,#8E44AD)", boxShadow: "0 8px 32px rgba(108,76,241,0.35)" }}
        >
          <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,0.08)", filter: "blur(20px)" }} />
          <div className="relative z-10">
            <p className="font-black text-lg mb-1" style={{ color: "white" }}>Still need help?</p>
            <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>
              Our support team is available Mon–Sat, 9 AM to 6 PM
            </p>
            <div className="flex gap-3 flex-wrap">
              <a
                href="mailto:support@moneysetu.com"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(8px)" }}
              >
                <Mail className="w-4 h-4" />
                Email Us
              </a>
              <a
                href="tel:+919876543210"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                style={{ background: "white", color: "#6C4CF1" }}
              >
                <Phone className="w-4 h-4" />
                Call Support
              </a>
            </div>
          </div>
        </motion.div>

      </div>
    </AppLayout>
  );
}
