"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const TEMPLATE = `[
  {
    "sourceType": "pyq",
    "sourceRef": "Kerala PSC LDC 2023 Set A (paste question context)",
    "topicHint": "history",
    "examTags": ["ldc"],
    "sourceText": "Paste PYQ text here (question + options + answer/exam context if you have it). Do NOT paste entire paper."
  },
  {
    "sourceType": "institute",
    "sourceRef": "Coaching notes - Kerala polity (summary)",
    "topicHint": "polity",
    "examTags": ["ldc", "lgs"],
    "sourceText": "Paste a short, reliable concept summary here (no verbatim copying)."
  },
  {
    "sourceType": "internet",
    "sourceRef": "Official site / scheme page title",
    "topicHint": "current_affairs",
    "examTags": ["degree"],
    "sourceText": "Paste key points from a reliable source you already verified."
  }
]`;

type Report = {
  inserted: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  errors: string[];
  breakdown: {
    pyq: number;
    pyq_variant: number;
    institute: number;
    internet: number;
  };
  samples: Array<{ id: string; textEn: string; sourceType?: string; questionStyle: string }>;
};

export default function AdminAiDatasetPage() {
  const [sourcesJson, setSourcesJson] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [store, setStore] = useState(true);
  const [useAiValidator, setUseAiValidator] = useState(true);
  const [generatePyqVariants, setGeneratePyqVariants] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  const parsedSources = useMemo(() => {
    try {
      const parsed = JSON.parse(sourcesJson || "[]");
      if (!Array.isArray(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }, [sourcesJson]);

  const canRun = !loading && Array.isArray(parsedSources) && parsedSources.length > 0;

  const run = async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch("/api/ai/dataset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: parsedSources,
          totalQuestions,
          store,
          useAiValidator,
          generatePyqVariants,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Dataset run failed");
        return;
      }
      setReport(data.data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Dataset Builder</h1>
          <p className="text-sm text-surface-200/60 mt-1">
            Generates a 20-question PSC mix + PYQ variants, validates, and inserts with `status: review`.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/ai"
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-surface-200/60 hover:bg-white/10 hover:text-surface-200 transition-all"
          >
            ← Single
          </Link>
          <Link
            href="/admin/questions"
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-surface-200/60 hover:bg-white/10 hover:text-surface-200 transition-all"
          >
            View Questions →
          </Link>
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs text-surface-200/60 font-semibold">Sources JSON *</label>
          <button
            type="button"
            onClick={() => setSourcesJson(TEMPLATE)}
            className="text-[11px] text-primary-400 hover:text-primary-300 transition-all"
          >
            Load template
          </button>
        </div>
        <textarea
          value={sourcesJson}
          onChange={(e) => setSourcesJson(e.target.value)}
          rows={14}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono resize-none focus:border-primary-400/50 focus:outline-none"
          placeholder="Paste JSON array of sources..."
          spellCheck={false}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Total Questions</label>
            <input
              type="number"
              min={1}
              max={20}
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(parseInt(e.target.value || "20", 10))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-surface-200/60 select-none cursor-pointer mt-7">
            <input
              type="checkbox"
              checked={store}
              onChange={(e) => setStore(e.target.checked)}
              className="accent-primary-500"
            />
            Insert into DB
          </label>
          <label className="flex items-center gap-2 text-sm text-surface-200/60 select-none cursor-pointer mt-7">
            <input
              type="checkbox"
              checked={useAiValidator}
              onChange={(e) => setUseAiValidator(e.target.checked)}
              className="accent-primary-500"
            />
            AI validate
          </label>
          <label className="flex items-center gap-2 text-sm text-surface-200/60 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={generatePyqVariants}
              onChange={(e) => setGeneratePyqVariants(e.target.checked)}
              className="accent-primary-500"
            />
            PYQ variants (3)
          </label>
        </div>

        <button
          type="button"
          onClick={run}
          disabled={!canRun}
          className="px-6 py-3 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
        >
          {loading ? "Running..." : "Generate + Insert Dataset"}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/30">
          <p className="text-sm text-error-500">{error}</p>
          <p className="text-xs text-error-500/70 mt-1">
            Check `.env.local` for `OPENAI_API_KEY` and MongoDB connectivity.
          </p>
        </div>
      )}

      {report && (
        <div className="glass-card p-5 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-surface-200/60">Run Report</h2>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(JSON.stringify(report, null, 2))}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-surface-200/60 hover:bg-white/10 transition-all"
            >
              Copy report JSON
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <Stat label="Inserted" value={report.inserted} />
            <Stat label="Dupes skipped" value={report.skippedDuplicates} />
            <Stat label="Invalid skipped" value={report.skippedInvalid} />
            <Stat label="Errors" value={report.errors.length} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <Stat label="PYQ" value={report.breakdown.pyq} />
            <Stat label="PYQ variants" value={report.breakdown.pyq_variant} />
            <Stat label="Institute" value={report.breakdown.institute} />
            <Stat label="Internet" value={report.breakdown.internet} />
          </div>

          {report.samples.length ? (
            <div className="space-y-2">
              <p className="text-xs text-surface-200/50 font-semibold">Samples</p>
              {report.samples.map((s) => (
                <div key={s.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm text-white">{s.textEn}</p>
                  <p className="text-[11px] text-surface-200/40 mt-1">
                    {s.sourceType || "?"} • {s.questionStyle} • {s.id}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {report.errors.length ? (
            <div className="bg-error-500/10 border border-error-500/30 rounded-xl p-4">
              <p className="text-xs text-error-500 font-semibold mb-2">Errors</p>
              <div className="space-y-1">
                {report.errors.slice(0, 10).map((e, idx) => (
                  <p key={idx} className="text-xs text-error-500/70">
                    {e}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card-light p-4">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-[11px] text-surface-200/40 mt-1">{label}</p>
    </div>
  );
}

