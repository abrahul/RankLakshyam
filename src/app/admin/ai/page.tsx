"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type GeneratedQuestion = {
  _id?: string;
  text: { en: string; ml: string };
  options: Array<{ key: "A" | "B" | "C" | "D"; en: string; ml: string }>;
  correctOption: "A" | "B" | "C" | "D";
  explanation: { en: string; ml: string };
  topicId: string;
  subTopic: string;
  difficulty: number;
  questionStyle: "direct" | "concept" | "statement" | "negative" | "indirect";
  examTags: string[];
  tags: string[];
};

const TOPICS = [
  { id: "history", label: "📖 History" },
  { id: "geography", label: "🌍 Geography" },
  { id: "polity", label: "⚖️ Polity" },
  { id: "science", label: "🔬 Science" },
  { id: "current_affairs", label: "📰 Current Affairs" },
  { id: "language", label: "✍️ Language" },
  { id: "reasoning", label: "🧠 Reasoning" },
  { id: "gk", label: "💡 GK" },
];

export default function AdminAiGeneratePage() {
  const [sourceText, setSourceText] = useState("");
  const [sourceType, setSourceType] = useState("general");
  const [topicHint, setTopicHint] = useState<string>("auto");
  const [difficultyHint, setDifficultyHint] = useState<string>("auto");
  const [styleHint, setStyleHint] = useState<string>("auto");
  const [examTags, setExamTags] = useState<string[]>(["ldc"]);
  const [store, setStore] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<GeneratedQuestion | null>(null);

  const canGenerate = sourceText.trim().length > 20 && !loading;

  const requestBody = useMemo(
    () => ({
      sourceText,
      sourceType,
      topicHint: topicHint === "auto" ? undefined : topicHint,
      examTags,
      difficultyHint: difficultyHint === "auto" ? undefined : difficultyHint,
      styleHint: styleHint === "auto" ? undefined : styleHint,
      store,
    }),
    [difficultyHint, examTags, sourceText, sourceType, store, styleHint, topicHint]
  );

  const toggleExamTag = (tag: string) => {
    setExamTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setQuestion(null);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Generation failed");
        return;
      }

      const q = data.data?.question;
      setQuestion(q);
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
          <h1 className="text-xl font-bold text-white">AI Question Generator</h1>
          <p className="text-sm text-surface-200/60 mt-1">
            Paste source material, generate PSC-style MCQ JSON, and optionally save to DB.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/ai/dataset"
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-surface-200/60 hover:bg-white/10 hover:text-surface-200 transition-all"
          >
            Dataset Builder →
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Source Type</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
            >
              <option value="general">General</option>
              <option value="textbook">Textbook</option>
              <option value="current_affairs">Current affairs</option>
              <option value="notes">Notes</option>
              <option value="pyq">PYQ</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Preferred Topic</label>
            <select
              value={topicHint}
              onChange={(e) => setTopicHint(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
            >
              <option value="auto">Auto</option>
              {TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Preferred Difficulty</label>
            <select
              value={difficultyHint}
              onChange={(e) => setDifficultyHint(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
            >
              <option value="auto">Auto</option>
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={String(d)}>
                  {"⭐".repeat(d)} ({d})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Preferred Style</label>
            <select
              value={styleHint}
              onChange={(e) => setStyleHint(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
            >
              <option value="auto">Auto</option>
              <option value="direct">Direct</option>
              <option value="concept">Concept</option>
              <option value="statement">Statement</option>
              <option value="negative">Negative</option>
              <option value="indirect">Indirect</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-surface-200/60 font-semibold mb-2 block">Exam Tags</label>
          <div className="flex flex-wrap gap-2">
            {["ldc", "lgs", "degree", "police"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleExamTag(tag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all ${
                  examTags.includes(tag)
                    ? "bg-primary-500/30 text-primary-300 border border-primary-400/50"
                    : "bg-white/5 text-surface-200/40 border border-white/10 hover:border-white/20"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-surface-200/60 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={store}
              onChange={(e) => setStore(e.target.checked)}
              className="accent-primary-500"
            />
            Auto-save to MongoDB
          </label>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="px-6 py-3 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {loading ? "Generating..." : "Generate Question"}
          </button>
        </div>

        <div>
          <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Source Text *</label>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={10}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono resize-none focus:border-primary-400/50 focus:outline-none"
            placeholder="Paste textbook/notes/news content here (min ~20 chars)..."
            spellCheck={false}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/30">
          <p className="text-sm text-error-500">{error}</p>
          <p className="text-xs text-error-500/70 mt-1">
            Tip: verify `OPENAI_API_KEY` and `OPENAI_MODEL` in `.env.local`.
          </p>
        </div>
      )}

      {question && (
        <div className="glass-card p-5 space-y-3 animate-slide-up">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-surface-200/60">
              Preview {question._id ? `(saved: ${question._id})` : "(not saved)"}
            </h2>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(JSON.stringify(question, null, 2))}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-surface-200/60 hover:bg-white/10 transition-all"
            >
              Copy JSON
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-white text-sm font-semibold">{question.text.en}</p>
            {question.text.ml ? (
              <p className="text-surface-200/70 text-sm">{question.text.ml}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {question.options.map((o) => (
              <div
                key={o.key}
                className={`p-3 rounded-xl border text-sm ${
                  o.key === question.correctOption
                    ? "bg-success-500/10 border-success-500/30 text-success-200"
                    : "bg-white/5 border-white/10 text-surface-200/80"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-70">{o.key}.</span>
                  <span className="font-medium">{o.en}</span>
                </div>
                {o.ml ? <div className="text-xs opacity-70 mt-1">{o.ml}</div> : null}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="glass-card-light p-4">
              <p className="text-xs text-surface-200/50 font-semibold mb-1">Explanation (EN)</p>
              <p className="text-sm text-surface-200/80 whitespace-pre-wrap">{question.explanation.en}</p>
            </div>
            <div className="glass-card-light p-4">
              <p className="text-xs text-surface-200/50 font-semibold mb-1">Explanation (ML)</p>
              <p className="text-sm text-surface-200/80 whitespace-pre-wrap">{question.explanation.ml}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] text-surface-200/50">
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              topic: <span className="text-surface-200/70">{question.topicId}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              subTopic: <span className="text-surface-200/70">{question.subTopic || "-"}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              difficulty: <span className="text-surface-200/70">{question.difficulty}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              style: <span className="text-surface-200/70">{question.questionStyle}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
