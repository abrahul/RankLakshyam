"use client";

import { useMemo, useState } from "react";

type CAQuestion = {
  text: { en: string; ml: string };
  options: Array<{ key: "A" | "B" | "C" | "D"; en: string; ml: string }>;
  correctOption: "A" | "B" | "C" | "D";
  explanation: { en: string; ml: string };
  tags: string[];
  difficulty: number;
};

type ImportResult = {
  created: number;
  skipped: number;
  errors: string[];
};

type Scope =
  | { caType: "daily"; date: string }
  | { caType: "monthly"; month: number; year: number };

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

function emptyQuestion(): CAQuestion {
  return {
    text: { en: "", ml: "" },
    options: OPTION_KEYS.map((key) => ({ key, en: "", ml: "" })),
    correctOption: "A",
    explanation: { en: "", ml: "" },
    tags: ["current-affairs"],
    difficulty: 2,
  };
}

const samplePayload = {
  caType: "daily",
  date: "2026-05-01",
  questions: [
    {
      text: {
        en: "Which state launched the Green Hydrogen Valley project in April 2026?",
        ml: "2026 Aprilil Green Hydrogen Valley project arambhicha samsthanam ethanu?",
      },
      options: [
        { key: "A", en: "Kerala", ml: "Keralam" },
        { key: "B", en: "Tamil Nadu", ml: "Tamil Nadu" },
        { key: "C", en: "Karnataka", ml: "Karnataka" },
        { key: "D", en: "Maharashtra", ml: "Maharashtra" },
      ],
      correctOption: "A",
      explanation: {
        en: "Use this field for a short source-backed explanation.",
        ml: "Churukkathilulla vivaranam ivide cherkkuka.",
      },
      tags: ["current-affairs", "environment"],
      difficulty: 2,
      questionStyle: "direct",
    },
  ],
};

