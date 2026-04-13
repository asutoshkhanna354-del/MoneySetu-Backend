import { AppLayout } from "@/components/layout/AppLayout";
import { useGetUserInvestments, useGetBalance, useGetTransactions } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { differenceInDays, differenceInHours, addDays, format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, CheckCircle2, Lock, Loader2, TrendingUp, Calendar,
  Coins, ArrowUpRight, AlertCircle, ChevronDown, ChevronUp, CalendarClock,
  Banknote, X,
} from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

const PLAN_COLORS: Record<string, { glow: string; badge: string; border: string; bg: string; text: string }> = {
  silver:   { glow: "rgba(148,163,184,0.3)", badge: "rgba(148,163,184,0.15)", border: "rgba(148,163,184,0.25)", bg: "rgba(148,163,184,0.06)", text: "#94a3b8" },
  gold:     { glow: "rgba(251,191,36,0.3)",  badge: "rgba(251,191,36,0.15)",  border: "rgba(251,191,36,0.25)",  bg: "rgba(251,191,36,0.06)",  text: "#fbbf24" },
  platinum: { glow: "rgba(34,211,238,0.3)",  badge: "rgba(34,211,238,0.15)",  border: "rgba(34,211,238,0.25)",  bg: "rgba(34,211,238,0.06)",  text: "#22d3ee" },
  diamond:  { glow: "rgba(168,85,247,0.4)",  badge: "rgba(168,85,247,0.15)",  border: "rgba(168,85,247,0.3)",   bg: "rgba(168,85,247,0.06)",  text: "#a855f7" },
};

function getPlanColor(name: string) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("diamond")) return PLAN_COLORS.diamond;
  if (lower.includes("platinum")) return PLAN_COLORS.platinum;
  if (lower.includes("gold")) return PLAN_COLORS.gold;
  return PLAN_COLORS.silver;
}

function ProgressBar({ startDate, endDate }: { startDate: string; endDate: string }) {
  const total = new Date(endDate).getTime() - new Date(startDate).getTime();
  const elapsed = Date.now() - new Date(startDate).getTime();
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: "4px", background: "rgba(255,255,255,0.07)" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #6d28d9, #a855f7)" }} />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "white",
  borderRadius: "10px",
  padding: "10px 14px",
  width: "100%",
  fontSize: "14px",
  outline: "none",
};

