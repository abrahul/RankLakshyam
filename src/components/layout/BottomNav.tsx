"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useReportStore } from "@/lib/store/useReportStore";

const navItems = [
  { href: "/", icon: "🏠", label: "Home", activeIcon: "🏠" },
  { href: "/practice", icon: "📝", label: "Practice", activeIcon: "📝" },
  { href: "/pyq", icon: "📋", label: "PYQ", activeIcon: "📋" },
  { href: "/performance", icon: "📊", label: "Stats", activeIcon: "📊" },
  { href: "/leaderboard", icon: "🏆", label: "Rank", activeIcon: "🏆" },
  { href: "/profile", icon: "👤", label: "Profile", activeIcon: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const openReport = useReportStore((s) => s.openReport);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(99, 102, 241, 0.15)",
      }}
    >
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.label.toLowerCase()}`}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all ${
                isActive
                  ? "text-primary-400"
                  : "text-surface-200/50 hover:text-surface-200/80"
              }`}
            >
              <span
                className={`text-xl transition-transform ${
                  isActive ? "scale-110" : ""
                }`}
              >
                {isActive ? item.activeIcon : item.icon}
              </span>
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-primary-400" : ""
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-0 w-8 h-0.5 rounded-full bg-primary-400" />
              )}
            </Link>
          );
        })}
      </div>
      {/* Floating Report Button for Mobile */}
      <button
        onClick={() => openReport()}
        className="absolute -top-12 right-4 w-10 h-10 rounded-full bg-surface-800 border border-white/10 text-surface-200/50 hover:text-white flex items-center justify-center shadow-lg transition-colors"
        title="Report Bug"
      >
        🚩
      </button>
      
      {/* Safe area padding for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
