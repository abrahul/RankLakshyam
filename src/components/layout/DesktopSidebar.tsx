"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useReportStore } from "@/lib/store/useReportStore";

const navItems = [
  { href: "/", icon: "🏠", label: "Home", activeIcon: "🏠" },
  { href: "/practice", icon: "📝", label: "Practice", activeIcon: "📝" },
  { href: "/pyq", icon: "📋", label: "PYQ", activeIcon: "📋" },
  { href: "/current-affairs", icon: "📰", label: "Current Affairs", activeIcon: "📰" },
  { href: "/performance", icon: "📊", label: "Stats", activeIcon: "📊" },
  { href: "/leaderboard", icon: "🏆", label: "Rank", activeIcon: "🏆" },
  { href: "/profile", icon: "👤", label: "Profile", activeIcon: "👤" },
];

export default function DesktopSidebar() {
  const pathname = usePathname();
  const openReport = useReportStore((s) => s.openReport);

  return (
    <aside
      className="hidden md:flex w-64 flex-shrink-0 flex-col fixed top-0 left-0 bottom-0 z-40"
      style={{
        background: "rgba(15, 23, 42, 0.95)",
        borderRight: "1px solid rgba(99, 102, 241, 0.15)",
      }}
    >
      <div className="p-6 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <h1 className="text-base font-bold text-white font-[family-name:var(--font-display)]">RankLakshyam</h1>
            <p className="text-[10px] text-surface-200/50 font-semibold tracking-wide">LEARNING APP</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? "bg-primary-500/10 text-primary-400 border border-primary-500/20"
                  : "text-surface-200/60 hover:bg-white/5 hover:text-surface-200 border border-transparent"
              }`}
            >
              <span className={`text-xl transition-transform ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                {isActive ? item.activeIcon : item.icon}
              </span>
              <span className="font-semibold">{item.label}</span>
              {isActive && (
                <div className="absolute left-0 w-1 h-8 rounded-r-full bg-primary-400 ml-0.5" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/5 text-center flex flex-col gap-3">
        <button
          onClick={() => openReport()}
          className="text-xs font-semibold text-surface-200/50 hover:text-white transition-colors"
        >
          🚩 Report a Bug
        </button>
         <p className="text-[10px] text-surface-200/30">
          RankLakshyam v0.1.0<br/>Made with ❤️
        </p>
      </div>
    </aside>
  );
}
