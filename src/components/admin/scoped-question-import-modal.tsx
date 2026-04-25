"use client";

import { useMemo, useState } from "react";
import { QUESTION_STYLE_VALUES } from "@/lib/question-styles";

type ScopedQuestionImportModalProps = {
  open: boolean;
  onClose: () => void;
  scopeLabel: string;
  topicId: string;
  subtopicId?: string;
};

const SAMPLE_JSON = `[
  {
    "text": { "en": "Your question here?", "ml": "Your Malayalam question here" },
    "options": [
      { "key": "A", "en": "Option A", "ml": "Option A" },
      { "key": "B", "en": "Option B", "ml": "Option B" },
      { "key": "C", "en": "Option C", "ml": "Option C" },
      { "key": "D", "en": "Option D", "ml": "Option D" }
    ],
    "correctOption": "A",
    "explanation": { "en": "Explanation here", "ml": "Explanation here" },
    "difficulty": 2,
    "questionStyle": "direct",
    "exam": "LDC VARIOUS",
    "examCode": "117/21",
    "tags": ["tag1", "tag2"]
  }
]`;

export default function ScopedQuestionImportModal({
  open,
  onClose,
  scopeLabel,
  topicId,
  subtopicId,
}: ScopedQuestionImportModalProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [preview, setPreview] = useState<unknown[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const helperText = useMemo(
    () =>
      subtopicId
        ? "Questions imported here inherit both the topic and subtopic automatically."
        : "Questions imported here inherit the topic automatically.",
    [subtopicId]
  );

  if (!open) return null;

  const resetState = () => {
    setJsonInput("");
    setPreview(null);
    setImporting(false);
    setError(null);
    setResult(null);
  };

  const closeModal = () => {
    resetState();
    onClose();
  };

  const handlePreview = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        setError("Input must be a JSON array of questions");
        return;
      }
      setPreview(parsed);
      setError(null);
      setResult(null);
    } catch {
      setError("Invalid JSON format. Please check your syntax.");
      setPreview(null);
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/admin/questions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: preview,
          topicId,
          ...(subtopicId ? { subtopicId } : {}),
        }),
      });
      const data = await res.json();

      if (data.success) {
        setResult(data.data);
        setPreview(null);
        setJsonInput("");
      } else {
        setError(data.error?.message || "Import failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setJsonInput(content);
      setPreview(null);
      setResult(null);
      setError(null);
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto bg-slate-950/70 backdrop-blur-sm"
      onClick={closeModal}
    >
      <div className="glass-card w-full max-w-4xl p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-lg font-semibold text-white">Bulk Import Questions</h3>
            <p className="text-sm text-surface-200/60 mt-1">{scopeLabel}</p>
            <p className="text-xs text-surface-200/40 mt-1">{helperText}</p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-surface-200/60 text-sm hover:bg-white/10"
          >
            Close
          </button>
        </div>

        {result ? (
          <div className="glass-card-light p-4 mb-4 border border-success-500/30">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-bold text-success-500">{result.created}</p>
                <p className="text-xs text-surface-200/40">Created</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">{result.skipped}</p>
                <p className="text-xs text-surface-200/40">Skipped</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-error-500">{result.errors.length}</p>
                <p className="text-xs text-surface-200/40">Errors</p>
              </div>
            </div>
            {result.errors.length > 0 ? (
              <div className="bg-error-500/10 rounded-lg p-3 mt-3">
                {result.errors.map((entry, index) => (
                  <p key={`${entry}-${index}`} className="text-xs text-error-500/70">
                    {entry}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="glass-card-light p-4 mb-4 flex items-center gap-4">
          <label className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-surface-200 cursor-pointer hover:bg-white/10 transition-all">
            Upload JSON File
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
          <span className="text-xs text-surface-200/30">or paste JSON below</span>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-surface-200/60 font-semibold">Questions JSON</label>
            <button
              type="button"
              onClick={() => setJsonInput(SAMPLE_JSON)}
              className="text-[11px] text-primary-400 hover:text-primary-300 transition-all"
            >
              Load sample template
            </button>
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              setPreview(null);
              setError(null);
            }}
            rows={14}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono resize-none focus:border-primary-400/50 focus:outline-none"
            placeholder="Paste your JSON array here..."
            spellCheck={false}
          />
        </div>

        {error ? (
          <div className="p-3 rounded-xl bg-error-500/10 border border-error-500/30 mb-4">
            <p className="text-sm text-error-500">{error}</p>
          </div>
        ) : null}

        {preview ? (
          <div className="glass-card-light p-4 mb-4">
            <h4 className="text-sm font-semibold text-surface-200/60 mb-3">Preview ({preview.length} questions)</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {preview.map((q: unknown, i: number) => {
                const question = q as { text?: { en?: string }; correctOption?: string; answer?: string };
                return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 text-sm">
                    <span className="text-xs text-surface-200/30 w-6">#{i + 1}</span>
                    <span className="flex-1 text-white truncate">{question.text?.en || "No text"}</span>
                    <span className="text-[10px] text-surface-200/40">
                      Ans: {question.correctOption || question.answer || "?"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex gap-3">
          {!preview ? (
            <button
              type="button"
              onClick={handlePreview}
              disabled={!jsonInput.trim()}
              className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 disabled:opacity-30 transition-all"
            >
              Preview Questions
            </button>
          ) : (
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="px-6 py-3 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {importing ? "Importing..." : `Import ${preview.length} Questions`}
            </button>
          )}
        </div>

        <div className="glass-card-light p-4 mt-6">
          <h4 className="text-sm font-semibold text-surface-200/60 mb-3">Format Reference</h4>
          <div className="text-xs text-surface-200/40 space-y-1">
            <p><code className="text-primary-300">text.en</code> - Question in English (required)</p>
            <p><code className="text-primary-300">options</code> - Array of 4 objects with key (A-D), en, ml</p>
            <p><code className="text-primary-300">correctOption</code> - &quot;A&quot;, &quot;B&quot;, &quot;C&quot;, or &quot;D&quot; (required)</p>
            <p><code className="text-primary-300">explanation</code> - {`{ en, ml }`} (optional)</p>
            <p><code className="text-primary-300">difficulty</code> - 1 to 5 (default: 2)</p>
            <p><code className="text-primary-300">questionStyle</code> - {QUESTION_STYLE_VALUES.join(", ")}</p>
            <p><code className="text-primary-300">categoryId</code> - Optional. If omitted, the topic&apos;s primary category is used.</p>
            <p><code className="text-primary-300">exam</code> and <code className="text-primary-300">examCode</code> - Optional metadata</p>
            <p><code className="text-primary-300">topicId</code> / <code className="text-primary-300">subtopicId</code> - Optional in this scoped modal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
