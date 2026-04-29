"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useReportStore } from "@/lib/store/useReportStore";

export default function ReportModal() {
  const pathname = usePathname();
  const { isOpen, closeReport, questionId } = useReportStore();
  const [type, setType] = useState("app_bug");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setType(questionId ? "question_error" : "app_bug");
      setDescription("");
      setSuccess(false);
      setError(null);
    }
  }, [isOpen, questionId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          description,
          questionId,
          pageUrl: pathname,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          closeReport();
        }, 2000);
      } else {
        setError(data.error || "Failed to submit report");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-md p-6 relative">
        <button
          onClick={closeReport}
          className="absolute top-4 right-4 text-surface-200/50 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-white mb-4">
          {questionId ? "Report Question Issue" : "Report a Bug"}
        </h2>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-success-500/20 text-success-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              ✓
            </div>
            <p className="text-white font-medium">Report Submitted!</p>
            <p className="text-sm text-surface-200/60 mt-1">Thank you for helping us improve.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-200/80 mb-1">Issue Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
              >
                {questionId ? (
                  <>
                    <option value="question_error">Question Error</option>
                    <option value="wrong_answer">Wrong Answer</option>
                    <option value="explanation_issue">Explanation Issue</option>
                  </>
                ) : (
                  <>
                    <option value="app_bug">App Bug</option>
                    <option value="other">Other</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-200/80 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the issue in detail..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 min-h-[100px] resize-none"
                required
              />
            </div>

            {error && <div className="p-3 bg-error-500/10 border border-error-500/20 text-error-500 text-sm rounded-lg">{error}</div>}

            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className="w-full py-3 rounded-lg gradient-primary text-white font-semibold disabled:opacity-50 transition-all"
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
