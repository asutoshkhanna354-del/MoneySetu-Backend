import { AppLayout } from "@/components/layout/AppLayout";
import { useGetInvestmentPlans, useCreateInvestment, useGetBalance } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Zap, Clock, TrendingUp, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { InvestmentPlan } from "@workspace/api-client-react/src/generated/api.schemas";

const PLAN_COLORS: Record<string, { color: string; glow: string; gradient: string }> = {
  Silver:   { color: "#94a3b8", glow: "rgba(148,163,184,0.35)", gradient: "linear-gradient(135deg,#64748b,#94a3b8)" },
  Gold:     { color: "#f59e0b", glow: "rgba(245,158,11,0.35)",  gradient: "linear-gradient(135deg,#d97706,#f59e0b)" },
  Platinum: { color: "#06b6d4", glow: "rgba(6,182,212,0.35)",   gradient: "linear-gradient(135deg,#0891b2,#06b6d4)" },
  Diamond:  { color: "#a855f7", glow: "rgba(168,85,247,0.4)",   gradient: "linear-gradient(135deg,#7c3aed,#a855f7)" },
};
const defaultPlan = { color: "#a855f7", glow: "rgba(168,85,247,0.4)", gradient: "linear-gradient(135deg,#7c3aed,#a855f7)" };
function planStyle(name: string) { return PLAN_COLORS[name] || defaultPlan; }

