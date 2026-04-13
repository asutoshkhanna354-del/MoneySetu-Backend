import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { useGetBalance, useGetUserInvestments } from "@workspace/api-client-react";
import { LogOut, User, Phone, Copy, Shield, Activity, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, logout, isAdmin } = useAuth();
  const { data: balanceData } = useGetBalance();
  const { data: investments } = useGetUserInvestments();
  const { toast } = useToast();

  if (!user) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    toast({ title: "Copied!", description: "Referral code copied to clipboard." });
  };

  const activeInvCount = investments?.filter(i => i.status === "active").length || 0;
  const totalInvested = investments?.reduce((s, i) => s + parseFloat(i.amount?.toString() || "0"), 0) || 0;

  const statCard = (icon: React.ReactNode, label: string, value: string, color: string) => (
    <div className="rounded-2xl p-4" style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)" }}>
      <div className="flex items-center gap-1.5 mb-2" style={{ color: "var(--theme-t3)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {icon}{label}
      </div>
      <p className="text-xl font-black" style={{ color }}>{value}</p>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-5 pb-6">

        {/* Profile hero card with moving gradient */}
        <div className="relative rounded-3xl overflow-hidden p-6" style={{
          background: "linear-gradient(135deg, #1a0533, #0a0a0a, #0d0118)",
          backgroundSize: "300% 300%",
          animation: "gradRotate 8s ease infinite",
          border: "1px solid rgba(139,92,246,0.2)",
        }}>
          <div className="absolute top-0 right-0 w-48 h-48 aurora-blob" style={{ background: "radial-gradient(circle, rgba(109,40,217,0.25) 0%, transparent 70%)", filter: "blur(40px)" }} />
          <div className="relative z-10 flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #6d28d9, #a855f7)", boxShadow: "0 0 30px rgba(139,92,246,0.4)" }}
            >
              {(user.name || "U")[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{user.name}</h2>
              <p className="text-sm flex items-center gap-1.5 mt-1" style={{ color: "var(--theme-t3)" }}>
                <Phone className="w-3 h-3" /> {user.phone}
              </p>
              {isAdmin && (
                <div className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)", color: "#c4b5fd" }}>
                  <Shield className="w-3 h-3" /> Administrator
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {statCard(<Activity className="w-3.5 h-3.5" />, "Active Plans", String(activeInvCount), "#a855f7")}
          {statCard(<Calendar className="w-3.5 h-3.5" />, "Member Since", format(new Date(user.createdAt), "MMM yyyy"), "rgba(255,255,255,0.8)")}
          {statCard(<TrendingUp className="w-3.5 h-3.5" />, "Total Invested", `₹${totalInvested.toLocaleString("en-IN")}`, "#4ade80")}
          {statCard(<User className="w-3.5 h-3.5" />, "Wallet Balance", `₹${balanceData?.balance?.toFixed(2) || "0.00"}`, "#60a5fa")}
        </div>

        {/* Referral Code */}
        <div
          className="rounded-2xl p-5 flex items-center justify-between"
          style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}
        >
          <div>
            <p className="font-bold text-white text-sm">Your Referral Code</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--theme-t3)" }}>Share and earn bonuses on deposits</p>
          </div>
          <button
            onClick={copyCode}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono font-black text-sm transition-all hover:scale-105"
            style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.35)", color: "#c4b5fd" }}
          >
            {user.referralCode}
            <Copy className="w-4 h-4" />
          </button>
        </div>

        {/* Investment History */}
        <div>
          <h3 className="font-black text-white text-lg mb-3">Investment History</h3>
          {!investments || investments.length === 0 ? (
            <div className="text-center py-10 rounded-2xl" style={{ background: "var(--theme-card)", border: "1px dashed var(--theme-border)" }}>
              <p className="text-sm" style={{ color: "var(--theme-t4)" }}>No investments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {investments.map((inv) => (
                <div
                  key={inv.id}
                  className="rounded-2xl p-4 flex items-center justify-between"
                  style={{ background: "var(--theme-card)", border: "1px solid var(--theme-border)" }}
                >
                  <div>
                    <p className="font-bold text-white text-sm">{inv.planName}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--theme-t3)" }}>
                      {format(new Date(inv.startDate), "MMM d")} – {format(new Date(inv.endDate), "MMM d, yy")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-white text-sm">₹{parseFloat(inv.amount?.toString()).toLocaleString("en-IN")}</p>
                    <span
                      className="text-[10px] font-bold uppercase"
                      style={{ color: inv.status === "active" ? "#4ade80" : "rgba(255,255,255,0.3)" }}
                    >
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
        >
          <LogOut className="w-5 h-5" /> Sign Out
        </button>

      </div>
    </AppLayout>
  );
}