export function CurrentAffairsQuestionForm({
  scope,
  endpoint,
  maxItems,
}: {
  scope: Scope;
  endpoint: string;
  maxItems: number;
}) {
  const [questions, setQuestions] = useState<CAQuestion[]>([emptyQuestion()]);
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payloadPreview = useMemo(() => JSON.stringify({ ...scope, questions }, null, 2), [scope, questions]);

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()]);
  const removeQuestion = (index: number) => setQuestions((prev) => prev.filter((_, idx) => idx !== index));
  const updateQuestion = (index: number, updater: (question: CAQuestion) => CAQuestion) => {
    setQuestions((prev) => prev.map((question, idx) => (idx === index ? updater(question) : question)));
  };

  const submitPayload = async (payload: unknown) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        setQuestions([emptyQuestion()]);
      } else {
        setError(data.error?.message || "Upload failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = () => {
    void submitPayload({ ...scope, questions });
  };

  const handleJsonSubmit = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      void submitPayload(parsed);
    } catch {
      setError("Invalid JSON format");
    }
  };

  const loadSample = () => {
    setJsonInput(JSON.stringify(samplePayload, null, 2));
    setError(null);
    setResult(null);
  };

  const hasQuestionText = questions.some((question) => question.text.en.trim());

  return (
    <div className="space-y-6">
      <p className="text-sm text-surface-200/60">
        Create current affairs quiz questions with English and Malayalam fields. Maximum {maxItems} questions per batch.
      </p>

      {result && (
        <div className="glass-card p-5 border-success-500/30 animate-slide-up">
          <h3 className="text-sm font-semibold text-success-500 mb-3">Upload complete</h3>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-success-500">{result.created}</p>
              <p className="text-xs text-surface-200/40">Created</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">{result.skipped}</p>
              <p className="text-xs text-surface-200/40">Skipped</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-error-500">{result.errors.length}</p>
              <p className="text-xs text-surface-200/40">Errors</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-error-500/10 rounded-lg p-3 mt-2 space-y-1">
              {result.errors.map((entry, index) => (
                <p key={index} className="text-xs text-error-500/70">{entry}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-error-500/10 border border-error-500/30">
          <p className="text-sm text-error-500">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {questions.map((question, questionIndex) => (
          <div key={questionIndex} className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-primary-300">Question {questionIndex + 1}</span>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(questionIndex)}
                  className="text-xs text-error-500/70 hover:text-error-500 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-[11px] text-surface-200/50 mb-1 block">Question EN *</span>
                <textarea
                  rows={3}
                  value={question.text.en}
                  onChange={(event) => updateQuestion(questionIndex, (current) => ({
                    ...current,
                    text: { ...current.text, en: event.target.value },
                  }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-none focus:border-primary-400/50 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-surface-200/50 mb-1 block">Question ML</span>
                <textarea
                  rows={3}
                  value={question.text.ml}
                  onChange={(event) => updateQuestion(questionIndex, (current) => ({
                    ...current,
                    text: { ...current.text, ml: event.target.value },
                  }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-none focus:border-primary-400/50 focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-4 space-y-3">
              {question.options.map((option, optionIndex) => (
                <div key={option.key} className="grid gap-3 md:grid-cols-[44px_1fr_1fr] md:items-end">
                  <div className="h-10 rounded-lg bg-primary-500/15 text-primary-300 flex items-center justify-center text-sm font-bold">
                    {option.key}
                  </div>
                  <label className="block">
                    <span className="text-[11px] text-surface-200/50 mb-1 block">Option {option.key} EN *</span>
                    <input
                      value={option.en}
                      onChange={(event) => updateQuestion(questionIndex, (current) => ({
                        ...current,
                        options: current.options.map((entry, idx) => idx === optionIndex ? { ...entry, en: event.target.value } : entry),
                      }))}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-surface-200/50 mb-1 block">Option {option.key} ML</span>
                    <input
                      value={option.ml}
                      onChange={(event) => updateQuestion(questionIndex, (current) => ({
                        ...current,
                        options: current.options.map((entry, idx) => idx === optionIndex ? { ...entry, ml: event.target.value } : entry),
                      }))}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                    />
                  </label>
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-[140px_120px_1fr] mt-4">
              <label className="block">
                <span className="text-[11px] text-surface-200/50 mb-1 block">Answer</span>
                <select
                  value={question.correctOption}
                  onChange={(event) => updateQuestion(questionIndex, (current) => ({
                    ...current,
                    correctOption: event.target.value as CAQuestion["correctOption"],
                  }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                >
                  {OPTION_KEYS.map((key) => <option key={key} value={key}>{key}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] text-surface-200/50 mb-1 block">Difficulty</span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={question.difficulty}
                  onChange={(event) => updateQuestion(questionIndex, (current) => ({
                    ...current,
                    difficulty: Number(event.target.value),
                  }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-surface-200/50 mb-1 block">Tags</span>
                <input
                  value={question.tags.join(", ")}
                  onChange={(event) => updateQuestion(questionIndex, (current) => ({
                    ...current,
                    tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean),
                  }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2 mt-4">
              <label className="block">
                <span className="text-[11px] text-surface-200/50 mb-1 block">Explanation EN</span>
                <textarea
                  rows={2}
                  value={question.explanation.en}
                  onChange={(event) => updateQuestion(questionIndex, (current) => ({
                    ...current,
                    explanation: { ...current.explanation, en: event.target.value },
                  }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-none focus:border-primary-400/50 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-surface-200/50 mb-1 block">Explanation ML</span>
                <textarea
                  rows={2}
                  value={question.explanation.ml}
                  onChange={(event) => updateQuestion(questionIndex, (current) => ({
                    ...current,
                    explanation: { ...current.explanation, ml: event.target.value },
                  }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-none focus:border-primary-400/50 focus:outline-none"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={addQuestion}
          disabled={questions.length >= maxItems}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-surface-200 hover:bg-white/10 disabled:opacity-40 transition-all"
        >
          Add question
        </button>
        <button
          type="button"
          onClick={handleFormSubmit}
          disabled={loading || !hasQuestionText}
          className="px-6 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
        >
          {loading ? "Uploading..." : `Upload ${questions.length} question${questions.length === 1 ? "" : "s"}`}
        </button>
      </div>

      <div className="glass-card-light p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-surface-200/70">Bulk import API</h3>
            <p className="text-xs text-surface-200/40">POST JSON to /api/admin/ca/bulk, or use the scoped endpoint for this page.</p>
          </div>
          <button
            type="button"
            onClick={loadSample}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-primary-300 hover:bg-white/10 transition-all"
          >
            Load sample data
          </button>
        </div>
        <textarea
          value={jsonInput}
          onChange={(event) => setJsonInput(event.target.value)}
          rows={10}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono resize-none focus:border-primary-400/50 focus:outline-none"
          placeholder={payloadPreview}
          spellCheck={false}
        />
        <button
          type="button"
          onClick={handleJsonSubmit}
          disabled={loading || !jsonInput.trim()}
          className="mt-3 px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 disabled:opacity-30 transition-all"
        >
          Import JSON
        </button>
      </div>
    </div>
  );
}
