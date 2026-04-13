import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomNav } from "./BottomNav";
import { ContactUs } from "@/components/ContactUs";
import { PlatformInfoModal } from "@/components/PlatformInfoModal";
import { Loader2, ShieldCheck, Home, Zap, Users, ArrowRightLeft, User, LogOut, ArrowUpRight, PlusCircle, Sun, Moon } from "lucide-react";
import { Link, useLocation } from "wouter";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) { return twMerge(clsx(inputs)); }

const NAV_ITEMS = [
  { path: "/dashboard",    label: "Home",         icon: Home },
  { path: "/deposit",      label: "Add Money",    icon: PlusCircle, highlight: true },
  { path: "/invest",       label: "Invest",       icon: Zap },
  { path: "/withdraw",     label: "Investments",  icon: ArrowUpRight },
  { path: "/referral",     label: "Refer & Earn", icon: Users },
  { path: "/transactions", label: "History",      icon: ArrowRightLeft },
  { path: "/profile",      label: "Profile",      icon: User },
];

function ThemeToggle({ size = "md" }: { size?: "sm" | "md" }) {
  const { isDark, toggle } = useTheme();
  const sm = size === "sm";
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={`${sm ? "w-8 h-8" : "w-9 h-9"} rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95`}
      style={{
        background: "var(--theme-card2)",
        border: "1px solid var(--theme-border)",
        color: "var(--theme-t2)",
      }}
    >
      {isDark
        ? <Sun className={sm ? "w-3.5 h-3.5" : "w-4 h-4"} />
        : <Moon className={sm ? "w-3.5 h-3.5" : "w-4 h-4"} />}
    </button>
  );
}

function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const [location] = useLocation();
  return (
    <aside
      className="hidden md:flex flex-col w-60 min-h-screen fixed top-0 left-0 z-30"
      style={{ background: "var(--theme-sidebar)", borderRight: "1px solid var(--theme-sidebar-b)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: "1px solid var(--theme-border)" }}>
        <img
          src="/logo.png"
          alt="MoneySetu"
          className="w-10 h-10 rounded-full object-cover"
          style={{ boxShadow: "0 0 20px rgba(139,92,246,0.4)" }}
        />
        <span className="font-black text-xl tracking-tight" style={{ color: "var(--theme-t1)" }}>
          Money<span className="gradient-text">Setu</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          const isHighlight = (item as any).highlight;
          return (
            <Link key={item.path} href={item.path}>
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-sm cursor-pointer transition-all duration-200"
                style={isHighlight && !isActive ? {
                  background: "linear-gradient(135deg, rgba(29,78,216,0.25), rgba(59,130,246,0.18))",
                  color: "#60a5fa",
                  border: "1px solid rgba(59,130,246,0.2)",
                } : isActive ? {
                  background: "rgba(139,92,246,0.15)",
                  color: "#a855f7",
                  boxShadow: "0 0 20px rgba(139,92,246,0.15), inset 0 0 0 1px rgba(139,92,246,0.2)",
                } : {
                  color: "var(--theme-t3)",
                }}
                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = isHighlight ? "white" : "var(--theme-t1)"; (e.currentTarget as HTMLElement).style.background = isHighlight ? "linear-gradient(135deg, #1d4ed8, #3b82f6)" : "var(--theme-card2)"; }}}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = isHighlight ? "#60a5fa" : "var(--theme-t3)"; (e.currentTarget as HTMLElement).style.background = isHighlight ? "linear-gradient(135deg, rgba(29,78,216,0.25), rgba(59,130,246,0.18))" : "transparent"; }}}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400" style={{ boxShadow: "0 0 6px rgba(168,85,247,0.8)" }} />}
              </div>
            </Link>
          );
        })}

        {isAdmin && (
          <Link href="/admin">
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-sm cursor-pointer transition-all duration-200 mt-3"
              style={{ background: "rgba(139,92,246,0.08)", color: "#a855f7", border: "1px solid rgba(139,92,246,0.15)" }}
            >
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              Admin Panel
            </div>
          </Link>
        )}
      </nav>

      {/* Theme toggle + Sign out */}
      <div className="px-3 pb-5" style={{ borderTop: "1px solid var(--theme-border)", paddingTop: "12px" }}>
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-xs font-semibold" style={{ color: "var(--theme-t4)" }}>Appearance</span>
          <ThemeToggle size="sm" />
        </div>
        <button
          onClick={() => { localStorage.removeItem("ev_token"); window.location.href = "/"; }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-colors"
          style={{ color: "var(--theme-t4)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.07)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--theme-t4)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export function AppLayout({ children, hideNav = false }: { children: React.ReactNode; hideNav?: boolean }) {
  const { isLoading, isAuthenticated, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--theme-bg)" }}>
        <div className="relative">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
          <div className="absolute inset-0 blur-xl bg-purple-500/20 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--theme-bg)" }}>
      {/* Sidebar (desktop) */}
      <Sidebar isAdmin={isAdmin} />

      {/* Mobile top bar */}
      <header
        className="md:hidden sticky top-0 z-40"
        style={{
          background: "var(--theme-header)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--theme-sidebar-b)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="MoneySetu" className="w-9 h-9 rounded-full object-cover" style={{ boxShadow: "0 0 14px rgba(139,92,246,0.4)" }} />
            <span className="font-black text-lg" style={{ color: "var(--theme-t1)" }}>Money<span className="gradient-text">Setu</span></span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle size="sm" />
            <Link href="/deposit">
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black cursor-pointer transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", color: "white", boxShadow: "0 0 14px rgba(59,130,246,0.35)" }}>
                <PlusCircle className="w-3.5 h-3.5" /><span>Add Money</span>
              </div>
            </Link>
            {isAdmin && (
              <Link href="/admin">
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
                  style={{ background: "rgba(139,92,246,0.12)", color: "#a855f7", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <ShieldCheck className="w-3.5 h-3.5" /><span>Admin</span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Desktop top bar */}
      <div
        className="hidden md:flex fixed top-0 left-60 right-0 z-20 h-16 px-8 items-center justify-end gap-3"
        style={{ background: "var(--theme-header)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--theme-border)" }}
      >
        <ThemeToggle />
        <Link href="/deposit">
          <div
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black cursor-pointer transition-all hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", color: "white", boxShadow: "0 0 20px rgba(59,130,246,0.35)" }}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Money</span>
          </div>
        </Link>
        {isAdmin && (
          <Link href="/admin">
            <div
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold cursor-pointer transition-all hover:scale-105"
              style={{ background: "rgba(139,92,246,0.12)", color: "#a855f7", border: "1px solid rgba(139,92,246,0.2)", boxShadow: "0 0 16px rgba(139,92,246,0.15)" }}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Panel</span>
            </div>
          </Link>
        )}
      </div>

      {/* Main content */}
      <main
        className="md:ml-60 md:pt-16 min-h-screen"
        style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      {!hideNav && <BottomNav />}

      {/* Contact Us floating button */}
      <ContactUs />

      {/* Platform info popup */}
      <PlatformInfoModal />
    </div>
  );
}
