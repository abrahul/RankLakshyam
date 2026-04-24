"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  level: string;
  exam: string;
  examCode: string;
  tags: string[];
};

type TopicOption = {
  id: string;
  name: { en: string; ml: string };
  icon: string;
};

const LEVELS = [
  { id: "10th_level", label: "10th Level" },
  { id: "plus2_level", label: "Plus Two" },
  { id: "degree_level", label: "Degree" },
  { id: "other_exams", label: "Others" },
];

export default function AdminAiGeneratePage() {
  const [sourceText, setSourceText] = useState("");
  const [sourceType, setSourceType] = useState("general");
  const [topicHint, setTopicHint] = useState<string>("auto");
  const [difficultyHint, setDifficultyHint] = useState<string>("auto");
  const [styleHint, setStyleHint] = useState<string>("auto");
  const [level, setLevel] = useState<string>("10th_level");
  const [exam, setExam] = useState<string>("");
  const [store, setStore] = useState(true);
  const [topics, setTopics] = useState<TopicOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<GeneratedQuestion | null>(null);

  useEffect(() => {
    fetch("/api/topics")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTopics(data.data || []);
        }
      })
      .catch(() => setTopics([]));
  }, []);

  const canGenerate = sourceText.trim().length > 20 && !loading;

  const requestBody = useMemo(
    () => ({
      sourceText,
      sourceType,
      topicHint: topicHint === "auto" ? undefined : topicHint,
      level,
      exam: exam || undefined,
      difficultyHint: difficultyHint === "auto" ? undefined : difficultyHint,
      styleHint: styleHint === "auto" ? undefined : styleHint,
      store,
    }),
    [difficultyHint, exam, level, sourceText, sourceType, store, styleHint, topicHint]
  );

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

      setQuestion(data.data?.question);
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
              onChange={(event) => setSourceType(event.target.value)}
              style={{ colorScheme: "dark" }}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none [&>option]:bg-slate-950 [&>option]:text-white"
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
              onChange={(event) => setTopicHint(event.target.value)}
              style={{ colorScheme: "dark" }}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none [&>option]:bg-slate-950 [&>option]:text-white"
            >
              <option value="auto">Auto</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.icon ? `${topic.icon} ` : ""}
                  {topic.name.en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Preferred Difficulty</label>
            <select
              value={difficultyHint}
              onChange={(event) => setDifficultyHint(event.target.value)}
              style={{ colorScheme: "dark" }}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none [&>option]:bg-slate-950 [&>option]:text-white"
            >
              <option value="auto">Auto</option>
              {[1, 2, 3, 4, 5].map((difficulty) => (
                <option key={difficulty} value={String(difficulty)}>
                  {"⭐".repeat(difficulty)} ({difficulty})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Preferred Style</label>
            <select
              value={styleHint}
              onChange={(event) => setStyleHint(event.target.value)}
              style={{ colorScheme: "dark" }}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none [&>option]:bg-slate-950 [&>option]:text-white"
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Level</label>
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              style={{ colorScheme: "dark" }}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none [&>option]:bg-slate-950 [&>option]:text-white"
            >
              {LEVELS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Exam (optional)</label>
            <input
              value={exam}
              onChange={(event) => setExam(event.target.value)}
              placeholder="e.g. LDC VARIOUS"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-surface-200/60 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={store}
              onChange={(event) => setStore(event.target.checked)}
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
            onChange={(event) => setSourceText(event.target.value)}
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
            {question.text.ml ? <p className="text-surface-200/70 text-sm">{question.text.ml}</p> : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {question.options.map((option) => (
              <div
                key={option.key}
                className={`p-3 rounded-xl border text-sm ${
                  option.key === question.correctOption
                    ? "bg-success-500/10 border-success-500/30 text-success-200"
                    : "bg-white/5 border-white/10 text-surface-200/80"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-70">{option.key}.</span>
                  <span className="font-medium">{option.en}</span>
                </div>
                {option.ml ? <div className="text-xs opacity-70 mt-1">{option.ml}</div> : null}
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
