import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  TrendingUp, Shield, Users, Zap, ArrowRight, Calculator,
  Star, CheckCircle, ArrowUpRight, ArrowDownLeft, Menu, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/AuroraBackground";
import { WaveDivider } from "@/components/WaveDivider";

/* ─── Data ───────────────────────────────────────── */
const CITIES = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune", "Kolkata", "Jaipur", "Surat", "Bhopal"];
const NAMES  = ["Rahul S.", "Priya M.", "Arun K.", "Sunita D.", "Vikram J.", "Deepa R.", "Nikhil P.", "Ananya B.", "Rohit G.", "Kavya T."];
function ri<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function ra(min: number, max: number) { return Math.floor(Math.random() * (max - min) + min) * 100; }

interface Activity { id: number; name: string; city: string; type: "deposit" | "withdrawal" | "earning"; amount: number; }
let ticker = 0;
function mkActivity(): Activity {
  return { id: ++ticker, name: ri(NAMES), city: ri(CITIES), type: ri(["deposit","withdrawal","earning"] as const), amount: ra(5, 1200) };
}

const PLANS = [
  { name: "Bronze",   daily: 1, duration: 15,  min: 100,    color: "#cd7f32", glow: "rgba(205,127,50,0.3)"  },
  { name: "Silver",   daily: 2, duration: 30,  min: 5000,   color: "#94a3b8", glow: "rgba(148,163,184,0.3)" },
  { name: "Gold",     daily: 3, duration: 60,  min: 10000,  color: "#f59e0b", glow: "rgba(245,158,11,0.3)"  },
  { name: "Platinum", daily: 4, duration: 90,  min: 50000,  color: "#06b6d4", glow: "rgba(6,182,212,0.3)"   },
  { name: "Diamond",  daily: 5, duration: 180, min: 200000, color: "#a855f7", glow: "rgba(168,85,247,0.4)"  },
];

/* ─── Particles ──────────────────────────────────── */
function Particles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 15 + 10,
    delay: Math.random() * 10,
    opacity: Math.random() * 0.4 + 0.1,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            bottom: "-10px",
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: `rgba(168,85,247,${p.opacity})`,
            animation: `particleFloat ${p.duration}s ${p.delay}s ease-in-out infinite`,
            boxShadow: `0 0 ${p.size * 3}px rgba(168,85,247,${p.opacity * 2})`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Stat Counter ───────────────────────────────── */
function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center oled-card gradient-border rounded-2xl px-6 py-5">
      <p className="text-2xl font-black gradient-text mb-1">{value}</p>
      <p className="text-xs text-white/40 font-medium">{label}</p>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────── */
