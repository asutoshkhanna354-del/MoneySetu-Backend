import { AppLayout } from "@/components/layout/AppLayout";
import { useGetBalance, useGetTransactions, useGetUserInvestments } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Activity, Clock, Users, Zap, PlusCircle, Gift, X, Loader2, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

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
  const activeInvestments = investments?.filter(i => i.status === 'active') || [];

  return (
    <AppLayout>
      <div className="space-y-6 pb-6">

        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back 👋</p>
            <h2 className="text-2xl font-bold">{user?.name || "Investor"}</h2>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/25">
            {(user?.name || "U")[0].toUpperCase()}
          </div>
        </div>

        {/* Top row: Balance card (left) + Stat cards (right on desktop) */}
        <div className="grid md:grid-cols-3 gap-5">
          {/* Hero Balance Card — spans 2 cols on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="md:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-secondary p-6 text-white shadow-xl shadow-primary/25"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-xl -ml-10 -mb-10" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/80 font-medium text-sm">Total Wallet Balance</span>
                <Wallet className="w-5 h-5 text-white/60" />
              </div>
              <h2 className="text-5xl font-bold tracking-tight mb-6">
                ₹{balanceLoading ? "..." : (balanceData?.balance?.toFixed(2) || "0.00")}
              </h2>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                <div>
                  <p className="text-white/60 text-xs mb-1">Total Invested</p>
                  <p className="font-bold text-xl">₹{balanceData?.totalInvested?.toFixed(2) || "0.00"}</p>
                </div>
                <div>
                  <p className="text-white/60 text-xs mb-1">Total Earnings</p>
                  <p className="font-bold text-xl flex items-center gap-1">
                    ₹{balanceData?.totalEarnings?.toFixed(2) || "0.00"}
                    <TrendingUp className="w-4 h-4 text-white/80" />
                  </p>
                </div>
              </div>
              {/* Deposit CTA */}
              <Link href="/deposit">
                <div
                  className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm cursor-pointer transition-all hover:scale-105 active:scale-95"
                  style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", color: "white", border: "1px solid rgba(255,255,255,0.25)" }}
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Money to Wallet
                </div>
              </Link>
            </div>
          </motion.div>

          {/* Right stat card */}
          <div className="flex flex-col gap-5">
            <Card className="flex-1 p-5 border border-purple-100 shadow-sm rounded-2xl flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-primary">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-sm text-muted-foreground font-medium">Active Plans</span>
              </div>
              <p className="text-4xl font-bold text-primary">{activeInvestments.length}</p>
              <Link href="/invest" className="text-xs text-primary font-semibold mt-2 hover:underline">+ Add New Plan →</Link>
            </Card>
            <Card className="flex-1 p-5 border border-purple-100 shadow-sm rounded-2xl flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-sm text-muted-foreground font-medium">Daily Earnings</span>
              </div>
              <p className="text-4xl font-bold text-green-600">
                ₹{activeInvestments.reduce((sum, inv) => sum + (parseFloat(inv.amount?.toString()) * parseFloat(inv.dailyReturnPercent?.toString()) / 100), 0).toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Credited automatically each day</p>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {([
            { href: "/deposit",       icon: ArrowDownRight, label: "Add Money",  sub: "Instant deposit",    iconColor: "#60a5fa", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.2)"  },
            { href: "/invest",        icon: Zap,            label: "Invest Now", sub: "Daily returns",      iconColor: "#a855f7", bg: "rgba(168,85,247,0.1)",  border: "rgba(168,85,247,0.2)"  },
            { href: "/earn-withdraw", icon: ArrowUpRight,   label: "Withdraw",   sub: "Get your earnings",  iconColor: "#4ade80", bg: "rgba(74,222,128,0.1)",  border: "rgba(74,222,128,0.2)"  },
            { href: "/referral",      icon: Users,          label: "Refer",      sub: "Earn commissions",   iconColor: "#c084fc", bg: "rgba(192,132,252,0.1)", border: "rgba(192,132,252,0.2)" },
            { href: "/withdraw",      icon: Activity,       label: "My Plans",   sub: "Track investments",  iconColor: "#fb923c", bg: "rgba(249,115,22,0.1)",  border: "rgba(249,115,22,0.2)"  },
          ] as const).map((a) => (
            <Link key={a.href} href={a.href}>
              <div
                className="p-4 flex items-center gap-3 cursor-pointer transition-all hover:-translate-y-0.5 rounded-2xl"
                style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)" }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: a.bg, border: `1px solid ${a.border}` }}>
                  <a.icon className="w-5 h-5" style={{ color: a.iconColor }} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm" style={{ color: "var(--theme-t1)" }}>{a.label}</p>
                  <p className="text-[11px]" style={{ color: "var(--theme-t4)" }}>{a.sub}</p>
                </div>
              </div>
            </Link>
          ))}
          {/* Gift Code */}
          <div
            onClick={() => { setGiftOpen(true); setGiftSuccess(null); setGiftCode(""); }}
            className="p-4 flex items-center gap-3 cursor-pointer transition-all hover:-translate-y-0.5 rounded-2xl"
            style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)" }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)" }}>
              <Gift className="w-5 h-5" style={{ color: "#eab308" }} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: "var(--theme-t1)" }}>Gift Code</p>
              <p className="text-[11px]" style={{ color: "var(--theme-t4)" }}>Redeem rewards</p>
            </div>
          </div>
        </div>

        {/* Gift Code Modal */}
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
                style={{ background: isDark ? "linear-gradient(160deg,#0e0e20,#150e2c)" : "linear-gradient(160deg,#fffbeb,#fef9c3)", border: "1px solid rgba(234,179,8,0.35)", boxShadow: "0 0 40px rgba(234,179,8,0.15)" }}
              >
                <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg,#ca8a04,#eab308,#ca8a04)" }} />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(234,179,8,0.15)" }}>
                        <Gift className="w-4 h-4 text-yellow-400" />
                      </div>
                      <div>
                        <p className="font-black text-white text-sm">Redeem Gift Code</p>
                        <p className="text-[10px]" style={{ color: "rgba(234,179,8,0.6)" }}>Daily codes: ₹7 to ₹200</p>
                      </div>
                    </div>
                    <button onClick={() => setGiftOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--theme-card2)" }}>
                      <X className="w-3.5 h-3.5 text-white/50" />
                    </button>
                  </div>

                  {giftSuccess ? (
                    <div className="text-center py-4 space-y-3">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(74,222,128,0.12)" }}>
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                      </div>
                      <p className="font-black text-white text-lg">₹{giftSuccess.amount} Credited!</p>
                      <p className="text-xs" style={{ color: "var(--theme-t3)" }}>The amount has been added to your wallet.</p>
                      <button onClick={() => setGiftOpen(false)}
                        className="w-full py-2.5 rounded-xl font-bold text-sm"
                        style={{ background: "linear-gradient(135deg,#ca8a04,#eab308)", color: "white" }}>
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
                          className="w-full h-12 rounded-xl px-4 text-center text-white font-mono font-black text-base tracking-widest outline-none"
                          style={{ background: "var(--theme-card2)", border: "1px solid rgba(234,179,8,0.2)", color: "var(--theme-t1)" }}
                          autoFocus
                        />
                      </div>
                      <p className="text-[10px]" style={{ color: "var(--theme-t4)" }}>
                        Requires an active investment plan. Each code can only be redeemed once per user.
                      </p>
                      <button
                        onClick={handleRedeemGift}
                        disabled={giftLoading || !giftCode.trim()}
                        className="w-full h-12 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                        style={{ background: giftCode.trim() ? "linear-gradient(135deg,#ca8a04,#eab308)" : "rgba(255,255,255,0.05)", color: giftCode.trim() ? "white" : "rgba(255,255,255,0.2)", boxShadow: giftCode.trim() ? "0 0 24px rgba(234,179,8,0.3)" : "none" }}
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

        {/* Bottom row: Investments (left) + Recent Txs (right) */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Active Investments */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base">Active Plans</h3>
              <Link href="/invest" className="text-xs font-semibold text-primary hover:underline">+ Invest More</Link>
            </div>

            {activeInvestments.length === 0 ? (
              <div className="p-8 text-center rounded-2xl" style={{ background: "rgba(139,92,246,0.05)", border: "1px dashed rgba(139,92,246,0.2)" }}>
                <Zap className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(139,92,246,0.3)" }} />
                <p className="text-sm mb-3" style={{ color: "var(--theme-t3)" }}>No active investments yet</p>
                <Link href="/invest">
                  <span className="text-sm font-bold text-purple-400 underline">Start with Silver Plan →</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeInvestments.map((inv, idx) => (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.08 }}
                  >
                    <div className="p-4 rounded-2xl flex items-center justify-between" style={{ background: "var(--theme-card)", border: "1px solid rgba(139,92,246,0.15)" }}>
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: "linear-gradient(135deg, #6d28d9, #a855f7)", boxShadow: "0 0 16px rgba(139,92,246,0.3)" }}>
                          {(inv.planName || "P")[0]}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">{inv.planName}</p>
                          <p className="text-xs" style={{ color: "var(--theme-t3)" }}>{inv.dailyReturnPercent}% daily · {inv.durationDays} days</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-400">₹{parseFloat(inv.amount?.toString()).toLocaleString("en-IN")}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block" style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>Active</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base">Recent Transactions</h3>
              <Link href="/transactions" className="text-xs font-semibold text-primary hover:underline">View All</Link>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)" }}>
              {recentTxs.length === 0 ? (
                <div className="p-8 text-center text-sm" style={{ color: "var(--theme-t3)" }}>No transactions yet</div>
              ) : (
                recentTxs.map((tx, i) => {
                  const isCredit = ['deposit', 'earning', 'commission'].includes(tx.type);
                  return (
                    <div key={tx.id} className="p-3.5 flex items-center justify-between" style={{ borderBottom: i < recentTxs.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{
                          background: tx.type === 'deposit' ? "rgba(59,130,246,0.15)" :
                                      tx.type === 'earning'  ? "rgba(74,222,128,0.15)" :
                                      "rgba(168,85,247,0.15)",
                        }}>
                          {tx.type === 'deposit' ? <ArrowDownRight className="w-4 h-4 text-blue-400" /> :
                           tx.type === 'withdrawal' ? <ArrowUpRight className="w-4 h-4 text-orange-400" /> :
                           tx.type === 'earning' ? <TrendingUp className="w-4 h-4 text-green-400" /> :
                           <Zap className="w-4 h-4 text-purple-400" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm capitalize text-white">{tx.type}</p>
                          <p className="text-xs flex items-center gap-1" style={{ color: "var(--theme-t3)" }}>
                            <Clock className="w-3 h-3" />{format(new Date(tx.createdAt), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm" style={{ color: isCredit ? "#4ade80" : "rgba(255,255,255,0.7)" }}>
                          {isCredit ? "+" : "-"}₹{parseFloat(tx.amount?.toString()).toLocaleString("en-IN")}
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                          background: tx.status === 'approved' ? "rgba(74,222,128,0.15)" : tx.status === 'pending' ? "rgba(251,191,36,0.15)" : "rgba(239,68,68,0.15)",
                          color: tx.status === 'approved' ? "#4ade80" : tx.status === 'pending' ? "#fbbf24" : "#f87171",
                        }}>{tx.status}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
