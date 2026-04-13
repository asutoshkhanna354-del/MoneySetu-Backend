import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Users, Copy, Share2, Gift } from "lucide-react";
import { format } from "date-fns";

interface ReferralStats {
  referralCode: string;
  level1Count: number;
  level2Count: number;
  level3Count: number;
  totalTeam: number;
  totalCommissions: number;
  commissionsByLevel: { 1: number; 2: number; 3: number };
  recentCommissions: Array<{
    id: number;
    level: number;
    amount: number;
    sourceAmount: number;
    createdAt: string;
  }>;
}

export default function ReferralPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ev_token");
    fetch("/api/referrals/stats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const referralLink = stats
    ? `${window.location.origin}${import.meta.env.BASE_URL}register?ref=${stats.referralCode}`
    : "";

  const copyCode = () => {
    if (!stats) return;
    navigator.clipboard.writeText(stats.referralCode);
    toast({ title: "Referral code copied!" });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Referral link copied!" });
  };

  const share = () => {
    if (navigator.share) {
      navigator.share({
        title: "Join MoneySetu",
        text: `Use my referral code ${stats?.referralCode} and start earning up to 5% daily returns!`,
        url: referralLink,
      });
    } else {
      copyLink();
    }
  };

  const card = (children: React.ReactNode, extra?: React.CSSProperties) => (
    <div style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)", borderRadius: "20px", padding: "20px", ...extra }}>
      {children}
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-5 pb-6">

        {/* Hero with moving gradient */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-6"
          style={{
            background: "linear-gradient(135deg, #1a0533, #120025, #0a0a1a)",
            backgroundSize: "300% 300%",
            animation: "gradRotate 7s ease infinite",
            border: "1px solid rgba(139,92,246,0.25)",
          }}
        >
          <div className="absolute inset-0 aurora-blob" style={{ background: "radial-gradient(circle at 30% 50%, rgba(109,40,217,0.3) 0%, transparent 65%)", filter: "blur(40px)", borderRadius: 0 }} />
          <div className="absolute inset-0 aurora-blob" style={{ background: "radial-gradient(circle at 80% 30%, rgba(168,85,247,0.15) 0%, transparent 50%)", filter: "blur(30px)", borderRadius: 0, animation: "aurora2 9s ease-in-out infinite" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Gift className="w-5 h-5 text-purple-300" />
              <span className="text-xs font-bold uppercase tracking-widest text-purple-300">Refer & Earn</span>
            </div>
            <p className="text-sm mb-1" style={{ color: "var(--theme-t3)" }}>Total Referral Earnings</p>
            <h2 className="text-4xl font-black text-white mb-1">
              ₹{loading ? "..." : (stats?.totalCommissions?.toFixed(2) || "0.00")}
            </h2>
            <p className="text-xs" style={{ color: "var(--theme-t3)" }}>{stats?.totalTeam || 0} total team members</p>

            <div className="grid grid-cols-3 gap-3 mt-5 pt-5" style={{ borderTop: "1px solid var(--theme-border)" }}>
              {[
                { label: "Level 1 (5%)", value: loading ? "–" : String(stats?.level1Count || 0) },
                { label: "Level 2 (3%)", value: loading ? "–" : String(stats?.level2Count || 0) },
                { label: "Level 3 (1%)", value: loading ? "–" : String(stats?.level3Count || 0) },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--theme-t3)" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Referral Code */}
        {card(<>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--theme-t3)" }}>Your Referral Code</p>
          <div className="flex items-center justify-between rounded-xl px-4 py-3 mb-3" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)" }}>
            <span className="font-mono font-black text-purple-300 text-xl tracking-widest">
              {loading ? "..." : (stats?.referralCode || "—")}
            </span>
            <button onClick={copyCode} className="text-purple-400 hover:text-purple-300 transition-colors">
              <Copy className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={copyLink}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{ background: "var(--theme-card2)", border: "1px solid var(--theme-borderhi)", color: "var(--theme-t2)" }}
            >
              <Copy className="w-4 h-4" /> Copy Link
            </button>
            <button
              onClick={share}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #6d28d9, #a855f7)", boxShadow: "0 0 20px rgba(139,92,246,0.4)" }}
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </>)}

        {/* Commission Structure */}
        {card(<>
          <p className="text-sm font-black text-white mb-4">Commission Structure</p>
          <div className="space-y-3">
            {[
              { level: 1, label: "Direct Referral", pct: "5%", earned: stats?.commissionsByLevel?.[1] || 0, color: "#a855f7" },
              { level: 2, label: "Level 2 Team",    pct: "3%", earned: stats?.commissionsByLevel?.[2] || 0, color: "#818cf8" },
              { level: 3, label: "Level 3 Team",    pct: "1%", earned: stats?.commissionsByLevel?.[3] || 0, color: "#c084fc" },
            ].map((l) => (
              <div key={l.level} className="flex items-center justify-between py-3" style={{ borderBottom: l.level < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                    style={{ background: `${l.color}25`, border: `1px solid ${l.color}50`, color: l.color }}
                  >
                    L{l.level}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{l.label}</p>
                    <p className="text-xs" style={{ color: "var(--theme-t3)" }}>{l.pct} on each deposit</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black" style={{ color: l.color }}>₹{l.earned.toFixed(2)}</p>
                  <p className="text-[10px]" style={{ color: "var(--theme-t4)" }}>earned</p>
                </div>
              </div>
            ))}
          </div>
        </>)}

        {/* Team Size */}
        {card(<>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-black text-white">Your Team</p>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--theme-t3)" }}>
              <Users className="w-3.5 h-3.5" /> {stats?.totalTeam || 0} members
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Direct (L1)", value: stats?.level1Count || 0 },
              { label: "L2 Team", value: stats?.level2Count || 0 },
              { label: "L3 Team", value: stats?.level3Count || 0 },
            ].map((s) => (
              <div key={s.label} className="text-center rounded-xl py-3" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
                <p className="text-2xl font-black text-purple-400">{s.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--theme-t3)" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </>)}

        {/* Recent Commissions */}
        {stats?.recentCommissions && stats.recentCommissions.length > 0 && card(<>
          <p className="text-sm font-black text-white mb-3">Recent Commissions</p>
          <div className="space-y-1">
            {stats.recentCommissions.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between py-3" style={{ borderBottom: i < stats.recentCommissions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: "rgba(139,92,246,0.15)", color: "#a855f7" }}>
                    L{c.level}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Level {c.level} commission</p>
                    <p className="text-[10px]" style={{ color: "var(--theme-t3)" }}>From ₹{parseFloat(c.sourceAmount.toString()).toLocaleString("en-IN")} deposit</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-green-400">+₹{parseFloat(c.amount.toString()).toFixed(2)}</p>
                  <p className="text-[10px]" style={{ color: "var(--theme-t4)" }}>{format(new Date(c.createdAt), "MMM d")}</p>
                </div>
              </div>
            ))}
          </div>
        </>)}

        {/* How it works */}
        {card(<>
          <p className="text-sm font-black text-white mb-4">How to Earn</p>
          <div className="space-y-3">
            {[
              "Share your unique referral link or code",
              "Friend registers using your code",
              "Earn 5% instantly when they deposit",
              "Earn 3% & 1% from their network's deposits too!",
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #6d28d9, #a855f7)" }}>
                  {i + 1}
                </div>
                <p className="text-sm" style={{ color: "var(--theme-t2)" }}>{text}</p>
              </div>
            ))}
          </div>
        </>)}

      </div>
    </AppLayout>
  );
}