export default function Invest() {
  const { data: plans, isLoading } = useGetInvestmentPlans();
  const { data: balanceData } = useGetBalance();
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [amount, setAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const investMutation = useCreateInvestment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Investment Activated!", description: "Your plan is now earning daily returns." });
        queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/users/balance"] });
        setSelectedPlan(null);
        setAmount("");
      },
      onError: (error: any) => {
        toast({ title: "Failed", description: error?.error || "Could not complete investment.", variant: "destructive" });
      }
    }
  });

  const handleInvest = () => {
    if (!selectedPlan) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val < selectedPlan.minAmount || val > selectedPlan.maxAmount) {
      toast({ title: "Invalid Amount", description: `Enter ₹${selectedPlan.minAmount} – ₹${selectedPlan.maxAmount}`, variant: "destructive" });
      return;
    }
    investMutation.mutate({ data: { planId: selectedPlan.id, amount: val } });
  };

  const projectedDaily = parseFloat(amount) ? (parseFloat(amount) * (selectedPlan?.dailyReturnPercent || 0) / 100).toFixed(2) : "0.00";
  const projectedTotal = parseFloat(amount) ? (parseFloat(amount) * (selectedPlan?.dailyReturnPercent || 0) / 100 * (selectedPlan?.durationDays || 0)).toFixed(2) : "0.00";
  const sp = selectedPlan ? planStyle(selectedPlan.name) : defaultPlan;

  return (
    <AppLayout>
      <div className="space-y-5 pb-6">

        {/* Moving gradient page header */}
        <div className="relative rounded-3xl overflow-hidden p-6" style={{
          background: "linear-gradient(135deg, #1a0533, #0d0118, #160a2e)",
          backgroundSize: "300% 300%",
          animation: "gradRotate 6s ease infinite",
          border: "1px solid rgba(139,92,246,0.2)",
        }}>
          <div className="absolute inset-0 aurora-blob" style={{ background: "radial-gradient(circle, rgba(109,40,217,0.3) 0%, transparent 70%)", width: "100%", height: "100%", filter: "blur(30px)", borderRadius: 0, animation: "aurora1 8s ease-in-out infinite" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-purple-300 uppercase tracking-widest">Investment Plans</span>
            </div>
            <h1 className="text-2xl font-black text-white">Grow Your Wealth</h1>
            <p className="text-white/40 text-sm mt-1">Daily returns, credited automatically every day</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {plans?.filter(p => p.isActive).map((plan, idx) => {
              const ps = planStyle(plan.name);
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                >
                  <div
                    className="rounded-2xl p-px"
                    style={{ background: `linear-gradient(135deg, ${ps.glow.replace("0.35","0.5")}, rgba(255,255,255,0.04), ${ps.glow.replace("0.35","0.3")})` }}
                  >
                    <div className="rounded-[14px] overflow-hidden" style={{ background: "#080808" }}>
                      {/* Plan image */}
                      {(plan as any).imageUrl && (
                        <div className="relative overflow-hidden" style={{ height: "140px" }}>
                          <img src={(plan as any).imageUrl} alt={plan.name} className="w-full h-full object-cover" onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} />
                          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0) 30%, #080808 100%)" }} />
                          <div className="absolute bottom-3 left-4 flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-xs font-black" style={{ background: ps.glow.replace("0.35","0.6"), color: ps.color, backdropFilter: "blur(8px)" }}>{plan.dailyReturnPercent}% daily</span>
                          </div>
                        </div>
                      )}
                      {/* Plan header */}
                      <div className="px-5 pt-5 pb-4 flex items-center justify-between" style={{
                        background: `linear-gradient(135deg, ${ps.glow.replace("0.35","0.15")}, transparent)`,
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                      }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: ps.glow.replace("0.35","0.2"), boxShadow: `0 0 16px ${ps.glow}` }}>
                            <Zap className="w-5 h-5" style={{ color: ps.color }} />
                          </div>
                          <div>
                            <p className="font-black text-white text-lg">{plan.name}</p>
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{plan.description || `Earn ${plan.dailyReturnPercent}% every day`}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black" style={{ color: ps.color, textShadow: `0 0 20px ${ps.glow}` }}>{plan.dailyReturnPercent}%</span>
                          <p className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>daily</p>
                        </div>
                      </div>

                      {/* Plan details */}
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                              <TrendingUp className="w-3 h-3" /> Investment
                            </p>
                            <p className="font-bold text-sm text-white">₹{plan.minAmount.toLocaleString("en-IN")} – ₹{plan.maxAmount.toLocaleString("en-IN")}</p>
                          </div>
                          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                              <Clock className="w-3 h-3" /> Duration
                            </p>
                            <p className="font-bold text-sm text-white">{plan.durationDays} Days</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-sm py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <span style={{ color: "rgba(255,255,255,0.35)" }}>Total profit at max</span>
                          <span className="font-black" style={{ color: ps.color }}>~{plan.dailyReturnPercent * plan.durationDays}%</span>
                        </div>

                        <button
                          onClick={() => setSelectedPlan(plan)}
                          className="w-full py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                          style={{
                            background: ps.gradient,
                            boxShadow: `0 0 24px ${ps.glow}`,
                            color: "white",
                          }}
                        >
                          Invest in {plan.name}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Invest Dialog */}
        <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
          <DialogContent className="rounded-3xl p-0 max-w-[92vw] w-[420px] overflow-hidden border-0" style={{ background: "#0a0a0a" }}>
            {/* Dialog gradient header */}
            <div className="p-6 pb-4" style={{
              background: `linear-gradient(135deg, ${sp.glow.replace("0.4","0.2")}, rgba(0,0,0,0))`,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-white text-center">
                  Invest in <span style={{ color: sp.color }}>{selectedPlan?.name}</span>
                </DialogTitle>
                <DialogDescription className="text-center text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Wallet balance: <span className="font-bold text-white">₹{balanceData?.balance?.toFixed(2) || "0.00"}</span>
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Enter Amount (₹)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`${selectedPlan?.minAmount} – ${selectedPlan?.maxAmount}`}
                  className="w-full h-14 text-2xl font-black rounded-xl text-center focus:outline-none focus:ring-1"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "white",
                    caretColor: sp.color,
                  }}
                />
                <p className="text-center text-xs mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>
                  Min ₹{selectedPlan?.minAmount?.toLocaleString("en-IN")} · Max ₹{selectedPlan?.maxAmount?.toLocaleString("en-IN")}
                </p>
              </div>

              {amount && !isNaN(parseFloat(amount)) && (
                <div className="rounded-2xl p-4 space-y-2" style={{ background: `${sp.glow.replace("0.4","0.1")}`, border: `1px solid ${sp.glow.replace("0.4","0.25")}` }}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Daily Return</span>
                    <span className="font-black text-lg" style={{ color: sp.color }}>+₹{projectedDaily}</span>
                  </div>
                  <div className="flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px" }}>
                    <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Total Earnings</span>
                    <span className="font-black text-xl gradient-text">₹{projectedTotal}</span>
                  </div>
                </div>
              )}

              {parseFloat(amount) > (balanceData?.balance || 0) && (
                <div className="flex items-center gap-2 text-sm p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Insufficient balance. <Link href="/deposit" className="underline font-bold">Deposit here.</Link></span>
                </div>
              )}

              <button
                onClick={handleInvest}
                disabled={investMutation.isPending || !amount || parseFloat(amount) > (balanceData?.balance || 0)}
                className="w-full h-13 py-4 rounded-xl font-black text-base text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                style={{ background: sp.gradient, boxShadow: `0 0 30px ${sp.glow}` }}
              >
                {investMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin inline" /> : "Confirm Investment"}
              </button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