export default function Landing() {
  const [activities, setActivities] = useState<Activity[]>(() => Array.from({ length: 6 }, mkActivity));
  const [calcAmount, setCalcAmount] = useState(50000);
  const [calcPlan, setCalcPlan] = useState(PLANS[2]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  // Start fading only after 250px scroll, fully gone at 900px — gives much more room on iOS
  const heroOpacity = useTransform(scrollY, [250, 900], [1, 0]);
  const heroY = useTransform(scrollY, [0, 900], [0, 80]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActivities(prev => [mkActivity(), ...prev.slice(0, 8)]);
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  const dailyReturn  = (calcAmount * calcPlan.daily) / 100;
  const totalProfit  = dailyReturn * calcPlan.duration;
  const totalReturn  = calcAmount + totalProfit;
  const formatINR    = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen" style={{ background: "#000000", color: "#ffffff" }}>

      {/* ── Sticky Header ─────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="MoneySetu" className="w-9 h-9 rounded-full object-cover" style={{ boxShadow: "0 0 16px rgba(139,92,246,0.4)" }} />
            <span className="font-black text-xl tracking-tight">Money<span className="gradient-text">Setu</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/50">
            <a href="#plans" className="hover:text-white transition-colors">Plans</a>
            <a href="#calculator" className="hover:text-white transition-colors">Calculator</a>
            <a href="#referral" className="hover:text-white transition-colors">Referral</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:flex text-white/50 hover:text-white hover:bg-white/5 rounded-xl border-0">Login</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="rounded-xl border-0 font-bold px-5" style={{
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                boxShadow: "0 0 20px rgba(139,92,246,0.45)",
              }}>
                Join Free
              </Button>
            </Link>
            <button className="md:hidden text-white/50 hover:text-white transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div style={{ background: "rgba(0,0,0,0.95)", borderTop: "1px solid rgba(255,255,255,0.05)" }} className="px-4 py-3 space-y-2">
            <Link href="/login"><div className="py-2 text-sm text-white/50" onClick={() => setMobileMenuOpen(false)}>Login</div></Link>
            <Link href="/register"><div className="py-2 text-sm font-bold text-purple-400" onClick={() => setMobileMenuOpen(false)}>Register →</div></Link>
          </div>
        )}
      </header>

      {/* ── HERO ──────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        <AuroraBackground />
        <Particles />

        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full py-16"
        >
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Left */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-7"
                style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#c4b5fd" }}
              >
                <Star className="w-3 h-3 fill-violet-400 text-violet-400" />
                India's #1 Smart Investment Platform
              </motion.div>

              <h1 className="text-6xl lg:text-7xl font-black leading-none mb-6">
                <span className="block text-white">Grow Your</span>
                <span className="block text-white">Money</span>
                <span className="block gradient-text neon-purple" style={{ lineHeight: 1.1 }}>Up to 5% Daily</span>
              </h1>

              <p className="text-lg text-white/40 mb-9 max-w-md leading-relaxed">
                Join 2.4 lakh Indians earning guaranteed daily returns. Transparent plans, instant payouts, zero hidden fees.
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                <Link href="/register">
                  <Button
                    className="h-14 px-8 rounded-2xl border-0 text-base font-bold"
                    style={{
                      background: "linear-gradient(135deg, #6d28d9, #7c3aed, #a855f7)",
                      boxShadow: "0 0 40px rgba(139,92,246,0.5), 0 4px 24px rgba(0,0,0,0.5)",
                    }}
                  >
                    Start Investing <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="h-14 px-8 rounded-2xl font-semibold text-white"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    Login
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap gap-5 text-sm text-white/30">
                {["No hidden fees", "Instant withdrawal", "3-level referral bonus"].map(t => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-purple-500" /> {t}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Right: Stats + Live Ticker */}
            <motion.div
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-3 gap-3">
                <StatCard value="2.4L+" label="Active Investors" />
                <StatCard value="₹48Cr+" label="Paid Out" />
                <StatCard value="Up to 5%" label="Daily Returns" />
              </div>

              {/* Live ticker card */}
              <div
                className="rounded-2xl overflow-hidden gradient-border"
                style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(20px)" }}
              >
                <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span className="w-2 h-2 rounded-full bg-green-400 live-dot" />
                  <span className="text-xs font-semibold text-white/60">Live Platform Activity</span>
                  <span className="ml-auto text-[10px] text-white/20 font-mono">LIVE</span>
                </div>
                <div style={{ maxHeight: "280px", overflow: "hidden" }}>
                  <AnimatePresence initial={false}>
                    {activities.slice(0, 6).map((a) => (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: -32, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="flex items-center justify-between px-4 py-3"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              background: a.type === "deposit" ? "rgba(59,130,246,0.15)" :
                                          a.type === "withdrawal" ? "rgba(249,115,22,0.15)" :
                                          "rgba(74,222,128,0.15)",
                            }}
                          >
                            {a.type === "deposit" ? <ArrowDownLeft className="w-3.5 h-3.5 text-blue-400" /> :
                             a.type === "withdrawal" ? <ArrowUpRight className="w-3.5 h-3.5 text-orange-400" /> :
                             <TrendingUp className="w-3.5 h-3.5 text-green-400" />}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white/80">{a.name}</p>
                            <p className="text-[10px] text-white/30">{a.city}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold" style={{
                            color: a.type === "deposit" ? "#60a5fa" :
                                   a.type === "withdrawal" ? "#fb923c" : "#4ade80",
                          }}>
                            {a.type === "withdrawal" ? "-" : "+"}₹{a.amount.toLocaleString("en-IN")}
                          </p>
                          <p className="text-[10px] text-white/20 capitalize">{a.type}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <WaveDivider fill="#050505" />
        </div>
      </section>

      {/* ── Investment Plans ─────────────────────────── */}
      <section id="plans" style={{ background: "#050505", paddingTop: "80px" }} className="pb-0 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-xs font-bold tracking-widest text-purple-500 mb-3 uppercase">Investment Plans</p>
            <h2 className="text-4xl font-black text-white mb-3">Choose Your Growth Path</h2>
            <p className="text-white/30 text-lg">Higher investment, higher daily returns</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 pb-0">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="float-slow"
                style={{ animationDelay: `${i * 1.5}s` }}
              >
                <div
                  className="rounded-2xl p-px relative overflow-hidden h-full"
                  style={{
                    background: `linear-gradient(135deg, ${plan.glow.replace("0.3","0.6")}, rgba(255,255,255,0.05), ${plan.glow.replace("0.3","0.4")})`,
                  }}
                >
                  <div
                    className="rounded-[14px] p-7 h-full flex flex-col"
                    style={{ background: "#0a0a0a" }}
                  >
                    <div className="mb-4">
                      <span
                        className="text-5xl font-black"
                        style={{ color: plan.color, textShadow: `0 0 30px ${plan.glow}` }}
                      >
                        {plan.daily}%
                      </span>
                      <span className="text-white/30 text-sm ml-1">/day</span>
                    </div>
                    <p className="text-xl font-bold text-white mb-4">{plan.name}</p>
                    <div className="space-y-2 text-sm flex-1 mb-6">
                      <div className="flex justify-between">
                        <span className="text-white/30">Min. Invest</span>
                        <span className="text-white/80 font-semibold">₹{plan.min.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/30">Duration</span>
                        <span className="text-white/80 font-semibold">{plan.duration} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/30">Total Profit</span>
                        <span className="font-bold" style={{ color: plan.color }}>~{plan.daily * plan.duration}%</span>
                      </div>
                    </div>
                    <Link href="/register">
                      <button
                        className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:scale-105"
                        style={{
                          background: `linear-gradient(135deg, ${plan.color}22, ${plan.color}44)`,
                          border: `1px solid ${plan.glow}`,
                          color: plan.color,
                          boxShadow: `0 0 20px ${plan.glow}`,
                        }}
                      >
                        Invest in {plan.name}
                      </button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <WaveDivider fill="#000000" className="mt-16" />
      </section>

      {/* ── Profit Calculator ─────────────────────────── */}
      <section id="calculator" style={{ background: "#000000" }} className="py-24 relative overflow-hidden">
        {/* Subtle blob */}
        <div className="absolute right-0 top-1/4 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(109,40,217,0.15) 0%, transparent 70%)", filter: "blur(60px)", pointerEvents: "none" }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest text-purple-500 mb-3 uppercase">Profit Calculator</p>
            <h2 className="text-4xl font-black text-white mb-3">See What You'll Earn</h2>
            <p className="text-white/30 text-lg">Enter your investment amount to calculate returns</p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-10 items-start">
            {/* Controls */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="space-y-7">
                <div>
                  <label className="text-sm text-white/40 mb-3 block font-medium">Investment Amount</label>
                  <div className="relative mb-4">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 font-black text-xl">₹</span>
                    <input
                      type="number"
                      value={calcAmount}
                      onChange={e => setCalcAmount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full rounded-2xl pl-10 pr-4 py-4 text-xl font-bold text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    />
                  </div>
                  <input type="range" min="500" max="2000000" step="500" value={calcAmount}
                    onChange={e => setCalcAmount(parseInt(e.target.value))}
                    className="w-full accent-purple-500" />
                  <div className="flex justify-between text-xs text-white/20 mt-2">
                    <span>₹500</span><span>₹20 Lakh</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-white/40 mb-3 block font-medium">Select Plan</label>
                  <div className="grid grid-cols-4 gap-2">
                    {PLANS.map(p => (
                      <button
                        key={p.name}
                        onClick={() => setCalcPlan(p)}
                        className="py-3 rounded-xl text-sm font-bold transition-all hover:scale-105"
                        style={calcPlan.name === p.name ? {
                          background: `${p.color}22`,
                          border: `1px solid ${p.color}88`,
                          color: p.color,
                          boxShadow: `0 0 20px ${p.glow}`,
                        } : {
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          color: "rgba(255,255,255,0.4)",
                        }}
                      >
                        {p.name}<br />
                        <span className="text-[11px] font-normal opacity-70">{p.daily}%/d</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Result card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="glow-card rounded-3xl p-8 gradient-border"
              style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(20px)" }}
            >
              <div className="flex items-center gap-2 mb-6">
                <Calculator className="w-5 h-5 text-purple-400" />
                <span className="font-bold text-white">Your Returns ({calcPlan.name} Plan)</span>
              </div>
              <div className="space-y-0">
                {[
                  { label: "Investment",   value: `₹${formatINR(calcAmount)}`,   color: "text-white" },
                  { label: "Daily Earning", value: `+₹${formatINR(dailyReturn)}`, color: "text-green-400" },
                  { label: "Duration",     value: `${calcPlan.duration} days`,    color: "text-white/60" },
                  { label: "Total Profit", value: `₹${formatINR(totalProfit)}`,  color: "text-purple-400" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span className="text-white/30 text-sm">{row.label}</span>
                    <span className={`font-bold text-lg ${row.color}`}>{row.value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-5 pb-2">
                  <span className="text-white font-bold text-lg">Total Return</span>
                  <span className="text-3xl font-black gradient-text">₹{formatINR(totalReturn)}</span>
                </div>
              </div>
              <Link href="/register">
                <Button
                  className="w-full mt-6 h-13 rounded-2xl border-0 font-bold text-base py-4"
                  style={{
                    background: "linear-gradient(135deg, #6d28d9, #a855f7)",
                    boxShadow: "0 0 30px rgba(139,92,246,0.4)",
                  }}
                >
                  Earn ₹{formatINR(dailyReturn)}/day starting today →
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Referral / MLM ────────────────────────────── */}
      <section id="referral" style={{ background: "#050505" }} className="relative py-24 overflow-hidden">
        <div className="absolute left-0 top-0 w-full h-full pointer-events-none">
          <div className="aurora-blob aurora-blob-2" style={{ width: "500px", height: "500px", background: "radial-gradient(circle, rgba(109,40,217,0.12) 0%, transparent 70%)", bottom: "0", left: "-100px", top: "auto" }} />
        </div>
        <Particles />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <p className="text-xs font-bold tracking-widest text-purple-500 mb-4 uppercase">Refer & Earn</p>
              <h2 className="text-4xl font-black text-white mb-5">Your Network Is Your Income</h2>
              <p className="text-white/30 text-lg mb-8 leading-relaxed">
                Earn commissions 3 levels deep. Every time someone in your team makes a deposit, you earn automatically — forever.
              </p>
              <Link href="/register">
                <Button
                  className="h-12 px-8 rounded-2xl border-0 font-bold"
                  style={{ background: "linear-gradient(135deg, #6d28d9, #a855f7)", boxShadow: "0 0 24px rgba(139,92,246,0.4)" }}
                >
                  Get My Referral Link <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-4">
              {[
                { level: "Level 1 — Direct Referrals", pct: "5%", desc: "5% of every deposit by your direct referrals", delay: 0 },
                { level: "Level 2 — Sub-Network",      pct: "3%", desc: "3% of deposits by your Level 1's referrals",  delay: 0.1 },
                { level: "Level 3 — Extended Network", pct: "1%", desc: "1% of deposits by your Level 2's referrals",  delay: 0.2 },
              ].map((l) => (
                <motion.div
                  key={l.level}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: l.delay }}
                  className="rounded-2xl p-px"
                  style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.4), rgba(109,40,217,0.1))" }}
                >
                  <div
                    className="rounded-[14px] p-5 flex items-center justify-between"
                    style={{ background: "#0a0a0a" }}
                  >
                    <div>
                      <p className="text-base font-bold text-white">{l.level}</p>
                      <p className="text-sm text-white/30 mt-0.5">{l.desc}</p>
                    </div>
                    <span
                      className="text-4xl font-black ml-4 flex-shrink-0"
                      style={{ color: "#a855f7", textShadow: "0 0 20px rgba(168,85,247,0.5)" }}
                    >
                      {l.pct}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Why MoneySetu ─────────────────────────────── */}
      <section style={{ background: "#000000" }} className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest text-purple-500 mb-3 uppercase">Why MoneySetu</p>
            <h2 className="text-4xl font-black text-white">Built for Trust & Growth</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Shield,     title: "100% Secure",       desc: "Bank-grade encryption & SSL for all transactions" },
              { icon: Zap,        title: "Instant Deposits",   desc: "UPI & Bank Transfer credited in minutes"          },
              { icon: Users,      title: "2.4L+ Investors",   desc: "India's fastest-growing investment community"     },
              { icon: TrendingUp, title: "Daily Payouts",     desc: "Interest auto-credited every day, no delays"      },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl p-6 group hover:-translate-y-1 transition-transform duration-300"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)")}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(139,92,246,0.12)", boxShadow: "0 0 20px rgba(139,92,246,0.1)" }}
                >
                  <f.icon className="w-6 h-6 text-purple-400" />
                </div>
                <p className="font-bold text-white mb-2">{f.title}</p>
                <p className="text-sm text-white/30">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────── */}
      <section style={{ background: "#050505" }} className="py-24 relative overflow-hidden">
        <AuroraBackground />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <div
              className="rounded-3xl p-12 gradient-border"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(40px)" }}
            >
              <h2 className="text-4xl font-black text-white mb-4">Start Earning Today</h2>
              <p className="text-white/30 mb-8 text-lg">Free registration. Instant setup. Real daily returns.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/register">
                  <Button
                    className="h-14 px-10 rounded-2xl border-0 text-base font-black"
                    style={{
                      background: "linear-gradient(135deg, #5b21b6, #7c3aed, #a855f7)",
                      boxShadow: "0 0 50px rgba(139,92,246,0.5)",
                    }}
                  >
                    Create Free Account <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="h-14 px-10 rounded-2xl font-bold text-white"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    Login to Account
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer style={{ background: "#000000", borderTop: "1px solid rgba(255,255,255,0.04)" }} className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/20">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="MoneySetu" className="w-7 h-7 rounded-full object-cover opacity-50" />
            <span className="font-bold text-white/40">MoneySetu</span>
          </div>
          <p>© 2025 MoneySetu. All rights reserved.</p>
          <p>Investment involves risk. Returns are indicative.</p>
        </div>
      </footer>
    </div>
  );
}
