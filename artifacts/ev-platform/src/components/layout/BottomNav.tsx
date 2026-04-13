import { Link, useLocation } from "wouter";
import { Home, Zap, ArrowUpRight, User, Wallet } from "lucide-react";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: "/dashboard",     label: "Home",    icon: Home,         activeColor: "#a855f7" },
    { path: "/invest",        label: "Invest",  icon: Zap,          activeColor: "#a855f7" },
    { path: "/earn-withdraw", label: "Withdraw",icon: ArrowUpRight,  activeColor: "#4ade80" },
    { path: "/withdraw",      label: "Plans",   icon: Wallet,        activeColor: "#fb923c" },
    { path: "/profile",       label: "Profile", icon: User,          activeColor: "#a855f7" },
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
                  className="p-1.5 rounded-xl transition-all duration-300"
                  style={isActive ? {
                    background: `${item.activeColor}22`,
                    boxShadow: `0 0 10px ${item.activeColor}44`,
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
