"use client";

import { useState } from "react";

const SAMPLE_JSON = `[
  {
    "text": { "en": "Your question here?", "ml": "നിങ്ങളുടെ ചോദ്യം ഇവിടെ?" },
    "options": [
      { "key": "A", "en": "Option A", "ml": "ഓപ്ഷൻ A" },
      { "key": "B", "en": "Option B", "ml": "ഓപ്ഷൻ B" },
      { "key": "C", "en": "Option C", "ml": "ഓപ്ഷൻ C" },
      { "key": "D", "en": "Option D", "ml": "ഓപ്ഷൻ D" }
    ],
    "correctOption": "A",
    "explanation": { "en": "Explanation here", "ml": "വിശദീകരണം" },
    "topicId": "history",
    "subTopic": "kerala_history",
    "difficulty": 2,
    "questionStyle": "direct",
    "examTags": ["ldc", "lgs"],
    "tags": ["tag1", "tag2"]
  }
]`;

export default function ImportPage() {
  const [jsonInput, setJsonInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<unknown[] | null>(null);

  const handlePreview = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        setError("Input must be a JSON array of questions");
        return;
      }
      setPreview(parsed);
      setError(null);
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
        body: JSON.stringify({ questions: preview }),
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
    <div className="animate-fade-in max-w-3xl">
      <p className="text-sm text-surface-200/60 mb-6">
        Import questions in bulk using JSON format. Maximum 100 questions per batch.
        Duplicate questions (same English text) will be skipped.
      </p>

      {/* Result Banner */}
      {result && (
        <div className="glass-card p-5 mb-6 border-success-500/30 animate-slide-up">
          <h3 className="text-sm font-semibold text-success-500 mb-3">✅ Import Complete</h3>
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
            <div className="bg-error-500/10 rounded-lg p-3 mt-2">
              <p className="text-xs font-semibold text-error-500 mb-1">Errors:</p>
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs text-error-500/70">{err}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* File Upload */}
      <div className="glass-card-light p-4 mb-4 flex items-center gap-4">
        <label
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-surface-200 cursor-pointer hover:bg-white/10 transition-all"
        >
          📄 Upload JSON File
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
        <span className="text-xs text-surface-200/30">or paste JSON below</span>
      </div>

      {/* JSON Input */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-surface-200/60 font-semibold">Questions JSON</label>
          <button
            onClick={() => setJsonInput(SAMPLE_JSON)}
            className="text-[11px] text-primary-400 hover:text-primary-300 transition-all"
          >
            Load sample template
          </button>
        </div>
        <textarea
          value={jsonInput}
          onChange={(e) => { setJsonInput(e.target.value); setPreview(null); setError(null); }}
          rows={14}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono resize-none focus:border-primary-400/50 focus:outline-none"
          placeholder="Paste your JSON array here..."
          spellCheck={false}
        />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-error-500/10 border border-error-500/30 mb-4">
          <p className="text-sm text-error-500">{error}</p>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="glass-card p-5 mb-4 animate-fade-in">
          <h3 className="text-sm font-semibold text-surface-200/60 mb-3">
            Preview ({preview.length} questions)
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {preview.map((q: unknown, i: number) => {
              const question = q as { text?: { en?: string }; topicId?: string; correctOption?: string };
              return (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 text-sm">
                  <span className="text-xs text-surface-200/30 w-6">#{i + 1}</span>
                  <span className="flex-1 text-white truncate">{question.text?.en || "No text"}</span>
                  <span className="text-[10px] text-primary-300 px-2 py-0.5 rounded-full bg-primary-500/20">
                    {question.topicId || "?"}
                  </span>
                  <span className="text-[10px] text-surface-200/40">Ans: {question.correctOption || "?"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!preview ? (
          <button
            onClick={handlePreview}
            disabled={!jsonInput.trim()}
            className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 disabled:opacity-30 transition-all"
          >
            Preview Questions
          </button>
        ) : (
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-6 py-3 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {importing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Importing...
              </span>
            ) : (
              `Import ${preview.length} Questions`
            )}
          </button>
        )}
      </div>

      {/* Format Reference */}
      <div className="glass-card-light p-5 mt-8">
        <h3 className="text-sm font-semibold text-surface-200/60 mb-3">📋 JSON Format Reference</h3>
        <div className="text-xs text-surface-200/40 space-y-1">
          <p><code className="text-primary-300">text.en</code> — Question in English (required)</p>
          <p><code className="text-primary-300">text.ml</code> — Question in Malayalam (optional)</p>
          <p><code className="text-primary-300">options</code> — Array of 4 objects with key (A-D), en, ml</p>
          <p><code className="text-primary-300">correctOption</code> — &quot;A&quot;, &quot;B&quot;, &quot;C&quot;, or &quot;D&quot; (required)</p>
          <p><code className="text-primary-300">explanation</code> — {`{ en, ml }`} (optional)</p>
          <p><code className="text-primary-300">topicId</code> — history, geography, polity, science, current_affairs, language, reasoning, gk</p>
          <p><code className="text-primary-300">difficulty</code> — 1 to 5 (default: 2)</p>
          <p><code className="text-primary-300">questionStyle</code> — direct, concept, statement, negative, indirect (default: direct)</p>
          <p><code className="text-primary-300">examTags</code> — [ldc, lgs, degree, police]</p>
        </div>
      </div>
    </div>
  );
}
