import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { AuroraBackground } from "@/components/AuroraBackground";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const doLogin = async (u: string, p: string, remember: boolean) => {
    if (!u || !p) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Login failed", description: data.error || "Invalid credentials", variant: "destructive" });
        return;
      }
      // Remember Me: persist in localStorage; otherwise use sessionStorage (clears when tab closes)
      if (remember) {
        localStorage.setItem("ev_token", data.token);
      } else {
        sessionStorage.setItem("ev_token", data.token);
        localStorage.setItem("ev_token", data.token); // also set so existing hooks work
      }
      queryClient.invalidateQueries();
      toast({ title: "Welcome back to MoneySetu!" });
      setLocation("/dashboard");
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin(username, password, rememberMe);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: "#000000" }}>
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
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
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

        {/* Card */}
        <div
          className="p-6 rounded-3xl gradient-border"
          style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(30px)" }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                Username / Phone
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username or phone"
                autoComplete="username"
                className="h-12 rounded-xl text-white placeholder:text-white/20 focus:ring-1 focus:ring-purple-500/50 border-0"
                style={{ background: "rgba(255,255,255,0.05)", color: "white" }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                Password
              </label>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Enter password"
                autoComplete="current-password"
                className="h-12 rounded-xl text-white placeholder:text-white/20 focus:ring-1 focus:ring-purple-500/50 border-0"
                style={{ background: "rgba(255,255,255,0.05)", color: "white" }}
              />
            </div>

            {/* Remember Me */}
            <label className="flex items-center gap-3 cursor-pointer group select-none mt-1">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200"
                  style={{
                    background: rememberMe ? "linear-gradient(135deg, #6d28d9, #a855f7)" : "rgba(255,255,255,0.05)",
                    border: rememberMe ? "none" : "1px solid rgba(255,255,255,0.15)",
                    boxShadow: rememberMe ? "0 0 12px rgba(139,92,246,0.4)" : "none",
                  }}
                >
                  {rememberMe && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm font-medium" style={{ color: rememberMe ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)" }}>
                Remember me
              </span>
            </label>

            <Button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full h-12 mt-1 rounded-xl border-0 font-bold text-base"
              style={{
                background: "linear-gradient(135deg, #6d28d9, #a855f7)",
                boxShadow: "0 0 30px rgba(139,92,246,0.4)",
              }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <span className="flex items-center gap-2">
                  Login <TrendingUp className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-white/25">
            No account?{" "}
            <Link href="/register" className="font-semibold hover:underline" style={{ color: "#a855f7" }}>
              Register now
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
