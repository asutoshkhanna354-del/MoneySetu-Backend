import { Link, useLocation } from "wouter";
import { Home, Zap, ArrowRightLeft, User, ArrowUpRight } from "lucide-react";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: "/dashboard",    label: "Home",     icon: Home },
    { path: "/invest",       label: "Invest",   icon: Zap },
    { path: "/withdraw",     label: "My Plans",  icon: ArrowUpRight },
    { path: "/transactions", label: "History",  icon: ArrowRightLeft },
    { path: "/profile",      label: "Profile",  icon: User },
  ];

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe"
      style={{ background: "rgba(3,3,3,0.95)", backdropFilter: "blur(24px)", borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex justify-around items-center h-16 px-1">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          const isWithdraw = item.path === "/withdraw";
          return (
            <Link key={item.path} href={item.path} className="w-full">
              <div
                className="flex flex-col items-center justify-center w-full h-full space-y-1 cursor-pointer transition-all duration-200"
                style={{ color: isActive ? (isWithdraw ? "#fb923c" : "#a855f7") : "rgba(255,255,255,0.25)" }}
              >
                <div
                  className="p-1.5 rounded-xl transition-all duration-300"
                  style={isActive ? {
                    background: isWithdraw ? "rgba(249,115,22,0.15)" : "rgba(139,92,246,0.15)",
                    boxShadow: isWithdraw ? "0 0 12px rgba(249,115,22,0.3)" : "0 0 12px rgba(139,92,246,0.3)",
                    transform: "scale(1.1)",
                  } : {}}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
