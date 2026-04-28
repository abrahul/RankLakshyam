"use client";

import { SessionProvider } from "next-auth/react";
import BottomNav from "@/components/layout/BottomNav";
import DesktopSidebar from "@/components/layout/DesktopSidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex min-h-dvh">
        <DesktopSidebar />
        <main className="flex-1 pb-safe md:pb-0 md:ml-64 w-full">
          <div className="max-w-5xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
      <div className="md:hidden">
        <BottomNav />
      </div>
    </SessionProvider>
  );
}
