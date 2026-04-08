import { AppLayout } from "@/components/layout/AppLayout";
import { useGetBalance, useGetTransactions, useGetUserInvestments } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Activity, Clock, Users, Zap, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export default function Dashboard() {
  const { data: balanceData, isLoading: balanceLoading } = useGetBalance();
  const { data: txData } = useGetTransactions();
  const { data: investments } = useGetUserInvestments();
  const { user } = useAuth();

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
        <div className="grid grid-cols-5 gap-3">
          {[
            { href: "/deposit",      icon: ArrowDownRight, label: "Deposit",   iconColor: "#60a5fa", bg: "rgba(59,130,246,0.12)"  },
            { href: "/invest",       icon: Zap,            label: "Invest",    iconColor: "#a855f7", bg: "rgba(168,85,247,0.12)"  },
            { href: "/withdraw",     icon: ArrowUpRight,   label: "Investments",iconColor: "#fb923c", bg: "rgba(249,115,22,0.12)"  },
            { href: "/referral",     icon: Users,          label: "Refer",     iconColor: "#c084fc", bg: "rgba(192,132,252,0.12)" },
            { href: "/transactions", icon: Activity,       label: "History",   iconColor: "#4ade80", bg: "rgba(74,222,128,0.12)"  },
          ].map((a) => (
            <Link key={a.href} href={a.href}>
              <div
                className="p-4 flex flex-col items-center justify-center space-y-2 cursor-pointer transition-all hover:-translate-y-1 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: a.bg, boxShadow: `0 0 16px ${a.bg}` }}>
                  <a.icon className="w-6 h-6" style={{ color: a.iconColor }} />
                </div>
                <span className="font-bold text-xs text-center" style={{ color: "rgba(255,255,255,0.6)" }}>{a.label}</span>
              </div>
            </Link>
          ))}
        </div>

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
                <p className="text-sm mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>No active investments yet</p>
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
                    <div className="p-4 rounded-2xl flex items-center justify-between" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(139,92,246,0.15)" }}>
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: "linear-gradient(135deg, #6d28d9, #a855f7)", boxShadow: "0 0 16px rgba(139,92,246,0.3)" }}>
                          {(inv.planName || "P")[0]}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">{inv.planName}</p>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{inv.dailyReturnPercent}% daily · {inv.durationDays} days</p>
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

            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              {recentTxs.length === 0 ? (
                <div className="p-8 text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No transactions yet</div>
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
                          <p className="text-xs flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}>
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
