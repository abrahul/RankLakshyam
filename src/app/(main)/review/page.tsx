"use client";

import Link from "next/link";

export default function ReviewCenterPage() {
  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in">
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-display)] mb-2">
        Review Center
      </h1>
      <p className="text-sm text-surface-200/60 mb-6">
        Fix weak areas by reviewing wrong and skipped questions.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/review/wrong" className="glass-card-light p-4 topic-card">
          <span className="text-2xl block mb-2">❌</span>
          <p className="text-sm font-semibold text-white">Wrong Questions</p>
          <p className="text-xs text-surface-200/40">Review mistakes</p>
        </Link>
        <Link href="/review/unattempted" className="glass-card-light p-4 topic-card">
          <span className="text-2xl block mb-2">⏭️</span>
          <p className="text-sm font-semibold text-white">Unattempted</p>
          <p className="text-xs text-surface-200/40">Questions you skipped</p>
        </Link>
        <Link href="/weak-areas" className="glass-card-light p-4 topic-card">
          <span className="text-2xl block mb-2">📉</span>
          <p className="text-sm font-semibold text-white">Weak Areas</p>
          <p className="text-xs text-surface-200/40">Topics + styles</p>
        </Link>
        <Link href="/history" className="glass-card-light p-4 topic-card">
          <span className="text-2xl block mb-2">🕘</span>
          <p className="text-sm font-semibold text-white">Test History</p>
          <p className="text-xs text-surface-200/40">Past attempts</p>
        </Link>
      </div>
    </div>
  );
}

