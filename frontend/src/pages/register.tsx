import { useState, useRef } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/apiFetch";
import { Loader2, UserPlus, Mail, ShieldCheck, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { AuroraBackground } from "@/components/AuroraBackground";

type Step = "form" | "otp";

export default function Register() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(params.get("ref") || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startResendTimer = () => {
    setResendTimer(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (!name || !phone || !email || !password) {
      toast({ title: "Missing fields", description: "Fill in all required fields first.", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Invalid email", description: "Enter a valid email address.", variant: "destructive" });
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      toast({ title: "Invalid phone", description: "Enter a valid 10-digit phone number.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), type: "register" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "OTP Sent!", description: `Verification code sent to ${email.trim().toLowerCase()}` });
      setStep("otp");
      startResendTimer();
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!otp || otp.length !== 6) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email: email.trim(), password, otp, referralCode: referralCode || undefined }),
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
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { background: "var(--theme-card2)", color: "var(--theme-t1)" };
  const inputCls = "h-11 rounded-xl text-white placeholder:text-white/20 focus:ring-1 focus:ring-purple-500/50 border-0";
  const labelCls = "text-xs font-semibold text-white/30 uppercase tracking-widest";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden py-10" style={{ background: "var(--theme-bg)" }}>
      <AuroraBackground />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm px-6"
      >
        <div className="flex justify-start mb-6">
          <Link href="/">
            <div className="flex items-center gap-2 text-sm font-medium cursor-pointer" style={{ color: "var(--theme-t3)" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Back to Home
            </div>
          </Link>
        </div>

        <div className="flex flex-col items-center mb-7">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
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

        <div className="p-6 rounded-3xl gradient-border" style={{ background: "var(--theme-card)", backdropFilter: "blur(30px)" }}>
          <AnimatePresence mode="wait">
            {step === "form" ? (
              <motion.div key="form-step" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className={labelCls}>Full Name</label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" className={inputCls} style={inputStyle} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Phone Number <span className="text-red-400">*</span></label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number" type="tel" className={inputCls} style={inputStyle} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Email Address <span className="text-red-400">*</span></label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email" className={inputCls} style={inputStyle} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Password</label>
                  <Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Create a strong password" className={inputCls} style={inputStyle} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>
                    Referral Code <span style={{ color: "var(--theme-t5)" }}>(optional)</span>
                  </label>
                  <Input value={referralCode} onChange={e => setReferralCode(e.target.value)} placeholder="Enter referral code" className={inputCls} style={inputStyle} />
                </div>
                <Button
                  onClick={handleSendOtp}
                  disabled={loading || !name || !phone || !email || !password}
                  className="w-full h-12 mt-1 rounded-xl border-0 font-bold text-base"
                  style={{ background: "linear-gradient(135deg, #6d28d9, #a855f7)", boxShadow: "0 0 30px rgba(139,92,246,0.4)" }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> Send OTP to Email</span>
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.div key="otp-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-bold text-white/60">Verify Your Email</span>
                </div>
                <p className="text-xs -mt-2" style={{ color: "var(--theme-t3)" }}>
                  OTP sent to <span style={{ color: "rgba(168,85,247,0.8)" }}>{email}</span>
                </p>
                <div className="space-y-1.5">
                  <label className={labelCls}>6-Digit OTP</label>
                  <Input
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={e => e.key === "Enter" && handleCreateAccount()}
                    placeholder="000000"
                    type="tel"
                    maxLength={6}
                    className={inputCls + " text-center text-2xl tracking-[0.4em] font-black h-14"}
                    style={inputStyle}
                  />
                </div>
                <Button
                  onClick={handleCreateAccount}
                  disabled={loading || otp.length !== 6}
                  className="w-full h-12 rounded-xl border-0 font-bold text-base"
                  style={{ background: "linear-gradient(135deg, #6d28d9, #a855f7)", boxShadow: "0 0 30px rgba(139,92,246,0.4)" }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <span className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Create Account</span>
                  )}
                </Button>
                <div className="flex items-center justify-between text-xs pt-1">
                  <button onClick={() => { setStep("form"); setOtp(""); }} className="text-white/30 hover:text-white/60 transition-colors">
                    ← Edit details
                  </button>
                  <button
                    onClick={resendTimer === 0 ? handleSendOtp : undefined}
                    disabled={resendTimer > 0 || loading}
                    className="flex items-center gap-1 font-semibold transition-colors"
                    style={{ color: resendTimer > 0 ? "rgba(255,255,255,0.2)" : "#a855f7" }}
                  >
                    <RefreshCw className="w-3 h-3" />
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-5 text-center text-sm text-white/25">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: "#a855f7" }}>Login here</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
