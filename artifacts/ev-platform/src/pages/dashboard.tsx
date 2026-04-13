import { AppLayout } from "@/components/layout/AppLayout";
import { useGetBalance, useGetTransactions, useGetUserInvestments } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Activity,
  Clock, Users, Zap, PlusCircle, Gift, X, Loader2, CheckCircle,
  Eye, EyeOff, LayoutGrid, Check,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { apiFetch } from "@/lib/apiFetch";

/* ─── Mini sparkline SVG ─── */
function Sparkline({ data, color = "#a78bfa" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const W = 150, H = 44;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - 6 - ((v / max) * (H - 12)),
  ]);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const fill = `${path} L${W},${H} L0,${H} Z`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#sg)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts[pts.length - 1] && (
        <circle
          cx={pts[pts.length - 1][0]}
          cy={pts[pts.length - 1][1]}
          r={3.5}
          fill={color}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      )}
    </svg>
  );
}

/* ─── Donut chart SVG ─── */
function DonutChart({ active = 0, completed = 0, withdrawn = 0 }: {
  active: number; completed: number; withdrawn: number;
}) {
  const total = active + completed + withdrawn || 1;
  const r = 28, cx = 38, cy = 38;
  const c = 2 * Math.PI * r;
  const segs = [
    { pct: active / total, color: "#6C4CF1" },
    { pct: completed / total, color: "#22C55E" },
    { pct: withdrawn / total, color: "#F59E0B" },
  ];
  let off = 0;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
      {segs.map((seg, i) => {
        if (seg.pct === 0) { off += seg.pct; return null; }
        const dash = seg.pct * c;
        const el = (
          <circle
            key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth="9"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={(c * 0.25) - off * c}
          />
        );
        off += seg.pct;
        return el;
      })}
      <text x={cx} y={cy + 5} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
        {active}
      </text>
    </svg>
  );
}

