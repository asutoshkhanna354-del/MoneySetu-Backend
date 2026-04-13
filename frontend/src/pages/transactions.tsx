import { AppLayout } from "@/components/layout/AppLayout";
import { useGetTransactions } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, TrendingUp, Zap, Clock, Search, MessageSquare, Trash2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const FILTER_TABS = [
  { key: "all",        label: "All" },
  { key: "deposit",    label: "Deposits" },
  { key: "withdrawal", label: "Withdrawals" },
  { key: "investment", label: "Investments" },
  { key: "earning",    label: "Earnings" },
];

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  deposit:    { label: "Deposit",    color: "#60a5fa", bg: "rgba(59,130,246,0.15)",   icon: ArrowDownRight },
  withdrawal: { label: "Withdrawal", color: "#fb923c", bg: "rgba(249,115,22,0.15)",   icon: ArrowUpRight },
  earning:    { label: "Earning",    color: "#4ade80", bg: "rgba(74,222,128,0.15)",   icon: TrendingUp },
  investment: { label: "Investment", color: "#a855f7", bg: "rgba(168,85,247,0.15)",   icon: Zap },
  commission: { label: "Commission", color: "#c084fc", bg: "rgba(192,132,252,0.15)",  icon: Zap },
};

function parseNotes(raw: string) {
  const lines = (raw || "").split("\n").map(l => l.trim()).filter(Boolean);
  const adminLine = lines.find(l => l.startsWith("✅ Admin:") || l.startsWith("❌ Admin:"));
  const refLines  = lines.filter(l => !l.startsWith("✅ Admin:") && !l.startsWith("❌ Admin:"));
  return {
    ref: refLines.join(" • "),
    adminMsg: adminLine ? adminLine.replace(/^[✅❌] Admin:\s*/, "") : null,
    isApproved: adminLine ? adminLine.startsWith("✅") : null,
  };
}

