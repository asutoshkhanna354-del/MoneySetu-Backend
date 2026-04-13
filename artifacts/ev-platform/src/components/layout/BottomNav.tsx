import { Link, useLocation } from "wouter";
import { Home, Zap, Wallet, Clock, User } from "lucide-react";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: "/dashboard",    label: "Home",    icon: Home,   activeColor: "#6C4CF1" },
    { path: "/invest",       label: "Invest",  icon: Zap,    activeColor: "#6C4CF1" },
    { path: "/withdraw",     label: "Plans",   icon: Wallet, activeColor: "#6C4CF1" },
    { path: "/transactions", label: "History", icon: Clock,  activeColor: "#6C4CF1" },
    { path: "/profile",      label: "Profile", icon: User,   activeColor: "#6C4CF1" },
  ];

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "var(--theme-header)",
        backdropFilter: "blur(24px)",
        borderTop: "1px solid var(--theme-sidebar-b)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex justify-around items-center h-16 px-1">
        {navItems.map((item) => {
          const isActive = location === item.path || (item.path !== "/dashboard" && location.startsWith(item.path));
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path} className="w-full">
              <div
                className="flex flex-col items-center justify-center w-full h-full space-y-1 cursor-pointer transition-all duration-200"
                style={{ color: isActive ? item.activeColor : "var(--theme-t4)" }}
              >
                <div
                  className="p-1.5 rounded-xl transition-all duration-200"
                  style={isActive ? {
                    background: `rgba(108,76,241,0.15)`,
                    boxShadow: `0 0 10px rgba(108,76,241,0.3)`,
                    transform: "scale(1.1)",
                  } : {}}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
