import { AppLayout } from "@/components/layout/AppLayout";
import { useGetBalance, useGetTransactions, useGetUserInvestments } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Activity,
  Clock, Users, Zap, PlusCircle, Gift, X, Loader2, CheckCircle,
  Eye, EyeOff, LayoutGrid, Check, MessageCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { apiFetch } from "@/lib/apiFetch";

/* ─── Animation presets ─── */
const spring = { type: "spring" as const, damping: 22, stiffness: 300 };
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { ...spring, delay } },
});
const stagger = {
  animate: { transition: { staggerChildren: 0.07 } },
};
const itemVariant = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { ...spring } },
};

/* ─── Mini sparkline SVG ─── */
function Sparkline({ data, color = "rgba(255,255,255,0.9)" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const W = 160, H = 48;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - 8 - ((v / max) * (H - 18)),
  ]);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const fill = `${path} L${W},${H} L0,${H} Z`;
  const id = `sg-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts[pts.length - 1] && (
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={4} fill={color} />
      )}
    </svg>
  );
}

/* ─── Donut chart matching screenshot ─── */
function DonutChart({ active = 0, completed = 0, withdrawn = 0 }: {
  active: number; completed: number; withdrawn: number;
}) {
  const total = active + completed + withdrawn || 1;
  const r = 30, cx = 40, cy = 40;
  const c = 2 * Math.PI * r;
  const segs = [
    { pct: active / total, color: "#6C4CF1", label: "Active" },
    { pct: completed / total, color: "#4361EE", label: "Completed" },
    { pct: withdrawn / total, color: "#F59E0B", label: "Withdrawn" },
  ];
  let off = 0;
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="11" />
      {segs.map((seg, i) => {
        if (seg.pct === 0) { off += seg.pct; return null; }
        const dash = seg.pct * c;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth="11"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={c * 0.25 - off * c}
            strokeLinecap="butt"
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        );
        off += seg.pct;
        return el;
      })}
      <text x={cx} y={cy + 1} textAnchor="middle" fontSize="11" fontWeight="800" fill="white">
        {active}
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.5)">
        active
      </text>
    </svg>
  );
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Dashboard() {
  const { isDark } = useTheme();
  const { data: balanceData, isLoading: balanceLoading } = useGetBalance();
  const { data: txData } = useGetTransactions();
  const { data: investments } = useGetUserInvestments();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [giftOpen, setGiftOpen] = useState(false);
  const [giftCode, setGiftCode] = useState("");
  const [giftLoading, setGiftLoading] = useState(false);
  const [giftSuccess, setGiftSuccess] = useState<{ amount: number } | null>(null);
  const [hideBalance, setHideBalance] = useState(false);

  const handleRedeemGift = async () => {
    if (!giftCode.trim()) return;
    setGiftLoading(true);
    try {
      const res = await apiFetch("/api/gift-code/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("ev_token")}` },
        body: JSON.stringify({ code: giftCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Redemption failed", description: data.error, variant: "destructive" }); return; }
      setGiftSuccess({ amount: data.amount });
      queryClient.invalidateQueries();
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setGiftLoading(false); }
  };

  const recentTxs = txData?.slice(0, 5) || [];
  const activeInvestments = investments?.filter(i => i.status === "active") || [];
  const completedInvestments = investments?.filter(i => i.status === "completed") || [];
  const withdrawnInvestments = investments?.filter(i => i.status === "withdrawn") || [];

  const sparklineData = useMemo(() => {
    if (!txData) return [1, 3, 2, 5, 4, 7, 6];
    const days = Array(7).fill(0);
    const now = new Date();
    txData.forEach(tx => {
      if (tx.type === "earning") {
        const d = Math.floor((now.getTime() - new Date(tx.createdAt).getTime()) / 86400000);
        if (d >= 0 && d < 7) days[6 - d] += parseFloat(tx.amount?.toString() || "0");
      }
    });
    return days;
  }, [txData]);

  const todayEarnings = useMemo(() => {
    if (!txData) return 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return txData
      .filter(tx => tx.type === "earning" && new Date(tx.createdAt) >= today)
      .reduce((s, tx) => s + parseFloat(tx.amount?.toString() || "0"), 0);
  }, [txData]);

  const portfolioValue = (balanceData?.totalInvested || 0) + (balanceData?.totalEarnings || 0);
  const allTimeReturn = (balanceData?.totalInvested || 0) > 0
    ? ((balanceData?.totalEarnings || 0) / (balanceData?.totalInvested || 1) * 100).toFixed(2)
    : "0.00";

  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
  };

  const cardStyle = {
    background: "var(--theme-card)",
    border: "1px solid var(--theme-border)",
    boxShadow: isDark ? "0 2px 20px rgba(0,0,0,0.3)" : "0 2px 20px rgba(0,0,0,0.07)",
  };

  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2 });

  return (
    <AppLayout>
      <motion.div className="space-y-5 pb-4" initial="initial" animate="animate" variants={stagger}>

        {/* ─── Greeting ─── */}
        <motion.div variants={itemVariant} className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--theme-t3)" }}>
              {getGreeting()},{" "}
              <span className="font-bold" style={{ color: "var(--theme-t1)" }}>
                {user?.name?.split(" ")[0] || "Admin"}
              </span>{" "}
              {new Date().getHours() < 12 ? "🌤️" : new Date().getHours() < 17 ? "☀️" : "🌙"}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--theme-t4)" }}>Here's your financial overview</p>
          </div>
          <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
            <Link href="/profile">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer"
                style={{ background: "linear-gradient(135deg,#6C4CF1,#8E44AD)", color: "white", boxShadow: "0 0 16px rgba(108,76,241,0.4)" }}
              >
                {(user?.name || "A")[0].toUpperCase()}
              </div>
            </Link>
          </motion.div>
        </motion.div>

        {/* ─── Hero Row ─── */}
        <div className="grid md:grid-cols-3 gap-4">

          {/* Wallet Card — 2/3 */}
          <motion.div
            variants={itemVariant}
            whileHover={{ y: -2 }}
            className="md:col-span-2 relative overflow-hidden rounded-2xl p-5 cursor-default"
            style={{ background: "linear-gradient(135deg,#4F35C2 0%,#6C4CF1 50%,#8E44AD 100%)", boxShadow: "0 10px 40px rgba(108,76,241,0.4)" }}
          >
            {/* Decorative */}
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full" style={{ background: "rgba(255,255,255,0.09)", filter: "blur(24px)" }} />
            <div className="absolute bottom-0 left-1/3 w-24 h-24 rounded-full" style={{ background: "rgba(255,255,255,0.06)", filter: "blur(20px)" }} />

            <div className="relative z-10">
              {/* Top row */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>Total Wallet Balance</span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setHideBalance(v => !v)}
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </motion.button>
                  </div>
                  <motion.h2
                    key={String(hideBalance)}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-black tracking-tight"
                    style={{ color: "white" }}
                  >
                    {hideBalance ? "₹••••••" : balanceLoading ? "₹..." : `₹${fmt(balanceData?.balance || 0)}`}
                  </motion.h2>
                </div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/deposit">
                    <div
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.18)", color: "white", border: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(8px)" }}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Add Money
                    </div>
                  </Link>
                </motion.div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>Total Invested</p>
                  <p className="font-bold text-lg" style={{ color: "white" }}>
                    {hideBalance ? "₹••••" : `₹${fmt(balanceData?.totalInvested || 0)}`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>Total Earnings</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-lg" style={{ color: "white" }}>
                      {hideBalance ? "₹••••" : `₹${fmt(balanceData?.totalEarnings || 0)}`}
                    </p>
                    {!hideBalance && parseFloat(allTimeReturn) > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.3)", color: "#86efac" }}>
                        +{allTimeReturn}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sparkline + day labels */}
              <div>
                <Sparkline data={sparklineData} />
                <div className="flex justify-between mt-1">
                  {DAY_LABELS.map(d => (
                    <span key={d} className="text-[9px] font-medium" style={{ color: "rgba(255,255,255,0.38)" }}>{d}</span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Portfolio Card — 1/3 */}
          <motion.div
            variants={itemVariant}
            whileHover={{ y: -2 }}
            className="rounded-2xl p-5 flex flex-col"
            style={{ background: isDark ? "#141B2D" : "var(--theme-card)", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "var(--theme-border)"}`, boxShadow: isDark ? "0 2px 20px rgba(0,0,0,0.35)" : "0 2px 20px rgba(0,0,0,0.07)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold" style={{ color: "var(--theme-t3)" }}>Your Portfolio</p>
              <TrendingUp className="w-4 h-4" style={{ color: "#6C4CF1" }} />
            </div>

            <p className="text-2xl font-black mb-0.5" style={{ color: "var(--theme-t1)" }}>
              ₹{fmt(portfolioValue)}
            </p>
            {parseFloat(allTimeReturn) > 0 && (
              <p className="text-[11px] font-bold mb-3" style={{ color: "#22C55E" }}>
                +{allTimeReturn}% All Time
              </p>
            )}

            {/* Donut + legend */}
            <div className="flex items-center gap-3 mb-4">
              <DonutChart
                active={activeInvestments.length}
                completed={completedInvestments.length}
                withdrawn={withdrawnInvestments.length}
              />
              <div className="space-y-2 flex-1">
                {[
                  { label: "Active Plans", val: activeInvestments.length, color: "#6C4CF1" },
                  { label: "Completed", val: completedInvestments.length, color: "#4361EE" },
                  { label: "Withdrawn", val: withdrawnInvestments.length, color: "#F59E0B" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-[10px]" style={{ color: "var(--theme-t3)" }}>{item.label}</span>
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: "var(--theme-t1)" }}>{item.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's earnings */}
            <div
              className="mt-auto rounded-xl p-3"
              style={{ background: "rgba(34,197,94,0.09)", border: "1px solid rgba(34,197,94,0.18)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(34,197,94,0.7)" }}>Today's Earnings</p>
              <div className="flex items-center justify-between">
                <p className="text-xl font-black" style={{ color: "#22C55E" }}>₹{todayEarnings.toFixed(2)}</p>
                <div className="flex items-center gap-1">
                  <Check className="w-3 h-3" style={{ color: "#22C55E" }} />
                  <span className="text-[9px] font-semibold" style={{ color: "rgba(34,197,94,0.7)" }}>Credited Automatically</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ─── Quick Actions ─── */}
        <motion.div variants={itemVariant} className="rounded-2xl p-5" style={cardStyle}>
          <div className="grid grid-cols-6 gap-1 sm:gap-3">
            {([
              { href: "/deposit",       icon: ArrowDownRight, label: "Deposit Money",        bg: "rgba(59,130,246,0.13)",  ic: "#60a5fa" },
              { href: "/invest",        icon: Zap,            label: "Invest Now",            bg: "rgba(108,76,241,0.13)", ic: "#6C4CF1" },
              { href: "/withdraw",      icon: LayoutGrid,     label: "My Investments",        bg: "rgba(249,115,22,0.13)", ic: "#fb923c" },
              { href: "/transactions",  icon: Clock,          label: "Transaction History",   bg: "rgba(168,85,247,0.13)", ic: "#a855f7" },
              { href: "/referral",      icon: Users,          label: "Refer & Earn",          bg: "rgba(234,179,8,0.13)",  ic: "#eab308" },
            ] as const).map((a, i) => (
              <Link key={a.href} href={a.href}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-2 cursor-pointer py-1"
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: a.bg }}>
                    <a.icon className="w-5 h-5" style={{ color: a.ic }} />
                  </div>
                  <p className="text-[10px] font-semibold text-center leading-tight hidden sm:block" style={{ color: "var(--theme-t2)" }}>
                    {a.label}
                  </p>
                </motion.div>
              </Link>
            ))}

            {/* Gift Card */}
            <motion.div
              whileHover={{ y: -4, scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-2 cursor-pointer py-1"
              onClick={() => { setGiftOpen(true); setGiftSuccess(null); setGiftCode(""); }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(234,179,8,0.13)" }}>
                <Gift className="w-5 h-5" style={{ color: "#eab308" }} />
              </div>
              <p className="text-[10px] font-semibold text-center leading-tight hidden sm:block" style={{ color: "var(--theme-t2)" }}>
                Gift Card
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* ─── Bottom: Active Plans (left) + Transactions (right) ─── */}
        <div className="grid md:grid-cols-2 gap-5">

          {/* LEFT COLUMN */}
          <motion.div variants={itemVariant} className="space-y-4">
            {/* Active Investments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm" style={{ color: "var(--theme-t1)" }}>Active Investments</h3>
                <Link href="/invest">
                  <motion.span whileHover={{ x: 2 }} className="text-xs font-semibold cursor-pointer" style={{ color: "#6C4CF1" }}>
                    View All
                  </motion.span>
                </Link>
              </div>

              {activeInvestments.length === 0 ? (
                <div className="p-8 text-center rounded-2xl" style={{ background: "rgba(108,76,241,0.05)", border: "1px dashed rgba(108,76,241,0.25)" }}>
                  <Zap className="w-9 h-9 mx-auto mb-3" style={{ color: "rgba(108,76,241,0.35)" }} />
                  <p className="text-sm mb-3" style={{ color: "var(--theme-t3)" }}>No active investments yet</p>
                  <Link href="/invest">
                    <span className="text-sm font-bold" style={{ color: "#6C4CF1" }}>Start investing →</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeInvestments.slice(0, 3).map((inv, idx) => {
                    const pl = (inv.planName || "P")[0].toUpperCase();
                    const pc: Record<string, string> = { B: "#CD7F32", S: "#94a3b8", G: "#f59e0b", D: "#a855f7" };
                    const planColor = pc[pl] || "#6C4CF1";
                    return (
                      <motion.div
                        key={inv.id}
                        variants={itemVariant}
                        whileHover={{ x: 3 }}
                        className="p-4 rounded-2xl flex items-center justify-between"
                        style={cardStyle}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                            style={{ background: `${planColor}18`, border: `1.5px solid ${planColor}30`, color: planColor }}
                          >
                            {pl}
                          </div>
                          <div>
                            <p className="font-bold text-sm" style={{ color: "var(--theme-t1)" }}>{inv.planName}</p>
                            <p className="text-[11px]" style={{ color: "var(--theme-t4)" }}>
                              Daily Returns • {inv.durationDays} Days
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm" style={{ color: "#6C4CF1" }}>
                            ₹{parseFloat(inv.amount?.toString()).toLocaleString("en-IN")}
                          </p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block" style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}>
                            Active
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Invite & Earn card — matching screenshot */}
            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 rounded-2xl relative overflow-hidden cursor-pointer"
              style={{ background: "linear-gradient(135deg,#3730a3,#4F35C2,#6C4CF1)", boxShadow: "0 6px 24px rgba(108,76,241,0.3)" }}
            >
              <div className="absolute -right-2 -top-2 w-20 h-20 rounded-full opacity-20" style={{ background: "rgba(255,255,255,0.2)", filter: "blur(12px)" }} />
              <div className="relative z-10 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-black text-sm mb-0.5" style={{ color: "white" }}>Invite & Earn</p>
                  <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.65)" }}>Get ₹300 for each friend</p>
                  <Link href="/referral">
                    <motion.div
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.18)", color: "white", border: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(8px)" }}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Invite Now
                    </motion.div>
                  </Link>
                </div>
                <div className="text-4xl select-none flex-shrink-0">🎁</div>
              </div>
            </motion.div>
          </motion.div>

          {/* RIGHT COLUMN */}
          <motion.div variants={itemVariant} className="space-y-4">
            {/* Recent Transactions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm" style={{ color: "var(--theme-t1)" }}>Recent Transactions</h3>
                <Link href="/transactions">
                  <motion.span whileHover={{ x: 2 }} className="text-xs font-semibold cursor-pointer" style={{ color: "#6C4CF1" }}>
                    View All
                  </motion.span>
                </Link>
              </div>

              <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                {recentTxs.length === 0 ? (
                  <div className="p-8 text-center text-sm" style={{ color: "var(--theme-t3)" }}>
                    No transactions yet
                  </div>
                ) : (
                  recentTxs.map((tx, i) => {
                    const isCredit = ["deposit", "earning", "commission"].includes(tx.type);
                    const meta: Record<string, { icon: any; bg: string; c: string; name: string }> = {
                      deposit:    { icon: ArrowDownRight, bg: "rgba(59,130,246,0.12)",  c: "#60a5fa", name: "Wallet Deposit" },
                      earning:    { icon: TrendingUp,     bg: "rgba(34,197,94,0.12)",   c: "#22C55E", name: "Earnings Credited" },
                      commission: { icon: Users,          bg: "rgba(168,85,247,0.12)",  c: "#a855f7", name: "Referral Bonus" },
                      withdrawal: { icon: ArrowUpRight,   bg: "rgba(249,115,22,0.12)",  c: "#fb923c", name: "Withdrawal" },
                      investment: { icon: Zap,            bg: "rgba(108,76,241,0.12)",  c: "#6C4CF1", name: "Investment Started" },
                    };
                    const m = meta[tx.type] || { icon: Activity, bg: "rgba(108,76,241,0.12)", c: "#6C4CF1", name: tx.type };
                    const IconEl = m.icon;
                    return (
                      <motion.div
                        key={tx.id}
                        whileHover={{ backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(108,76,241,0.02)" }}
                        className="px-4 py-3 flex items-center justify-between"
                        style={{ borderBottom: i < recentTxs.length - 1 ? "1px solid var(--theme-border)" : "none" }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: m.bg }}>
                            <IconEl className="w-4 h-4" style={{ color: m.c }} />
                          </div>
                          <div>
                            <p className="font-semibold text-[13px]" style={{ color: "var(--theme-t1)" }}>{m.name}</p>
                            <p className="text-[10px] flex items-center gap-1" style={{ color: "var(--theme-t4)" }}>
                              <Clock className="w-2.5 h-2.5" />
                              {format(new Date(tx.createdAt), "MMM d, h:mm a")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm" style={{ color: isCredit ? "#22C55E" : "#f87171" }}>
                            {isCredit ? "+" : "-"}₹{parseFloat(tx.amount?.toString()).toLocaleString("en-IN")}
                          </p>
                          <span className="text-[10px] font-semibold capitalize" style={{
                            color: tx.status === "approved" ? "#22C55E" : tx.status === "pending" ? "#fbbf24" : "#f87171",
                          }}>
                            ● {tx.status}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Grow Wealth Smartly — matching screenshot exactly */}
            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="p-5 rounded-2xl relative overflow-hidden cursor-pointer"
              style={{ background: "linear-gradient(135deg,#0c0826 0%,#1a0b3e 50%,#2d1863 100%)", border: "1px solid rgba(108,76,241,0.2)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
            >
              <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full" style={{ background: "rgba(108,76,241,0.2)", filter: "blur(24px)" }} />

              <div className="relative z-10 flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-black text-base mb-1" style={{ color: "#c4b5fd" }}>Grow Wealth Smartly</p>
                  <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>Start investing with trusted plans</p>
                  <Link href="/invest">
                    <motion.div
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black cursor-pointer"
                      style={{ background: "linear-gradient(135deg,#6C4CF1,#8E44AD)", color: "white", boxShadow: "0 4px 14px rgba(108,76,241,0.5)" }}
                    >
                      Explore Plans
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </motion.div>
                  </Link>
                </div>
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ml-3"
                  style={{ background: "rgba(108,76,241,0.25)", border: "1px solid rgba(108,76,241,0.35)" }}
                >
                  <TrendingUp className="w-5 h-5" style={{ color: "#a78bfa" }} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ─── Support Card — mobile only (desktop has sidebar) ─── */}
        <motion.div variants={itemVariant} className="md:hidden">
          <Link href="/support">
            <motion.div
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              className="p-4 rounded-2xl flex items-center justify-between cursor-pointer"
              style={{
                background: isDark
                  ? "linear-gradient(135deg,#0f172a,#1e1b4b)"
                  : "linear-gradient(135deg,#ede9fe,#ddd6fe)",
                border: isDark ? "1px solid rgba(139,92,246,0.25)" : "1px solid rgba(109,40,217,0.2)",
                boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 4px 16px rgba(109,40,217,0.1)",
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.3)" }}
                >
                  <MessageCircle className="w-6 h-6" style={{ color: "#a855f7" }} />
                </div>
                <div>
                  <p className="font-black text-sm" style={{ color: "var(--theme-t1)" }}>Support Center</p>
                  <p className="text-xs" style={{ color: "var(--theme-t3)" }}>Get help · Contact us</p>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 flex-shrink-0" style={{ color: "#a855f7" }} />
            </motion.div>
          </Link>
        </motion.div>

        {/* ─── Gift Code Modal ─── */}
        <AnimatePresence>
          {giftOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-5"
              style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
              onClick={() => setGiftOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.88, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0, transition: spring }}
                exit={{ scale: 0.88, opacity: 0, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-[320px] rounded-3xl overflow-hidden"
                style={{
                  background: isDark ? "linear-gradient(160deg,#0e0e20,#150e2c)" : "linear-gradient(160deg,#fffbeb,#fef9c3)",
                  border: "1px solid rgba(234,179,8,0.35)",
                  boxShadow: "0 0 60px rgba(234,179,8,0.2)",
                }}
              >
                <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg,#ca8a04,#eab308,#ca8a04)" }} />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(234,179,8,0.15)" }}>
                        <Gift className="w-4 h-4 text-yellow-400" />
                      </div>
                      <div>
                        <p className="font-black text-sm" style={{ color: "var(--theme-t1)" }}>Redeem Gift Code</p>
                        <p className="text-[10px]" style={{ color: "rgba(234,179,8,0.7)" }}>Daily codes: ₹7 to ₹200</p>
                      </div>
                    </div>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setGiftOpen(false)}
                      className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--theme-card2)" }}>
                      <X className="w-3.5 h-3.5" style={{ color: "var(--theme-t3)" }} />
                    </motion.button>
                  </div>

                  {giftSuccess ? (
                    <div className="text-center py-4 space-y-3">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1, transition: { type: "spring", damping: 15 } }}
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(34,197,94,0.12)" }}>
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                      </motion.div>
                      <p className="font-black text-lg" style={{ color: "var(--theme-t1)" }}>₹{giftSuccess.amount} Credited!</p>
                      <p className="text-xs" style={{ color: "var(--theme-t3)" }}>Added to your wallet.</p>
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => setGiftOpen(false)}
                        className="w-full py-2.5 rounded-xl font-bold text-sm" style={{ background: "linear-gradient(135deg,#ca8a04,#eab308)", color: "white" }}>
                        Done
                      </motion.button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: "var(--theme-t3)" }}>Enter Code</label>
                      <input
                        value={giftCode}
                        onChange={e => setGiftCode(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === "Enter" && handleRedeemGift()}
                        placeholder="e.g. DAILY50"
                        className="w-full h-12 rounded-xl px-4 text-center font-mono font-black text-base tracking-widest outline-none"
                        style={{ background: "var(--theme-card2)", border: "1px solid rgba(234,179,8,0.25)", color: "var(--theme-t1)" }}
                        autoFocus
                      />
                      <p className="text-[10px]" style={{ color: "var(--theme-t4)" }}>
                        Requires an active plan. Each code redeemable once.
                      </p>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleRedeemGift}
                        disabled={giftLoading || !giftCode.trim()}
                        className="w-full h-12 rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                        style={{
                          background: giftCode.trim() ? "linear-gradient(135deg,#ca8a04,#eab308)" : "rgba(255,255,255,0.05)",
                          color: giftCode.trim() ? "white" : "rgba(255,255,255,0.2)",
                          boxShadow: giftCode.trim() ? "0 0 24px rgba(234,179,8,0.3)" : "none",
                        }}
                      >
                        {giftLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Gift className="w-4 h-4" /> Redeem Now</>}
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </AppLayout>
  );
}