export default function Transactions() {
  const { data: transactions, isLoading } = useGetTransactions();
  const [filter, setFilter] = useState("all");
  const [showConfirm, setShowConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleClear = async () => {
    setClearing(true);
    try {
      const token = localStorage.getItem("ev_token");
      const res = await fetch("/api/transactions/clear", {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setShowConfirm(false);
      const msg = data.kept > 0
        ? `History cleared. ${data.kept} pending transaction${data.kept > 1 ? "s" : ""} kept.`
        : "Transaction history cleared.";
      toast({ title: "Cleared", description: msg });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  const filtered = (transactions || []).filter(tx =>
    filter === "all" ? true : tx.type === filter
  );

  const pendingCount   = (transactions || []).filter(t => t.status === "pending").length;
  const depositTotal   = (transactions || []).filter(t => t.type === "deposit" && t.status === "approved").reduce((s, t) => s + parseFloat(t.amount?.toString() || "0"), 0);
  const withdrawTotal  = (transactions || []).filter(t => t.type === "withdrawal" && t.status === "approved").reduce((s, t) => s + parseFloat(t.amount?.toString() || "0"), 0);

  return (
    <AppLayout>
      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => !clearing && setShowConfirm(false)}>
          <div className="w-full max-w-md rounded-t-3xl p-6 space-y-4"
            style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(239,68,68,0.15)" }}>
                <AlertTriangle className="w-5 h-5" style={{ color: "#f87171" }} />
              </div>
              <div>
                <p className="text-base font-black text-white">Clear History?</p>
                <p className="text-xs" style={{ color: "var(--theme-t3)" }}>
                  Completed & rejected transactions will be deleted
                </p>
              </div>
            </div>
            <div className="rounded-xl p-3" style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.15)" }}>
              <p className="text-xs" style={{ color: "#fbbf24" }}>
                Pending transactions are kept safe and won't be deleted.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} disabled={clearing}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all"
                style={{ background: "var(--theme-card2)", color: "var(--theme-t2)", border: "1px solid var(--theme-border)" }}>
                Cancel
              </button>
              <button onClick={handleClear} disabled={clearing}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                style={{ background: "rgba(239,68,68,0.9)", color: "white" }}>
                {clearing ? (
                  <span className="animate-pulse">Clearing…</span>
                ) : (
                  <><Trash2 className="w-4 h-4" />Clear All</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5 pb-6">

        {/* Header */}
        <div className="relative rounded-3xl overflow-hidden p-6" style={{
          background: "linear-gradient(135deg, #0d0033, #000000, #12003a)",
          backgroundSize: "300% 300%",
          animation: "gradRotate 8s ease infinite",
          border: "1px solid rgba(139,92,246,0.15)",
        }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 20% 50%, rgba(109,40,217,0.2) 0%, transparent 60%)", pointerEvents: "none" }} />
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black text-white">My Transactions</h1>
                <p className="text-white/35 text-sm mt-1">{transactions?.length || 0} total · {pendingCount} pending</p>
              </div>
              {(transactions?.length || 0) > 0 && (
                <button onClick={() => setShowConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all hover:scale-105 active:scale-95"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">Clear</span>
                </button>
              )}
            </div>
            <div className="flex gap-5 mt-4">
              <div>
                <p className="text-[11px] font-semibold uppercase" style={{ color: "var(--theme-t3)" }}>Total Deposited</p>
                <p className="text-xl font-black text-blue-400">₹{depositTotal.toLocaleString("en-IN")}</p>
              </div>
              <div style={{ width: "1px", background: "var(--theme-card3)" }} />
              <div>
                <p className="text-[11px] font-semibold uppercase" style={{ color: "var(--theme-t3)" }}>Total Withdrawn</p>
                <p className="text-xl font-black text-orange-400">₹{withdrawTotal.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all hover:scale-105"
              style={filter === tab.key ? {
                background: "linear-gradient(135deg, #6d28d9, #a855f7)",
                color: "white",
                boxShadow: "0 0 16px rgba(139,92,246,0.4)",
              } : {
                background: "var(--theme-card2)",
                color: "var(--theme-t3)",
                border: "1px solid var(--theme-border)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-24 rounded-2xl shimmer" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 rounded-3xl" style={{ background: "var(--theme-card)", border: "1px dashed var(--theme-border)" }}>
            <Search className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--theme-t5)" }} />
            <p className="text-sm" style={{ color: "var(--theme-t3)" }}>No transactions found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((tx) => {
              const cfg    = TYPE_CONFIG[tx.type] || TYPE_CONFIG.earning;
              const Icon   = cfg.icon;
              const isCredit = ["deposit", "earning", "commission"].includes(tx.type);
              const { ref, adminMsg, isApproved } = parseNotes((tx as any).notes || "");
              const isPending    = tx.status === "pending";
              const isProcessing = tx.status === "processing";
              const isRejected   = tx.status === "rejected";
              const isCancelled  = tx.status === "cancelled";

              return (
                <div
                  key={tx.id}
                  className="rounded-2xl p-4 space-y-3"
                  style={{
                    background: "var(--theme-card)",
                    border: adminMsg
                      ? `1px solid ${isApproved ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)"}`
                      : isProcessing
                      ? "1px solid rgba(59,130,246,0.2)"
                      : isPending
                      ? "1px solid rgba(251,191,36,0.15)"
                      : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {/* Row 1 — type icon + label + amount + status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                        <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                      </div>
                      <div>
                        <p className="font-black text-base text-white">{cfg.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                            style={{
                              background: isProcessing ? "rgba(59,130,246,0.15)" :
                                          isPending    ? "rgba(251,191,36,0.15)" :
                                          isRejected   ? "rgba(239,68,68,0.15)" :
                                          isCancelled  ? "rgba(255,255,255,0.07)" : "rgba(74,222,128,0.15)",
                              color: isProcessing ? "#60a5fa" :
                                     isPending    ? "#fbbf24" :
                                     isRejected   ? "#f87171" :
                                     isCancelled  ? "rgba(255,255,255,0.35)" : "#4ade80",
                            }}>
                            {isProcessing ? "Processing…" : isCancelled ? "Cancelled" : tx.status}
                          </span>
                          {(tx as any).paymentMethod && (
                            <span className="text-[10px] font-semibold" style={{ color: "var(--theme-t4)" }}>
                              via {(tx as any).paymentMethod}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg" style={{ color: isCredit ? "#4ade80" : cfg.color }}>
                        {isCredit ? "+" : "-"}₹{parseFloat(tx.amount?.toString()).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--theme-t4)" }}>#{tx.id.toString().padStart(6, "0")}</p>
                    </div>
                  </div>

                  {/* UTR / Reference note */}
                  {ref && (
                    <div className="px-3 py-2 rounded-xl" style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)" }}>
                      <p className="text-[10px] font-bold uppercase mb-0.5" style={{ color: "var(--theme-t4)" }}>Reference / UTR</p>
                      <p className="text-xs font-mono" style={{ color: "var(--theme-t2)" }}>{ref}</p>
                    </div>
                  )}

                  {/* Admin message */}
                  {adminMsg && (
                    <div className="px-3 py-2.5 rounded-xl flex items-start gap-2.5"
                      style={{
                        background: isApproved ? "rgba(74,222,128,0.06)" : "rgba(239,68,68,0.07)",
                        border: `1px solid ${isApproved ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)"}`,
                      }}>
                      <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: isApproved ? "#4ade80" : "#f87171" }} />
                      <div>
                        <p className="text-[10px] font-black uppercase mb-0.5" style={{ color: isApproved ? "#4ade80" : "#f87171" }}>
                          {isApproved ? "Admin Approved" : "Admin Note"}
                        </p>
                        <p className="text-xs leading-relaxed" style={{ color: isApproved ? "#86efac" : "#fca5a5" }}>{adminMsg}</p>
                      </div>
                    </div>
                  )}

                  {/* Pending notice */}
                  {isPending && !adminMsg && (
                    <div className="px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.12)" }}>
                      <Clock className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                      <p className="text-xs" style={{ color: "#fbbf24" }}>Awaiting admin review — usually within a few hours.</p>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center gap-1" style={{ color: "var(--theme-t4)" }}>
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px]">{format(new Date(tx.createdAt), "MMM d, yyyy · h:mm a")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
