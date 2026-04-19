"use client";

import { SessionProvider } from "next-auth/react";
import BottomNav from "@/components/layout/BottomNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-dvh pb-safe max-w-lg mx-auto">
        {children}
      </div>
      <BottomNav />
    </SessionProvider>
  );
}
