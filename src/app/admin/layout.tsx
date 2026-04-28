"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession, SessionProvider } from "next-auth/react";
import { useEffect } from "react";

const navItems = [
  { href: "/admin", icon: "📊", label: "Dashboard" },
  { href: "/admin/questions", icon: "❓", label: "Questions" },
  { href: "/admin/topics", icon: "📚", label: "Topics" },
  { href: "/admin/subtopics", icon: "🗂️", label: "Subtopics" },
  { href: "/admin/import", icon: "📥", label: "Import" },
  { href: "/admin/ai", icon: "🤖", label: "AI Generate" },
  { href: "/admin/users", icon: "👥", label: "Users" },
  { href: "/admin/categories", icon: "🗂️", label: "Categories" },
];

function AdminContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isLoading = status === "loading";
  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (!isAdmin) {
      router.push("/");
    }
  }, [session, isAdmin, isLoading, router]);

  if (isLoading || !session || !isAdmin) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex">
      <aside
        className="w-56 flex-shrink-0 flex flex-col fixed top-0 left-0 bottom-0 z-40"
        style={{
          background: "rgba(15, 23, 42, 0.95)",
          borderRight: "1px solid rgba(99, 102, 241, 0.15)",
        }}
      >
        <div className="p-4 border-b border-white/5">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <div>
              <h1 className="text-sm font-bold text-white font-[family-name:var(--font-display)]">RankLakshyam</h1>
              <p className="text-[10px] text-primary-400 font-semibold tracking-wide">ADMIN PANEL</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary-600/20 text-primary-300"
                    : "text-surface-200/60 hover:bg-white/5 hover:text-surface-200"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/5">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-surface-200/40 hover:bg-white/5 hover:text-surface-200/60 transition-all"
          >
            <span>←</span> Back to App
          </Link>
        </div>
      </aside>

      <main className="flex-1 ml-56 max-w-[100vw] overflow-x-hidden">
        <header
          className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between"
          style={{
            background: "rgba(2, 6, 23, 0.8)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <h2 className="text-lg font-bold text-white font-[family-name:var(--font-display)]">
            {navItems.find((item) => (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)))?.label || "Admin"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-surface-200/60 hover:bg-white/10 hover:text-surface-200 transition-all"
              aria-label="Log out"
            >
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">⎋</span>
            </button>
            <span className="text-xs text-surface-200/40">{session?.user?.email}</span>
            <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">
              {session?.user?.name?.[0] || "A"}
            </div>
          </div>
        </header>
        <div className="p-6 max-w-7xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AdminContent>{children}</AdminContent>
    </SessionProvider>
  );
}
