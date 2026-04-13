import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/apiFetch";
import { Loader2, Mail, Lock, ShieldCheck, Eye, EyeOff, KeyRound, RefreshCw, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { AuroraBackground } from "@/components/AuroraBackground";

type Mode = "user" | "admin" | "forgot";
type ForgotStep = "email" | "otp" | "newpass" | "done";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── User / Admin login
  const [mode, setMode] = useState<Mode>("user");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Forgot password
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailHint, setForgotEmailHint] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const startResendTimer = () => {
    setResendTimer(30);
    const iv = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(iv); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const inputCls = "h-12 rounded-xl text-white placeholder:text-white/20 focus:ring-1 focus:ring-purple-500/50 border-0";
  const inputStyle = { background: "var(--theme-card2)", color: "var(--theme-t1)" };
  const labelCls = "text-xs font-semibold text-white/30 uppercase tracking-widest";

  // ── Handle user login (email/phone + password)
  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: identifier.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Login failed", description: data.error || "Invalid credentials", variant: "destructive" });
        return;
      }
      localStorage.setItem("ev_token", data.token);
      queryClient.invalidateQueries();
      toast({ title: "Welcome back!", description: `Hello, ${data.user?.name || "Investor"} 👋` });
      setLocation("/dashboard");
    } catch {
      toast({ title: "Network error", description: "Could not reach server.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Handle admin login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: identifier.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Login failed", description: data.error || "Invalid credentials", variant: "destructive" });
        return;
      }
      localStorage.setItem("ev_token", data.token);
      queryClient.invalidateQueries();
      toast({ title: "Logged in as Admin" });
      setLocation("/dashboard");
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot: step 1 — request OTP
  const handleForgotRequest = async () => {
    if (!forgotEmail.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim(), type: "forgot" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      setForgotEmailHint(data.emailHint || forgotEmail.trim());
      setForgotStep("otp");
      startResendTimer();
      toast({ title: "OTP sent!", description: "Check your inbox for the reset code." });
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot: step 2 — verify OTP then show new password step
  const handleForgotOtp = () => {
    if (forgotOtp.length !== 6) return;
    setForgotStep("newpass");
  };

  // ── Forgot: step 3 — reset password
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmailHint, otp: forgotOtp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        if (data.error?.includes("OTP")) setForgotStep("otp");
        return;
      }
      setForgotStep("done");
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const switchToLogin = () => {
    setMode("user");
    setIdentifier("");
    setPassword("");
    setForgotStep("email");
    setForgotEmail("");
    setForgotOtp("");
    setNewPassword("");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: "var(--theme-bg)" }}>
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

        <div className="flex flex-col items-center mb-8">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
            className="w-20 h-20 rounded-full overflow-hidden mb-5"
            style={{ boxShadow: "0 0 40px rgba(139,92,246,0.5), 0 0 80px rgba(139,92,246,0.2)" }}
          >
            <img src="/logo.png" alt="MoneySetu" className="w-full h-full object-cover" />
          </motion.div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Money<span className="gradient-text">Setu</span>
          </h1>
          <p className="text-white/30 mt-2 text-sm">India's smart investment platform</p>
        </div>

        <div className="p-6 rounded-3xl gradient-border" style={{ background: "var(--theme-card)", backdropFilter: "blur(30px)" }}>
          <AnimatePresence mode="wait">

            {/* ── USER LOGIN ── */}
            {mode === "user" && (
              <motion.form key="user" onSubmit={handleUserLogin} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-bold text-white/60">Login to your account</span>
                </div>

                <div className="space-y-1.5">
                  <label className={labelCls}>Email or Phone</label>
                  <Input
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="your@email.com or 9876543210"
                    autoComplete="email"
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelCls}>Password</label>
                  <div className="relative">
                    <Input
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      type={showPass ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className={inputCls + " pr-10"}
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Forgot password link */}
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setForgotEmail(identifier.includes("@") ? identifier : ""); }}
                    className="text-xs font-semibold transition-colors"
                    style={{ color: "#a855f7" }}
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !identifier || !password}
                  className="w-full h-12 rounded-xl border-0 font-bold text-base"
                  style={{ background: "linear-gradient(135deg, #6d28d9, #a855f7)", boxShadow: "0 0 30px rgba(139,92,246,0.4)" }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> Login</span>
                  )}
                </Button>
              </motion.form>
            )}

            {/* ── ADMIN LOGIN ── */}
            {mode === "admin" && (
              <motion.form key="admin" onSubmit={handleAdminLogin} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-bold text-white/60">Admin Login</span>
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Username</label>
                  <Input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="admin" autoComplete="username" className={inputCls} style={inputStyle} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Password</label>
                  <div className="relative">
                    <Input
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      type={showPass ? "text" : "password"}
                      placeholder="Enter password"
                      autoComplete="current-password"
                      className={inputCls + " pr-10"}
                      style={inputStyle}
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading || !identifier || !password}
                  className="w-full h-12 rounded-xl border-0 font-bold text-base"
                  style={{ background: "linear-gradient(135deg, #b45309, #d97706)", boxShadow: "0 0 24px rgba(217,119,6,0.35)" }}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Login as Admin"}
                </Button>
              </motion.form>
            )}

            {/* ── FORGOT PASSWORD ── */}
            {mode === "forgot" && (
              <motion.div key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <KeyRound className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold text-white/60">Reset Password</span>
                </div>

                <AnimatePresence mode="wait">
                  {/* Step 1: Email */}
                  {forgotStep === "email" && (
                    <motion.div key="f-email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <p className="text-xs" style={{ color: "var(--theme-t3)" }}>Enter your registered email to receive a reset code.</p>
                      <div className="space-y-1.5">
                        <label className={labelCls}>Email Address</label>
                        <Input
                          value={forgotEmail}
                          onChange={e => setForgotEmail(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleForgotRequest()}
                          placeholder="your@email.com"
                          type="email"
                          className={inputCls}
                          style={inputStyle}
                        />
                      </div>
                      <Button onClick={handleForgotRequest} disabled={loading || !forgotEmail.trim()}
                        className="w-full h-12 rounded-xl border-0 font-bold text-base"
                        style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", boxShadow: "0 0 24px rgba(59,130,246,0.3)" }}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                          <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> Send Reset Code</span>
                        )}
                      </Button>
                    </motion.div>
                  )}

                  {/* Step 2: OTP */}
                  {forgotStep === "otp" && (
                    <motion.div key="f-otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <p className="text-xs" style={{ color: "var(--theme-t3)" }}>
                        OTP sent to <span style={{ color: "#a855f7" }}>{forgotEmailHint}</span>
                      </p>
                      <div className="space-y-1.5">
                        <label className={labelCls}>6-Digit Code</label>
                        <Input
                          value={forgotOtp}
                          onChange={e => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          onKeyDown={e => e.key === "Enter" && handleForgotOtp()}
                          placeholder="000000"
                          type="tel"
                          maxLength={6}
                          className={inputCls + " text-center text-2xl tracking-[0.4em] font-black"}
                          style={inputStyle}
                        />
                      </div>
                      <Button onClick={handleForgotOtp} disabled={forgotOtp.length !== 6}
                        className="w-full h-12 rounded-xl border-0 font-bold text-base"
                        style={{ background: "linear-gradient(135deg, #6d28d9, #a855f7)", boxShadow: "0 0 30px rgba(139,92,246,0.4)" }}>
                        <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Verify Code</span>
                      </Button>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <button onClick={() => setForgotStep("email")} className="text-white/30 hover:text-white/60 transition-colors">← Change email</button>
                        <button
                          onClick={resendTimer === 0 ? handleForgotRequest : undefined}
                          disabled={resendTimer > 0 || loading}
                          className="flex items-center gap-1 font-semibold transition-colors"
                          style={{ color: resendTimer > 0 ? "rgba(255,255,255,0.2)" : "#a855f7" }}
                        >
                          <RefreshCw className="w-3 h-3" />
                          {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: New password */}
                  {forgotStep === "newpass" && (
                    <motion.div key="f-newpass" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <p className="text-xs" style={{ color: "var(--theme-t3)" }}>Create a new password for your account.</p>
                      <div className="space-y-1.5">
                        <label className={labelCls}>New Password</label>
                        <div className="relative">
                          <Input
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            type={showNewPass ? "text" : "password"}
                            placeholder="Min. 6 characters"
                            className={inputCls + " pr-10"}
                            style={inputStyle}
                          />
                          <button type="button" onClick={() => setShowNewPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                            {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <Button onClick={handleResetPassword} disabled={loading || newPassword.length < 6}
                        className="w-full h-12 rounded-xl border-0 font-bold text-base"
                        style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 0 24px rgba(16,185,129,0.3)" }}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                          <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> Set New Password</span>
                        )}
                      </Button>
                    </motion.div>
                  )}

                  {/* Step 4: Done */}
                  {forgotStep === "done" && (
                    <motion.div key="f-done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-2">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(16,185,129,0.15)" }}>
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-lg">Password Reset!</p>
                        <p className="text-xs mt-1" style={{ color: "var(--theme-t3)" }}>Your password has been updated successfully.</p>
                      </div>
                      <Button onClick={switchToLogin} className="w-full h-11 rounded-xl border-0 font-bold"
                        style={{ background: "linear-gradient(135deg, #6d28d9, #a855f7)" }}>
                        Login Now
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom links */}
          {mode !== "forgot" && (
            <div className="mt-5 flex flex-col items-center gap-2">
              <p className="text-center text-sm text-white/25">
                No account?{" "}
                <Link href="/register" className="font-semibold hover:underline" style={{ color: "#a855f7" }}>Register now</Link>
              </p>
              <button
                onClick={() => { setMode(m => m === "admin" ? "user" : "admin"); setIdentifier(""); setPassword(""); }}
                className="text-xs text-white/20 hover:text-white/40 transition-colors"
              >
                {mode === "user" ? "Admin? Login here →" : "← Back to user login"}
              </button>
            </div>
          )}
          {mode === "forgot" && forgotStep !== "done" && (
            <div className="mt-5 text-center">
              <button onClick={switchToLogin} className="text-xs text-white/20 hover:text-white/40 transition-colors">
                ← Back to login
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
