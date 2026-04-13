import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomNav } from "./BottomNav";
import { ContactUs } from "@/components/ContactUs";
import { PlatformInfoModal } from "@/components/PlatformInfoModal";
import {
  Loader2, ShieldCheck, Home, Zap, Users, ArrowRightLeft, User,
  LogOut, PlusCircle, Sun, Moon, Wallet, ArrowUpRight, Bell,
  Settings, Search, ChevronDown, LayoutGrid, LifeBuoy,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useState } from "react";
import { useGetBalance } from "@workspace/api-client-react";

function cn(...inputs: any[]) { return twMerge(clsx(inputs)); }

const NAV_GROUPS = [
  {
    items: [
      { path: "/dashboard",     label: "Dashboard",         icon: Home },
      { path: "/deposit",       label: "Add Money",         icon: PlusCircle, highlight: true },
    ],
  },
  {
    label: "INVEST",
    items: [
      { path: "/invest",        label: "Investments",       icon: Zap },
      { path: "/withdraw",      label: "My Plans",          icon: LayoutGrid },
      { path: "/earn-withdraw", label: "Withdraw Earnings", icon: ArrowUpRight, green: true },
    ],
  },
  {
    label: "SERVICES",
    items: [
      { path: "/referral",      label: "Refer & Earn",      icon: Users },
    ],
  },
  {
    label: "MORE",
    items: [
      { path: "/transactions",  label: "Transaction History", icon: ArrowRightLeft },
      { path: "/support",       label: "Support Center",      icon: LifeBuoy },
      { path: "/profile",       label: "Profile",             icon: User },
    ],
  },
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
  const { isDark } = useTheme();
  return (
    <aside
      className="hidden md:flex flex-col w-64 min-h-screen fixed top-0 left-0 z-30"
      style={{
        background: "var(--theme-sidebar)",
        borderRight: "1px solid var(--theme-sidebar-b)",
        boxShadow: isDark ? "4px 0 24px rgba(0,0,0,0.3)" : "4px 0 24px rgba(0,0,0,0.06)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: "1px solid var(--theme-border)" }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#6C4CF1,#8E44AD)", boxShadow: "0 4px 14px rgba(108,76,241,0.4)" }}
        >
          <span className="text-white font-black text-sm">M</span>
        </div>
        <span className="font-black text-xl tracking-tight" style={{ color: "var(--theme-t1)" }}>
          Money<span className="gradient-text">Setu</span>
        </span>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "pt-2" : ""}>
            {group.label && (
              <p
                className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "var(--theme-t4)" }}
              >
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = location === item.path;
              const Icon = item.icon;
              const isHighlight = (item as any).highlight;
              const isGreen = (item as any).green;
              return (
                <Link key={item.path} href={item.path}>
                  <div
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm cursor-pointer transition-all duration-150"
                    style={isActive ? {
                      background: isGreen
                        ? "rgba(34,197,94,0.12)"
                        : isHighlight
                        ? "linear-gradient(135deg,rgba(108,76,241,0.2),rgba(142,68,173,0.15))"
                        : "linear-gradient(135deg,rgba(108,76,241,0.18),rgba(142,68,173,0.12))",
                      color: isGreen ? "#22C55E" : "#6C4CF1",
                      boxShadow: isGreen
                        ? "inset 0 0 0 1px rgba(34,197,94,0.25)"
                        : "inset 0 0 0 1px rgba(108,76,241,0.25)",
                    } : isHighlight ? {
                      background: "rgba(59,130,246,0.08)",
                      color: "#60a5fa",
                      border: "1px solid rgba(59,130,246,0.15)",
                    } : isGreen ? {
                      color: "#22C55E",
                    } : {
                      color: "var(--theme-t3)",
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = "var(--theme-card2)";
                        el.style.color = isGreen ? "#22C55E" : isHighlight ? "#60a5fa" : "var(--theme-t1)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = isHighlight ? "rgba(59,130,246,0.08)" : "transparent";
                        el.style.color = isGreen ? "#22C55E" : isHighlight ? "#60a5fa" : "var(--theme-t3)";
                      }
                    }}
                  >
                    <Icon className="w-4.5 h-4.5 flex-shrink-0 w-[18px] h-[18px]" />
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <span
                        className="w-1.5 h-1.5 rounded-full ml-auto"
                        style={{
                          background: isGreen ? "#22C55E" : "#6C4CF1",
                          boxShadow: isGreen ? "0 0 6px rgba(34,197,94,0.8)" : "0 0 6px rgba(108,76,241,0.8)",
                        }}
                      />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}

        {isAdmin && (
          <div className="pt-2">
            <Link href="/admin">
              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm cursor-pointer transition-all duration-150"
                style={{ background: "rgba(108,76,241,0.08)", color: "#6C4CF1", border: "1px solid rgba(108,76,241,0.15)" }}
              >
                <ShieldCheck className="w-[18px] h-[18px] flex-shrink-0" />
                Admin Panel
              </div>
            </Link>
          </div>
        )}
      </nav>

      {/* Theme toggle + Sign out */}
      <div className="px-3 pb-5 pt-3" style={{ borderTop: "1px solid var(--theme-border)" }}>
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-xs font-semibold" style={{ color: "var(--theme-t4)" }}>Appearance</span>
          <ThemeToggle size="sm" />
        </div>
        <button
          onClick={() => { localStorage.removeItem("ev_token"); window.location.href = "/"; }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all"
          style={{ color: "var(--theme-t4)" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = "#f87171";
            (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.07)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = "var(--theme-t4)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <LogOut className="w-[18px] h-[18px]" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

function DesktopTopBar({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useAuth();
  const { data: balanceData } = useGetBalance();
  const { isDark } = useTheme();
  const [searchVal, setSearchVal] = useState("");

  return (
    <div
      className="hidden md:flex fixed top-0 left-64 right-0 z-20 h-16 px-6 items-center gap-4"
      style={{
        background: "var(--theme-header)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--theme-border)",
      }}
    >
      {/* Search */}
      <div className="flex-1 max-w-sm relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--theme-t4)" }} />
        <input
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
          placeholder="Search transactions, plans, help…"
          className="w-full h-9 pl-9 pr-4 rounded-xl text-sm outline-none transition-all"
          style={{
            background: "var(--theme-card2)",
            border: "1px solid var(--theme-border)",
            color: "var(--theme-t1)",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "rgba(108,76,241,0.4)")}
          onBlur={e => (e.currentTarget.style.borderColor = "var(--theme-border)")}
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <ThemeToggle />

        {/* Notification bell */}
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center relative transition-all hover:scale-110"
          style={{ background: "var(--theme-card2)", border: "1px solid var(--theme-border)", color: "var(--theme-t2)" }}
        >
          <Bell className="w-4 h-4" />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: "#6C4CF1", boxShadow: "0 0 6px rgba(108,76,241,0.8)" }}
          />
        </button>

        {/* Settings */}
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
          style={{ background: "var(--theme-card2)", border: "1px solid var(--theme-border)", color: "var(--theme-t2)" }}
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Profile */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer transition-all hover:scale-105"
          style={{ background: "var(--theme-card2)", border: "1px solid var(--theme-border)" }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#6C4CF1,#8E44AD)" }}
          >
            {(user?.name || "U")[0].toUpperCase()}
          </div>
          <div className="text-left leading-tight">
            <p className="text-xs font-bold" style={{ color: "var(--theme-t1)" }}>{user?.name?.split(" ")[0] || "User"}</p>
            <p className="text-[10px]" style={{ color: "var(--theme-t4)" }}>Premium Member</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 ml-1" style={{ color: "var(--theme-t4)" }} />
        </div>

        {isAdmin && (
          <Link href="/admin">
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all hover:scale-105"
              style={{ background: "rgba(108,76,241,0.12)", color: "#6C4CF1", border: "1px solid rgba(108,76,241,0.2)" }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}

export function AppLayout({ children, hideNav = false }: { children: React.ReactNode; hideNav?: boolean }) {
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--theme-bg)" }}>
        <div className="relative">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#6C4CF1" }} />
          <div className="absolute inset-0 blur-xl rounded-full animate-pulse" style={{ background: "rgba(108,76,241,0.2)" }} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--theme-bg)" }}>
      {/* Sidebar (desktop) */}
      <Sidebar isAdmin={isAdmin} />

      {/* Desktop top bar */}
      <DesktopTopBar isAdmin={isAdmin} />

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
        <div className="px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#6C4CF1,#8E44AD)" }}
            >
              <span className="text-white font-black text-sm">M</span>
            </div>
            <span className="font-black text-base" style={{ color: "var(--theme-t1)" }}>
              Money<span className="gradient-text">Setu</span>
            </span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle size="sm" />

            <button
              className="w-8 h-8 rounded-xl flex items-center justify-center relative"
              style={{ background: "var(--theme-card2)", border: "1px solid var(--theme-border)", color: "var(--theme-t2)" }}
            >
              <Bell className="w-4 h-4" />
              <span
                className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                style={{ background: "#6C4CF1" }}
              />
            </button>

            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
              style={{ background: "linear-gradient(135deg,#6C4CF1,#8E44AD)", boxShadow: "0 0 12px rgba(108,76,241,0.4)" }}
            >
              {(user?.name || "U")[0].toUpperCase()}
            </div>

            {isAdmin && (
              <Link href="/admin">
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ background: "rgba(108,76,241,0.12)", color: "#6C4CF1", border: "1px solid rgba(108,76,241,0.2)" }}
                >
                  <ShieldCheck className="w-3 h-3" />
                </div>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main
        className="md:ml-64 md:pt-16 min-h-screen"
        style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 md:pb-8">
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