function PartialWithdrawForm({
  inv, isOnCooldown, daysLeft, onSuccess,
}: {
  inv: any;
  isOnCooldown: boolean;
  daysLeft: number;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [phone, setPhone] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);

  const withdrawAmt = parseFloat(amount) || 0;
  const earnedSoFar = parseFloat(inv.totalEarned) || inv.totalEarned || 0;
  const maxAmt = Math.min(10000, earnedSoFar);
  const isAboveMax = withdrawAmt > maxAmt;
  const isBelowMin = withdrawAmt > 0 && withdrawAmt < 250;
  const noEarnings = earnedSoFar < 250;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNo.trim()) {
      toast({ title: "Account number required", description: "Enter your bank account number.", variant: "destructive" });
      return;
    }
    if (!ifsc.trim()) {
      toast({ title: "IFSC required", description: "Enter your bank IFSC code.", variant: "destructive" });
      return;
    }
    if (!phone.trim()) {
      toast({ title: "Phone required", description: "Enter your registered phone number.", variant: "destructive" });
      return;
    }
    if (!accountName.trim()) {
      toast({ title: "Account name required", description: "Enter the name on your bank account.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("ev_token");
      const res = await fetch(`/api/investments/${inv.id}/partial-withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: withdrawAmt, accountNo, ifsc, phone, accountName }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Failed", description: data.error, variant: "destructive" });
        return;
      }
      toast({
        title: "Withdrawal Submitted!",
        description: `₹${withdrawAmt.toFixed(2)} request sent. Remaining ₹${data.remainingPrincipal?.toFixed(2)} stays invested.`,
      });
      onSuccess();
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (isOnCooldown) {
    return (
      <div className="rounded-xl p-4 text-center" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
        <CalendarClock className="w-5 h-5 text-red-400 mx-auto mb-2" />
        <p className="text-sm font-bold text-red-400">Withdrawal Cooldown Active</p>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
          Next withdrawal available in <strong className="text-white">{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong>
        </p>
      </div>
    );
  }

  if (noEarnings) {
    return (
      <div className="rounded-xl p-4 text-center" style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.12)" }}>
        <TrendingUp className="w-5 h-5 mx-auto mb-2" style={{ color: "#4ade80" }} />
        <p className="text-sm font-bold" style={{ color: "#4ade80" }}>No Earnings to Withdraw Yet</p>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
          Daily earnings are credited every 24h. Come back tomorrow to withdraw.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Amount */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
          Withdraw from Earnings (₹250 – ₹{maxAmt.toLocaleString("en-IN")} earned)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-orange-400">₹</span>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0"
            min={250}
            max={maxAmt}
            style={{ ...inputStyle, paddingLeft: "28px", fontWeight: 700 }}
          />
        </div>
        {/* Quick amounts */}
        <div className="flex gap-1.5 mt-2">
          {[500, 1000, 5000].filter(a => a <= maxAmt).concat(maxAmt !== 500 && maxAmt !== 1000 && maxAmt !== 5000 ? [maxAmt] : []).map(a => (
            <button key={a} type="button"
              onClick={() => setAmount(String(a))}
              className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105"
              style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.15)", color: "#fb923c" }}
            >
              ₹{a >= 1000 ? `${a / 1000}K` : a}{a === maxAmt && a !== 5000 ? " (max)" : ""}
            </button>
          ))}
        </div>
        {isBelowMin && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Min ₹250</p>}
        {isAboveMax && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Max ₹{maxAmt.toLocaleString("en-IN")}</p>}
      </div>

      {/* Bank Account Details */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
          Bank Account Details
        </p>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>Account Number <span style={{ color: "#f87171" }}>*</span></label>
          <input type="text" value={accountNo} onChange={e => setAccountNo(e.target.value)} placeholder="e.g. 1234567890123456" style={inputStyle} />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>IFSC Code <span style={{ color: "#f87171" }}>*</span></label>
          <input type="text" value={ifsc} onChange={e => setIfsc(e.target.value.toUpperCase())} placeholder="e.g. SBIN0001234" style={inputStyle} />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>Phone Number <span style={{ color: "#f87171" }}>*</span></label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number" style={inputStyle} />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>Name on Account <span style={{ color: "#f87171" }}>*</span></label>
          <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="As printed on passbook" style={inputStyle} />
        </div>
      </div>

      {/* Info */}
      <div className="rounded-lg p-3" style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.12)" }}>
        <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
          • Only earned returns can be partially withdrawn (principal stays locked)<br />
          • Amount transferred to your bank within 24h<br />
          • Your plan continues earning after withdrawal<br />
          • No cooldown — withdraw anytime (unlimited)
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || !withdrawAmt || isBelowMin || isAboveMax}
        className="w-full py-3 rounded-xl text-sm font-black text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
        style={{ background: "linear-gradient(135deg, #c2410c, #f97316)", boxShadow: "0 0 20px rgba(249,115,22,0.3)" }}
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Processing…</>
          : <><ArrowUpRight className="w-4 h-4 inline mr-1" />Submit ₹{withdrawAmt > 0 ? withdrawAmt.toFixed(2) : "0"} Withdrawal</>}
      </button>
    </form>
  );
}

function EarningsWithdrawPanel({ totalEarned, onSuccess }: { totalEarned: number; onSuccess: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [phone, setPhone] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const withdrawAmt = parseFloat(amount) || 0;
  const isBelowMin = withdrawAmt > 0 && withdrawAmt < 250;
  const isAboveMax = withdrawAmt > totalEarned;
  const canSubmit = withdrawAmt >= 250 && !isAboveMax && accountNo && ifsc && phone && accountName;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("ev_token");
      const res = await apiFetch("/api/investments/withdraw-earnings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: withdrawAmt, accountNo, ifsc, phone, accountName }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Failed", description: data.error, variant: "destructive" }); return; }
      setSuccess(true);
      onSuccess();
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const quickAmounts = [500, 1000, 2000, 5000].filter(a => a <= totalEarned);
  if (totalEarned > 0 && !quickAmounts.includes(totalEarned)) quickAmounts.push(Math.floor(totalEarned));

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.2)", boxShadow: "0 0 24px rgba(74,222,128,0.06)" }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(74,222,128,0.15)" }}>
            <Banknote className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="font-black text-sm text-white">Withdraw Earnings</p>
            <p className="text-[11px]" style={{ color: "rgba(74,222,128,0.7)" }}>
              Available: <span className="font-black text-emerald-400">₹{totalEarned.toFixed(2)}</span>
            </p>
          </div>
        </div>
        {totalEarned >= 250 && !open && (
          <button
            onClick={() => { setOpen(true); setSuccess(false); setAmount(""); }}
            className="px-4 py-2 rounded-xl text-xs font-black text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg,#16a34a,#4ade80)", boxShadow: "0 0 16px rgba(74,222,128,0.3)" }}
          >
            Withdraw
          </button>
        )}
        {open && (
          <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
            <X className="w-4 h-4 text-white/50" />
          </button>
        )}
      </div>

      {/* Not enough earnings */}
      {!open && totalEarned < 250 && (
        <div className="px-5 pb-4">
          <div className="rounded-xl p-3 text-center" style={{ background: "rgba(0,0,0,0.3)" }}>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              {totalEarned === 0
                ? "Earnings will appear here after your first interest credit (24h)."
                : `₹${(250 - totalEarned).toFixed(2)} more needed to reach ₹250 minimum.`}
            </p>
          </div>
        </div>
      )}

      {/* Expanded form */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              <div className="h-px mb-4" style={{ background: "rgba(74,222,128,0.15)" }} />

              {success ? (
                <div className="text-center py-4 space-y-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(74,222,128,0.12)" }}>
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  </div>
                  <p className="font-black text-white">Withdrawal Submitted!</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>₹{withdrawAmt.toFixed(2)} request sent. You'll receive payment within 24h.</p>
                  <button onClick={() => { setOpen(false); setSuccess(false); }}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm text-white"
                    style={{ background: "linear-gradient(135deg,#16a34a,#4ade80)" }}>
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Amount */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest block mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Amount (₹250 – ₹{Math.floor(totalEarned).toLocaleString("en-IN")})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-emerald-400 text-lg">₹</span>
                      <input
                        type="number" value={amount} onChange={e => setAmount(e.target.value)}
                        placeholder="0" min={250} max={totalEarned}
                        className="w-full h-12 rounded-xl pl-8 pr-4 font-black text-lg text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${isBelowMin || isAboveMax ? "rgba(239,68,68,0.4)" : "rgba(74,222,128,0.2)"}` }}
                      />
                    </div>
                    {/* Quick amounts */}
                    {quickAmounts.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {quickAmounts.slice(0, 4).map(a => (
                          <button key={a} type="button" onClick={() => setAmount(String(a))}
                            className="flex-1 min-w-[60px] py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105"
                            style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)", color: "#4ade80" }}>
                            ₹{a >= 1000 ? `${(a/1000).toFixed(a%1000===0?0:1)}K` : a}
                          </button>
                        ))}
                        <button type="button" onClick={() => setAmount(totalEarned.toFixed(2))}
                          className="flex-1 min-w-[60px] py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105"
                          style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}>
                          Max
                        </button>
                      </div>
                    )}
                    {isBelowMin && <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Minimum ₹250</p>}
                    {isAboveMax && <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Exceeds available earnings</p>}
                  </div>

                  {/* Bank Details */}
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Bank Details</p>
                    {[
                      { label: "Account Number", value: accountNo, set: setAccountNo, placeholder: "e.g. 1234567890123456", type: "text" },
                      { label: "IFSC Code", value: ifsc, set: (v: string) => setIfsc(v.toUpperCase()), placeholder: "e.g. SBIN0001234", type: "text" },
                      { label: "Phone Number", value: phone, set: setPhone, placeholder: "10-digit mobile number", type: "tel" },
                      { label: "Name on Account", value: accountName, set: setAccountName, placeholder: "As printed on passbook", type: "text" },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: "rgba(255,255,255,0.25)" }}>{f.label} <span style={{ color: "#f87171" }}>*</span></label>
                        <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                          className="w-full h-10 rounded-xl px-3 text-sm text-white outline-none"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                      </div>
                    ))}
                  </div>

                  {/* Info note */}
                  <div className="rounded-xl p-3" style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.1)" }}>
                    <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
                      • Only your daily earned returns are withdrawn — your principal stays fully invested<br />
                      • Bank transfer processed within 24 hours of approval<br />
                      • Your plans continue earning after this withdrawal
                    </p>
                  </div>

                  <button type="submit" disabled={loading || !canSubmit}
                    className="w-full py-3 rounded-xl font-black text-sm text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
                    style={{ background: canSubmit ? "linear-gradient(135deg,#16a34a,#4ade80)" : "rgba(255,255,255,0.06)", boxShadow: canSubmit ? "0 0 24px rgba(74,222,128,0.3)" : "none" }}>
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : <><Banknote className="w-4 h-4" />Withdraw ₹{withdrawAmt > 0 ? withdrawAmt.toFixed(2) : "0"}</>}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Withdraw() {
  const { data: investments, isLoading } = useGetUserInvestments();
  const { data: balanceData } = useGetBalance();
  const { data: txData } = useGetTransactions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [expandedPartial, setExpandedPartial] = useState<number | null>(null);

  const active = (investments || []).filter(i => i.status === "active");
  const completed = (investments || []).filter(i => i.status === "completed");
  const totalEarnedFromActive = active.reduce((sum, inv) => sum + (parseFloat(String(inv.totalEarned)) || 0), 0);

  // Check 10-day cooldown
  const { isOnCooldown, cooldownDaysLeft } = useMemo(() => {
    if (!txData) return { isOnCooldown: false, cooldownDaysLeft: 0 };
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const last = txData.find(tx => tx.type === "withdrawal" && tx.status !== "rejected" && new Date(tx.createdAt) >= tenDaysAgo);
    if (!last) return { isOnCooldown: false, cooldownDaysLeft: 0 };
    const next = addDays(new Date(last.createdAt), 10);
    return { isOnCooldown: true, cooldownDaysLeft: Math.max(1, differenceInDays(next, new Date()) + 1) };
  }, [txData]);

  const handleRedeem = async (id: number, planName: string) => {
    setRedeeming(id);
    try {
      const token = localStorage.getItem("ev_token");
      const res = await fetch(`/api/investments/${id}/redeem`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Cannot Redeem", description: data.error, variant: "destructive" }); return; }
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/balance"] });
      toast({ title: `${planName} Redeemed!`, description: `₹${data.totalReturn?.toFixed(2)} credited to your wallet.` });
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setRedeeming(null);
    }
  };

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    setExpandedPartial(null);
  };

  return (
    <AppLayout>
      <div className="space-y-5 pb-6">

        {/* Header */}
        <div className="relative rounded-3xl overflow-hidden p-6" style={{
          background: "linear-gradient(135deg, #0a0a1a, #000000, #0a0a1a)",
          backgroundSize: "300% 300%",
          animation: "gradRotate 7s ease infinite",
          border: "1px solid rgba(139,92,246,0.2)",
        }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 70% 50%, rgba(139,92,246,0.12) 0%, transparent 60%)", pointerEvents: "none" }} />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", boxShadow: "0 0 20px rgba(139,92,246,0.3)" }}>
                <Coins className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">My Investments</h1>
                <p className="text-white/35 text-sm">Redeem matured · Partial withdraw from active</p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>Wallet</p>
              <p className="text-xl font-black text-white">₹{(balanceData?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* Earnings Summary */}
        {active.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(74,222,128,0.6)" }}>Total Earned</p>
                <p className="text-xl font-black" style={{ color: "#4ade80" }}>₹{totalEarnedFromActive.toFixed(2)}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>from active plans</p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(139,92,246,0.7)" }}>Total Earnings</p>
                <p className="text-xl font-black text-purple-400">₹{(balanceData?.totalEarnings || 0).toFixed(2)}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>all-time</p>
              </div>
            </div>

            {/* ── Earnings Withdrawal Section ── */}
            <EarningsWithdrawPanel
              totalEarned={totalEarnedFromActive}
              onSuccess={refreshAll}
            />
          </>
        )}

        {/* Empty */}
        {!isLoading && active.length === 0 && completed.length === 0 && (
          <div className="rounded-2xl p-12 text-center" style={{ background: "rgba(139,92,246,0.04)", border: "1px dashed rgba(139,92,246,0.2)" }}>
            <Wallet className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(139,92,246,0.3)" }} />
            <p className="font-bold text-white mb-2">No Active Investments</p>
            <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.35)" }}>Invest in a plan first to start earning daily returns.</p>
            <a href="/invest" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white"
              style={{ background: "linear-gradient(135deg, #6d28d9, #a855f7)", boxShadow: "0 0 20px rgba(139,92,246,0.3)" }}>
              Browse Plans →
            </a>
          </div>
        )}

        {/* Active plans */}
        {active.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>Active Plans ({active.length})</p>
            {active.map((inv, i) => {
              const c = getPlanColor(inv.planName);
              const matured = new Date() >= new Date(inv.endDate);
              const daysLeft = matured ? 0 : differenceInDays(new Date(inv.endDate), new Date());
              const hoursLeft = matured ? 0 : differenceInHours(new Date(inv.endDate), new Date()) % 24;
              const totalReturn = inv.amount + inv.totalEarned;
              const dailyEarn = inv.amount * inv.dailyReturnPercent / 100;
              const isExpanded = expandedPartial === inv.id;

              return (
                <motion.div key={inv.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: c.bg, border: `1px solid ${c.border}`, boxShadow: matured ? `0 0 24px ${c.glow}` : "none" }}
                >
                  <div className="p-5 space-y-4">
                    {/* Top */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg"
                          style={{ background: c.badge, color: c.text, boxShadow: `0 0 14px ${c.glow}` }}>
                          {inv.planName[0]}
                        </div>
                        <div>
                          <p className="font-black text-base text-white">{inv.planName}</p>
                          <p className="text-xs font-semibold" style={{ color: c.text }}>{inv.dailyReturnPercent}% daily · {inv.durationDays} days</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                        style={{ background: matured ? "rgba(34,197,94,0.15)" : c.badge, color: matured ? "#4ade80" : c.text, border: `1px solid ${matured ? "rgba(34,197,94,0.3)" : c.border}` }}>
                        {matured ? "✓ Matured" : "Active"}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.3)" }}>
                        <p className="text-[10px] font-bold uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>Invested</p>
                        <p className="font-black text-base text-white">₹{inv.amount.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.3)" }}>
                        <p className="text-[10px] font-bold uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>Earned</p>
                        <p className="font-black text-base" style={{ color: "#4ade80" }}>₹{inv.totalEarned.toFixed(2)}</p>
                      </div>
                      <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.3)" }}>
                        <p className="text-[10px] font-bold uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>On Redeem</p>
                        <p className="font-black text-base" style={{ color: c.text }}>₹{totalReturn.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-[10px] font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(inv.startDate), "dd MMM")}</span>
                        <span className="flex items-center gap-1">{format(new Date(inv.endDate), "dd MMM yyyy")}<Calendar className="w-3 h-3" /></span>
                      </div>
                      <ProgressBar startDate={inv.startDate} endDate={inv.endDate} />
                    </div>

                    {/* Actions */}
                    {matured ? (
                      <button onClick={() => handleRedeem(inv.id, inv.planName)} disabled={redeeming === inv.id}
                        className="w-full py-3.5 rounded-xl font-black text-sm text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
                        style={{ background: `linear-gradient(135deg, ${c.text}99, ${c.text})`, boxShadow: `0 0 24px ${c.glow}` }}>
                        {redeeming === inv.id
                          ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Processing…</>
                          : <><CheckCircle2 className="w-4 h-4 inline mr-2" />Redeem ₹{totalReturn.toFixed(2)} Now</>}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                            <Lock className="w-4 h-4" />
                            <span>Matures in <strong className="text-white">{daysLeft}d {hoursLeft}h</strong></span>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: c.text }}>
                            <TrendingUp className="w-3.5 h-3.5" />+₹{dailyEarn.toFixed(2)}/day
                          </div>
                        </div>

                        {/* Partial withdraw toggle */}
                        <button
                          onClick={() => setExpandedPartial(isExpanded ? null : inv.id)}
                          className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:scale-105"
                          style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", color: "#fb923c" }}
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          Partial Withdraw (up to ₹10,000)
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(249,115,22,0.12)" }}>
                                <p className="text-xs font-black" style={{ color: "#fb923c" }}>Partial Withdrawal Request</p>
                                <PartialWithdrawForm
                                  inv={inv}
                                  isOnCooldown={isOnCooldown}
                                  daysLeft={cooldownDaysLeft}
                                  onSuccess={refreshAll}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>Redeemed ({completed.length})</p>
            {completed.slice(0, 5).map(inv => {
              const c = getPlanColor(inv.planName);
              return (
                <div key={inv.id} className="rounded-2xl p-4 flex items-center justify-between opacity-45"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm" style={{ background: c.badge, color: c.text }}>
                      {inv.planName[0]}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{inv.planName}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Redeemed · ₹{inv.amount.toLocaleString("en-IN")} invested</p>
                    </div>
                  </div>
                  <span className="text-xs font-black" style={{ color: "#4ade80" }}>+₹{inv.totalEarned.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
