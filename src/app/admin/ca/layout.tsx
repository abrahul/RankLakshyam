"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminCALayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/admin/ca/daily", label: "📅 Daily" },
    { href: "/admin/ca/monthly", label: "📆 Monthly" },
  ];
  return (
    <div>
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              pathname === tab.href
                ? "gradient-primary text-white"
                : "bg-white/5 text-surface-200/60 hover:bg-white/10"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
