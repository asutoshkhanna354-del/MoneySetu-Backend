import { AppLayout } from "@/components/layout/AppLayout";
import { useGetUserInvestments } from "@workspace/api-client-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Banknote, CheckCircle2, AlertCircle, Loader2, TrendingUp, ArrowUpRight, IndianRupee,
} from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

export default function EarnWithdraw() {
  const { isDark } = useTheme();
  const { data: investments, isLoading } = useGetUserInvestments();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [phone, setPhone] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<number | null>(null);

  const active = (investments || []).filter(i => i.status === "active");
  const totalEarned = active.reduce((sum, inv) => sum + (parseFloat(String(inv.totalEarned)) || 0), 0);
  const effectiveMax = Math.min(totalEarned, 10000);
  const withdrawAmt = parseFloat(amount) || 0;
  const isAboveMax = withdrawAmt > effectiveMax;
  const canSubmit = withdrawAmt > 0 && !isAboveMax && accountNo.trim() && ifsc.trim() && phone.trim() && accountName.trim();

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
      setSuccess(withdrawAmt);
      queryClient.invalidateQueries();
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const reset = () => { setSuccess(null); setAmount(""); setAccountNo(""); setIfsc(""); setPhone(""); setAccountName(""); };

  const quickAmounts = [100, 500, 1000, 2000, 5000].filter(a => a <= effectiveMax);

  const heroStyle: React.CSSProperties = {
    background: isDark ? "linear-gradient(135deg, #052e16, #064e3b)" : "linear-gradient(135deg, #d1fae5, #a7f3d0)",
    border: isDark ? "1px solid rgba(74,222,128,0.2)" : "1px solid rgba(16,185,129,0.25)",
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto space-y-5 pb-10">

        {/* Header */}
        <div className="relative rounded-2xl overflow-hidden p-5" style={heroStyle}>
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(74,222,128,0.2)", width: 52, height: 52 }}>
              <Banknote className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: isDark ? "rgba(74,222,128,0.7)" : "#059669" }}>Earnings Withdrawal</p>
              <h1 className="text-xl font-black" style={{ color: isDark ? "#ffffff" : "#064e3b" }}>Withdraw Your Returns</h1>
              <p className="text-xs mt-0.5" style={{ color: isDark ? "rgba(255,255,255,0.45)" : "#065f46" }}>No minimum · Max ₹10,000 per request</p>
            </div>
          </div>
        </div>

        {/* Available Earnings Card */}
        <div className="rounded-2xl p-5 flex items-center justify-between" style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)" }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--theme-t3)" }}>Available to Withdraw</p>
            {isLoading
              ? <div className="h-9 w-32 rounded-lg animate-pulse" style={{ background: "var(--theme-card2)" }} />
              : <p className="text-4xl font-black" style={{ color: totalEarned > 0 ? "#4ade80" : "var(--theme-t3)" }}>
                  ₹{totalEarned.toFixed(2)}
                </p>
            }
            {totalEarned > 10000 && (
              <p className="text-xs mt-1 font-medium" style={{ color: "#fb923c" }}>Max ₹10,000 per request</p>
            )}
          </div>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)" }}>
            <TrendingUp className="w-7 h-7 text-emerald-400" />
          </div>
        </div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {success !== null ? (
            <motion.div key="success"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="rounded-2xl p-8 text-center" style={{ background: "var(--theme-card)", border: "1px solid rgba(74,222,128,0.2)" }}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(74,222,128,0.12)" }}>
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-black mb-2" style={{ color: "var(--theme-t1)" }}>Withdrawal Submitted!</h2>
              <p className="text-3xl font-black mb-1" style={{ color: "#4ade80" }}>₹{success.toFixed(2)}</p>
              <p className="text-sm mb-6" style={{ color: "var(--theme-t3)" }}>
                Your withdrawal request has been submitted.<br />Bank transfer within 24 hours.
              </p>
              <button onClick={reset}
                className="px-8 py-3 rounded-xl font-black text-sm text-white transition-all hover:scale-105 active:scale-95"
                style={{ background: "linear-gradient(135deg,#16a34a,#4ade80)", boxShadow: "0 4px 20px rgba(74,222,128,0.3)" }}>
                Withdraw Again
              </button>
            </motion.div>
          ) : totalEarned <= 0 && !isLoading ? (
            <motion.div key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-2xl p-10 text-center" style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)" }}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--theme-card2)" }}>
                <IndianRupee className="w-7 h-7" style={{ color: "var(--theme-t4)" }} />
              </div>
              <h2 className="text-lg font-black mb-2" style={{ color: "var(--theme-t2)" }}>No Earnings Yet</h2>
              <p className="text-sm" style={{ color: "var(--theme-t3)" }}>
                Daily returns are credited every 24 hours to your active investment plans.
              </p>
            </motion.div>
          ) : (
            <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleSubmit}
              className="rounded-2xl overflow-hidden" style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)" }}
            >
              {/* Section: Amount */}
              <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--theme-border)" }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--theme-t3)" }}>
                  Withdrawal Amount
                </p>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-emerald-400 text-xl">₹</span>
                  <input
                    type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="Enter amount" min={1} max={effectiveMax}
                    className="w-full rounded-xl pl-10 pr-4 font-black text-2xl outline-none"
                    style={{
                      height: 56, background: "var(--theme-card2)",
                      border: `1.5px solid ${isAboveMax ? "#ef4444" : amount && !isAboveMax ? "#4ade80" : "var(--theme-border)"}`,
                      color: "var(--theme-t1)", transition: "border-color 0.2s",
                    }}
                  />
                </div>

                {isAboveMax && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />Max you can withdraw: ₹{effectiveMax.toLocaleString("en-IN")}
                  </p>
                )}

                {quickAmounts.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {quickAmounts.map(a => (
                      <button key={a} type="button" onClick={() => setAmount(String(a))}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95"
                        style={{ background: parseFloat(amount) === a ? "rgba(74,222,128,0.2)" : "var(--theme-card2)", border: `1px solid ${parseFloat(amount) === a ? "rgba(74,222,128,0.4)" : "var(--theme-border)"}`, color: parseFloat(amount) === a ? "#4ade80" : "var(--theme-t3)" }}>
                        ₹{a >= 1000 ? `${a / 1000}K` : a}
                      </button>
                    ))}
                    <button type="button" onClick={() => setAmount(effectiveMax.toFixed(0))}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95"
                      style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", color: "#4ade80" }}>
                      Max ₹{effectiveMax >= 1000 ? `${(effectiveMax / 1000).toFixed(1)}K` : effectiveMax}
                    </button>
                  </div>
                )}
              </div>

              {/* Section: Bank Details */}
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--theme-border)" }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--theme-t3)" }}>Bank Details</p>
                <div className="space-y-3">
                  {([
                    { label: "Account Number", value: accountNo, set: setAccountNo, placeholder: "e.g. 1234567890123456", type: "text" },
                    { label: "IFSC Code", value: ifsc, set: (v: string) => setIfsc(v.toUpperCase()), placeholder: "e.g. SBIN0001234", type: "text" },
                    { label: "Phone Number", value: phone, set: setPhone, placeholder: "10-digit mobile number", type: "tel" },
                    { label: "Account Holder Name", value: accountName, set: setAccountName, placeholder: "As printed on passbook", type: "text" },
                  ] as const).map(f => (
                    <div key={f.label}>
                      <label className="text-xs font-semibold block mb-1" style={{ color: "var(--theme-t4)" }}>
                        {f.label} <span style={{ color: "#f87171" }}>*</span>
                      </label>
                      <input
                        type={f.type as string} value={f.value}
                        onChange={e => (f.set as (v: string) => void)(e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full h-11 rounded-xl px-3.5 text-sm outline-none transition-colors"
                        style={{ background: "var(--theme-card2)", border: "1px solid var(--theme-border)", color: "var(--theme-t1)" }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Section: Info + Submit */}
              <div className="p-5 space-y-4">
                <div className="rounded-xl p-3.5" style={{ background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.12)" }}>
                  <p className="text-[11px] leading-5" style={{ color: "var(--theme-t3)" }}>
                    • Funds transferred to your bank account within 24 hours<br />
                    • Maximum ₹10,000 per withdrawal request<br />
                    • No minimum — withdraw any amount you've earned<br />
                    • Your investment continues earning after withdrawal
                  </p>
                </div>

                <button type="submit" disabled={loading || !canSubmit}
                  className="w-full py-4 rounded-xl font-black text-base text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  style={{
                    background: canSubmit ? "linear-gradient(135deg,#16a34a,#4ade80)" : "var(--theme-card2)",
                    boxShadow: canSubmit ? "0 4px 24px rgba(74,222,128,0.35)" : "none",
                  }}>
                  {loading
                    ? <><Loader2 className="w-5 h-5 animate-spin" />Processing…</>
                    : <><ArrowUpRight className="w-5 h-5" />Withdraw {withdrawAmt > 0 ? `₹${withdrawAmt.toFixed(2)}` : "Earnings"}</>}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