/* ─── Day-of-week labels ─── */
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

  /* 7-day earnings sparkline from transactions */
  const sparklineData = useMemo(() => {
    if (!txData) return [0, 2, 1, 4, 3, 6, 5];
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

  const dailyEarnings = activeInvestments.reduce((sum, inv) =>
    sum + (parseFloat(inv.amount?.toString()) * parseFloat(inv.dailyReturnPercent?.toString()) / 100), 0
  );

  const portfolioValue = (balanceData?.totalInvested || 0) + (balanceData?.totalEarnings || 0);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  /* ─── Card background ─── */
  const cardStyle = {
    background: "var(--theme-card)",
    border: "1px solid var(--theme-border)",
    boxShadow: isDark ? "0 2px 16px rgba(0,0,0,0.3)" : "0 2px 16px rgba(0,0,0,0.06)",
  };

  return (
    <AppLayout>
      <div className="space-y-5 pb-4">

        {/* ─── Greeting ─── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--theme-t3)" }}>
              {getGreeting()}, <span className="font-bold" style={{ color: "var(--theme-t1)" }}>
                {user?.name?.split(" ")[0] || "Admin"}
              </span> 👋
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--theme-t4)" }}>
              Here's your financial overview
            </p>
          </div>
          <Link href="/profile">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold cursor-pointer transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg,#6C4CF1,#8E44AD)", boxShadow: "0 0 16px rgba(108,76,241,0.35)" }}
            >
              {(user?.name || "U")[0].toUpperCase()}
            </div>
          </Link>
        </div>

        {/* ─── Hero Row: Wallet card + Portfolio card ─── */}
        <div className="grid md:grid-cols-3 gap-4">

          {/* Wallet Card — left 2/3 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="md:col-span-2 relative overflow-hidden rounded-2xl p-5"
            style={{ background: "linear-gradient(135deg,#4F35C2 0%,#6C4CF1 45%,#8E44AD 100%)", boxShadow: "0 8px 32px rgba(108,76,241,0.35)" }}
          >
            {/* Decorative blobs */}
            <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full" style={{ background: "rgba(255,255,255,0.08)", filter: "blur(20px)" }} />
            <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,0.06)", filter: "blur(16px)" }} />

            <div className="relative z-10">
              {/* Header row */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white/70 text-xs font-medium">Total Wallet Balance</p>
                    <button
                      onClick={() => setHideBalance(v => !v)}
                      className="text-white/50 hover:text-white/80 transition-colors"
                    >
                      {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <h2 className="text-4xl font-black tracking-tight text-white">
                    {hideBalance ? "₹••••••" : balanceLoading ? "₹..." : `₹${(balanceData?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                  </h2>
                </div>

                <Link href="/deposit">
                  <div
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white cursor-pointer transition-all hover:scale-105 active:scale-95"
                    style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(8px)" }}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Add Money
                  </div>
                </Link>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-white/60 text-[10px] font-medium mb-0.5">Total Invested</p>
                  <p className="text-white font-bold text-base">
                    {hideBalance ? "₹••••••" : `₹${(balanceData?.totalInvested || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
                <div>
                  <p className="text-white/60 text-[10px] font-medium mb-0.5">Total Earnings</p>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-bold text-base">
                      {hideBalance ? "₹••••••" : `₹${(balanceData?.totalEarnings || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                    </p>
                    {(balanceData?.totalInvested || 0) > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.25)", color: "#4ade80" }}>
                        +{((balanceData?.totalEarnings || 0) / (balanceData?.totalInvested || 1) * 100).toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sparkline chart */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  {DAY_LABELS.map(d => (
                    <span key={d} className="text-[9px] text-white/40 font-medium">{d}</span>
                  ))}
                </div>
                <Sparkline data={sparklineData} color="rgba(255,255,255,0.8)" />
              </div>
            </div>
          </motion.div>

          {/* Portfolio Card — right 1/3 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-2xl p-5 flex flex-col"
            style={cardStyle}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--theme-t4)" }}>Your Portfolio</p>
              <TrendingUp className="w-4 h-4" style={{ color: "#6C4CF1" }} />
            </div>

            <p className="text-2xl font-black mb-0.5" style={{ color: "var(--theme-t1)" }}>
              ₹{portfolioValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            {(balanceData?.totalInvested || 0) > 0 && (
              <div className="flex items-center gap-1 mb-4">
                <span className="text-[11px] font-bold" style={{ color: "#22C55E" }}>
                  +{((balanceData?.totalEarnings || 0) / (balanceData?.totalInvested || 1) * 100).toFixed(2)}% All Time
                </span>
              </div>
            )}

            {/* Donut chart + legend */}
            <div className="flex items-center gap-4 mb-4">
              <DonutChart
                active={activeInvestments.length}
                completed={completedInvestments.length}
                withdrawn={withdrawnInvestments.length}
              />
              <div className="space-y-2 flex-1">
                {[
                  { label: "Active Plans", value: activeInvestments.length, color: "#6C4CF1" },
                  { label: "Completed", value: completedInvestments.length, color: "#22C55E" },
                  { label: "Withdrawn", value: withdrawnInvestments.length, color: "#F59E0B" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      <span className="text-[11px]" style={{ color: "var(--theme-t3)" }}>{item.label}</span>
                    </div>
                    <span className="text-[11px] font-bold" style={{ color: "var(--theme-t1)" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Earnings */}
            <div
              className="mt-auto rounded-xl p-3"
              style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(34,197,94,0.7)" }}>Today's Earnings</p>
              <div className="flex items-center justify-between">
                <p className="text-xl font-black" style={{ color: "#22C55E" }}>₹{todayEarnings.toFixed(2)}</p>
                <div className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(34,197,94,0.7)" }}>
                  <Check className="w-3 h-3" />
                  Credited Automatically
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ─── Quick Actions ─── */}
        <div className="rounded-2xl p-4" style={cardStyle}>
          <div className="grid grid-cols-6 gap-2">
            {([
              { href: "/deposit",       icon: ArrowDownRight, label: "Deposit Money",      bg: "rgba(59,130,246,0.12)",  icon_c: "#60a5fa" },
              { href: "/invest",        icon: Zap,            label: "Invest Now",          bg: "rgba(108,76,241,0.12)", icon_c: "#6C4CF1" },
              { href: "/withdraw",      icon: LayoutGrid,     label: "My Investments",      bg: "rgba(249,115,22,0.12)", icon_c: "#fb923c" },
              { href: "/transactions",  icon: Clock,          label: "Transaction History", bg: "rgba(168,85,247,0.12)", icon_c: "#a855f7" },
              { href: "/referral",      icon: Users,          label: "Refer & Earn",        bg: "rgba(234,179,8,0.12)",  icon_c: "#eab308" },
            ] as const).map((a) => (
              <Link key={a.href} href={a.href}>
                <div className="flex flex-col items-center gap-2 cursor-pointer group py-1">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:-translate-y-0.5"
                    style={{ background: a.bg }}
                  >
                    <a.icon className="w-5 h-5" style={{ color: a.icon_c }} />
                  </div>
                  <p className="text-[10px] font-semibold text-center leading-tight" style={{ color: "var(--theme-t2)" }}>
                    {a.label}
                  </p>
                </div>
              </Link>
            ))}

            {/* Gift Card */}
            <div
              className="flex flex-col items-center gap-2 cursor-pointer group py-1"
              onClick={() => { setGiftOpen(true); setGiftSuccess(null); setGiftCode(""); }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:-translate-y-0.5"
                style={{ background: "rgba(234,179,8,0.12)" }}
              >
                <Gift className="w-5 h-5" style={{ color: "#eab308" }} />
              </div>
              <p className="text-[10px] font-semibold text-center leading-tight" style={{ color: "var(--theme-t2)" }}>
                Gift Card
              </p>
            </div>
          </div>
        </div>

        {/* ─── Bottom Row ─── */}
        <div className="grid md:grid-cols-2 gap-5">

          {/* LEFT: Active Investments + Invite card */}
          <div className="space-y-4">
            {/* Active Investments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm" style={{ color: "var(--theme-t1)" }}>Active Investments</h3>
                <Link href="/invest">
                  <span className="text-xs font-semibold" style={{ color: "#6C4CF1" }}>View All</span>
                </Link>
              </div>

              {activeInvestments.length === 0 ? (
                <div
                  className="p-8 text-center rounded-2xl"
                  style={{ background: "rgba(108,76,241,0.05)", border: "1px dashed rgba(108,76,241,0.2)" }}
                >
                  <Zap className="w-9 h-9 mx-auto mb-3" style={{ color: "rgba(108,76,241,0.35)" }} />
                  <p className="text-sm mb-3" style={{ color: "var(--theme-t3)" }}>No active investments yet</p>
                  <Link href="/invest">
                    <span className="text-sm font-bold" style={{ color: "#6C4CF1" }}>Start investing →</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeInvestments.slice(0, 3).map((inv, idx) => {
                    const planLetter = (inv.planName || "P")[0].toUpperCase();
                    const colorMap: Record<string, string> = {
                      B: "#CD7F32", S: "#94a3b8", G: "#fbbf24", D: "#a855f7",
                    };
                    const planColor = colorMap[planLetter] || "#6C4CF1";
                    return (
                      <motion.div
                        key={inv.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.06 }}
                        className="p-4 rounded-2xl flex items-center justify-between"
                        style={cardStyle}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                            style={{ background: `${planColor}22`, border: `1px solid ${planColor}44`, color: planColor }}
                          >
                            {planLetter}
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
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block"
                            style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}
                          >
                            Active
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Invite & Earn card */}
            <div
              className="p-4 rounded-2xl relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,rgba(108,76,241,0.12),rgba(142,68,173,0.08))", border: "1px solid rgba(108,76,241,0.2)" }}
            >
              <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full" style={{ background: "rgba(108,76,241,0.12)", filter: "blur(16px)" }} />
              <div className="relative z-10">
                <p className="font-bold text-sm mb-1" style={{ color: "var(--theme-t1)" }}>Invite & Earn</p>
                <p className="text-xs mb-3" style={{ color: "var(--theme-t3)" }}>
                  Get ₹300 for each friend who joins & invests
                </p>
                <Link href="/referral">
                  <div
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white cursor-pointer transition-all hover:scale-105"
                    style={{ background: "linear-gradient(135deg,#6C4CF1,#8E44AD)", boxShadow: "0 4px 14px rgba(108,76,241,0.3)" }}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Invite Now
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT: Recent Transactions + Promo */}
          <div className="space-y-4">
            {/* Recent Transactions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm" style={{ color: "var(--theme-t1)" }}>Recent Transactions</h3>
                <Link href="/transactions">
                  <span className="text-xs font-semibold" style={{ color: "#6C4CF1" }}>View All</span>
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
                    const icons: Record<string, { icon: any; bg: string; c: string }> = {
                      deposit:    { icon: ArrowDownRight, bg: "rgba(59,130,246,0.12)",  c: "#60a5fa" },
                      earning:    { icon: TrendingUp,     bg: "rgba(34,197,94,0.12)",   c: "#22C55E" },
                      commission: { icon: Users,          bg: "rgba(168,85,247,0.12)",  c: "#a855f7" },
                      withdrawal: { icon: ArrowUpRight,   bg: "rgba(249,115,22,0.12)",  c: "#fb923c" },
                      investment: { icon: Zap,            bg: "rgba(108,76,241,0.12)",  c: "#6C4CF1" },
                    };
                    const meta = icons[tx.type] || { icon: Activity, bg: "rgba(108,76,241,0.12)", c: "#6C4CF1" };
                    const IconEl = meta.icon;
                    return (
                      <div
                        key={tx.id}
                        className="px-4 py-3 flex items-center justify-between"
                        style={{ borderBottom: i < recentTxs.length - 1 ? "1px solid var(--theme-border)" : "none" }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
                            <IconEl className="w-4 h-4" style={{ color: meta.c }} />
                          </div>
                          <div>
                            <p className="font-semibold text-[13px] capitalize" style={{ color: "var(--theme-t1)" }}>
                              {tx.type === "earning" ? "Earnings Credited" :
                               tx.type === "deposit" ? "Wallet Deposit" :
                               tx.type === "investment" ? "Investment Started" :
                               tx.type === "commission" ? "Referral Bonus" :
                               tx.type === "withdrawal" ? "Withdrawal" : tx.type}
                            </p>
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
                          <span
                            className="text-[10px] font-semibold"
                            style={{
                              color: tx.status === "approved" ? "#22C55E" : tx.status === "pending" ? "#fbbf24" : "#f87171",
                            }}
                          >
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Grow Wealth Smartly promo */}
            <div
              className="p-5 rounded-2xl relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,#1a1040,#2d1863)", border: "1px solid rgba(108,76,241,0.25)" }}
            >
              <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full" style={{ background: "rgba(108,76,241,0.2)", filter: "blur(20px)" }} />
              <div className="absolute top-3 right-3 w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(108,76,241,0.15)" }}>
                <TrendingUp className="w-7 h-7" style={{ color: "#6C4CF1" }} />
              </div>
              <div className="relative z-10 pr-16">
                <p className="font-black text-base text-white mb-1">Grow Wealth Smartly</p>
                <p className="text-xs text-white/60 mb-4">Start investing with trusted plans</p>
                <Link href="/invest">
                  <div
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white cursor-pointer transition-all hover:scale-105"
                    style={{ background: "linear-gradient(135deg,#6C4CF1,#8E44AD)", boxShadow: "0 4px 14px rgba(108,76,241,0.4)" }}
                  >
                    Explore Plans
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Gift Code Modal ─── */}
        <AnimatePresence>
          {giftOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-5"
              style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
              onClick={() => setGiftOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-[320px] rounded-3xl overflow-hidden"
                style={{
                  background: isDark ? "linear-gradient(160deg,#0e0e20,#150e2c)" : "linear-gradient(160deg,#fffbeb,#fef9c3)",
                  border: "1px solid rgba(234,179,8,0.35)",
                  boxShadow: "0 0 40px rgba(234,179,8,0.15)",
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
                    <button
                      onClick={() => setGiftOpen(false)}
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: "var(--theme-card2)" }}
                    >
                      <X className="w-3.5 h-3.5" style={{ color: "var(--theme-t3)" }} />
                    </button>
                  </div>

                  {giftSuccess ? (
                    <div className="text-center py-4 space-y-3">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(34,197,94,0.12)" }}>
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                      </div>
                      <p className="font-black text-lg" style={{ color: "var(--theme-t1)" }}>₹{giftSuccess.amount} Credited!</p>
                      <p className="text-xs" style={{ color: "var(--theme-t3)" }}>The amount has been added to your wallet.</p>
                      <button
                        onClick={() => setGiftOpen(false)}
                        className="w-full py-2.5 rounded-xl font-bold text-sm text-white"
                        style={{ background: "linear-gradient(135deg,#ca8a04,#eab308)" }}
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: "var(--theme-t3)" }}>Enter Code</label>
                        <input
                          value={giftCode}
                          onChange={e => setGiftCode(e.target.value.toUpperCase())}
                          onKeyDown={e => e.key === "Enter" && handleRedeemGift()}
                          placeholder="e.g. DAILY50"
                          className="w-full h-12 rounded-xl px-4 text-center font-mono font-black text-base tracking-widest outline-none"
                          style={{
                            background: "var(--theme-card2)",
                            border: "1px solid rgba(234,179,8,0.25)",
                            color: "var(--theme-t1)",
                          }}
                          autoFocus
                        />
                      </div>
                      <p className="text-[10px]" style={{ color: "var(--theme-t4)" }}>
                        Requires an active investment plan. Each code can only be redeemed once per user.
                      </p>
                      <button
                        onClick={handleRedeemGift}
                        disabled={giftLoading || !giftCode.trim()}
                        className="w-full h-12 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
                        style={{
                          background: giftCode.trim() ? "linear-gradient(135deg,#ca8a04,#eab308)" : "rgba(255,255,255,0.05)",
                          color: giftCode.trim() ? "white" : "rgba(255,255,255,0.2)",
                          boxShadow: giftCode.trim() ? "0 0 24px rgba(234,179,8,0.3)" : "none",
                        }}
                      >
                        {giftLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Gift className="w-4 h-4" /> Redeem Now</>}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </AppLayout>
  );
}
