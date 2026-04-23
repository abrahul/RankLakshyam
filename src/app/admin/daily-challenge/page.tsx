"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ChallengeDoc = {
  _id: string;
  date: string;
  questionIds: Array<string>;
  topicMix?: Record<string, number>;
  difficultyLevel?: string;
};

export default function AdminDailyChallengePage() {
  const [date, setDate] = useState<string>(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  const [challenge, setChallenge] = useState<ChallengeDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didFetch = useRef(false);

  const prettyMix = useMemo(() => {
    const mix = challenge?.topicMix || {};
    const entries = Object.entries(mix).sort((a, b) => b[1] - a[1]);
    return entries;
  }, [challenge]);

  const load = async (d: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/daily-challenge?date=${encodeURIComponent(d)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load");
      setChallenge(json.data.challenge || null);
    } catch (e) {
      setChallenge(null);
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    void load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async (force: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/daily-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, force }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to generate");
      await load(date);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Daily Challenge</h2>
        <p className="text-sm text-surface-200/50">Generate or regenerate the daily challenge for a date.</p>
      </div>

      <div className="glass-card-light p-4 flex flex-wrap items-center gap-3">
        <label className="text-xs text-surface-200/60 font-semibold">Date</label>
        <input
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
          placeholder="YYYY-MM-DD"
        />
        <button
          type="button"
          onClick={() => load(date)}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-white/5 text-surface-200/70 text-sm font-semibold hover:bg-white/10 disabled:opacity-40 transition-all"
        >
          Refresh
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => generate(false)}
          disabled={saving}
          className="px-4 py-2 rounded-lg gradient-primary text-white text-sm font-semibold disabled:opacity-40 transition-all"
        >
          {saving ? "Working..." : "Generate"}
        </button>
        <button
          type="button"
          onClick={() => generate(true)}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-sm font-semibold hover:bg-amber-500/20 disabled:opacity-40 transition-all"
        >
          Regenerate (Force)
        </button>
      </div>

      {error ? <p className="text-sm text-error-500">{error}</p> : null}

      {loading ? (
        <div className="flex items-center justify-center py-14">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : challenge ? (
        <div className="glass-card p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-surface-200/50">Status:</span>
            <span className="text-xs font-bold text-success-500">ACTIVE</span>
            <span className="text-xs text-surface-200/30">•</span>
            <span className="text-xs text-surface-200/50">Questions:</span>
            <span className="text-xs font-bold text-white">{challenge.questionIds?.length || 0}</span>
            <span className="text-xs text-surface-200/30">•</span>
            <span className="text-xs text-surface-200/50">Difficulty:</span>
            <span className="text-xs font-bold text-primary-300">{challenge.difficultyLevel || "medium"}</span>
          </div>

          {prettyMix.length ? (
            <div className="glass-card-light p-4">
              <p className="text-xs text-surface-200/60 font-semibold mb-2">Topic mix</p>
              <div className="flex flex-wrap gap-2">
                {prettyMix.map(([topicId, count]) => (
                  <span key={topicId} className="text-[11px] bg-white/5 border border-white/10 px-2 py-1 rounded-full text-surface-200/70">
                    {topicId}: <span className="text-white font-bold">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <p className="text-[11px] text-surface-200/40">
            Tip: Users will see the daily challenge at <span className="text-surface-200/70">/challenge</span>.
          </p>
        </div>
      ) : (
        <div className="glass-card p-5">
          <p className="text-surface-200/60 text-sm">No daily challenge set for this date.</p>
        </div>
      )}
    </div>
  );
}

