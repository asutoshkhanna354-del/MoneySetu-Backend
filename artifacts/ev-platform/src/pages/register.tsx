import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { AuroraBackground } from "@/components/AuroraBackground";

export default function Register() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(params.get("ref") || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !password) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password, referralCode: referralCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Registration failed", description: data.error || "Could not create account.", variant: "destructive" });
        return;
      }
      localStorage.setItem("ev_token", data.token);
      queryClient.invalidateQueries();
      toast({ title: "Welcome to MoneySetu!", description: "Your account is ready." });
      setLocation("/dashboard");
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { background: "rgba(255,255,255,0.05)", color: "white" };
  const labelStyle = "text-xs font-semibold text-white/30 uppercase tracking-widest";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden py-10" style={{ background: "#000000" }}>
      <AuroraBackground />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm px-6"
      >
        {/* Back to home */}
        <div className="flex justify-start mb-6">
          <Link href="/">
            <div
              className="flex items-center gap-2 text-sm font-medium cursor-pointer transition-all hover:scale-105"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </div>
          </Link>
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
            className="w-16 h-16 rounded-full overflow-hidden mb-4"
            style={{ boxShadow: "0 0 30px rgba(139,92,246,0.5), 0 0 60px rgba(139,92,246,0.2)" }}
          >
            <img src="/logo.png" alt="MoneySetu" className="w-full h-full object-cover" />
          </motion.div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Join Money<span className="gradient-text">Setu</span>
          </h1>
          <p className="text-white/30 text-sm mt-1">Start earning up to 5% daily returns</p>
        </div>

        {/* Card */}
        <div
          className="p-6 rounded-3xl gradient-border"
          style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(30px)" }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className={labelStyle}>Full Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="h-11 rounded-xl text-white placeholder:text-white/20 focus:ring-1 focus:ring-purple-500/50 border-0"
                style={inputStyle}
              />
            </div>

            <div className="space-y-1.5">
              <label className={labelStyle}>Phone Number</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                type="tel"
                className="h-11 rounded-xl text-white placeholder:text-white/20 focus:ring-1 focus:ring-purple-500/50 border-0"
                style={inputStyle}
              />
            </div>

            <div className="space-y-1.5">
              <label className={labelStyle}>Password</label>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Create a strong password"
                className="h-11 rounded-xl text-white placeholder:text-white/20 focus:ring-1 focus:ring-purple-500/50 border-0"
                style={inputStyle}
              />
            </div>

            <div className="space-y-1.5">
              <label className={labelStyle}>
                Referral Code <span style={{ color: "rgba(255,255,255,0.15)" }}>(optional)</span>
              </label>
              <Input
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="Enter referral code"
                className="h-11 rounded-xl text-white placeholder:text-white/20 focus:ring-1 focus:ring-purple-500/50 border-0"
                style={inputStyle}
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !name || !phone || !password}
              className="w-full h-12 mt-2 rounded-xl border-0 font-bold text-base"
              style={{
                background: "linear-gradient(135deg, #6d28d9, #a855f7)",
                boxShadow: "0 0 30px rgba(139,92,246,0.4)",
              }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <span className="flex items-center gap-2">Create Account <UserPlus className="w-4 h-4" /></span>
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-white/25">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: "#a855f7" }}>
              Login here
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
