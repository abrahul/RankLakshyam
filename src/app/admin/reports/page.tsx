"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface ReportRow {
  _id: string;
  type: string;
  description: string;
  questionId?: string;
  pageUrl?: string;
  userId?: { _id: string; name: string; email: string };
  status: "open" | "in-progress" | "resolved";
  adminNotes?: string;
  createdAt: string;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (typeFilter !== "all") params.set("type", typeFilter);

    const res = await fetch(`/api/admin/reports?${params}`);
    const data = await res.json();
    if (data.success) {
      setReports(data.data);
    }
    setLoading(false);
  }, [statusFilter, typeFilter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchReports(); }, [fetchReports]);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setReports((prev) => prev.map((r) => r._id === id ? { ...r, status: newStatus as any } : r));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const updateNotes = async (id: string, notes: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes: notes }),
      });
      if (res.ok) {
        setReports((prev) => prev.map((r) => r._id === id ? { ...r, adminNotes: notes } : r));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      question_error: "Question Error",
      wrong_answer: "Wrong Answer",
      explanation_issue: "Explanation Issue",
      app_bug: "App Bug",
      other: "Other",
    };
    return labels[type] || type;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="question_error">Question Error</option>
          <option value="wrong_answer">Wrong Answer</option>
          <option value="explanation_issue">Explanation Issue</option>
          <option value="app_bug">App Bug</option>
          <option value="other">Other</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl block mb-4">🚩</span>
          <p className="text-surface-200/60">No reports found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report._id} className="glass-card p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      report.status === "open" ? "bg-error-500/20 text-error-400" :
                      report.status === "in-progress" ? "bg-warning-500/20 text-warning-400" :
                      "bg-success-500/20 text-success-400"
                    }`}>
                      {report.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-primary-400 font-medium px-2 py-0.5 rounded-full bg-primary-500/10">
                      {getTypeLabel(report.type)}
                    </span>
                    <span className="text-xs text-surface-200/40">
                      {new Date(report.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-white mt-2 whitespace-pre-wrap">{report.description}</p>
                </div>
                
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <select
                    value={report.status}
                    onChange={(e) => updateStatus(report._id, e.target.value)}
                    disabled={updatingId === report._id}
                    className="bg-white/5 border border-white/10 text-xs rounded px-2 py-1 text-white focus:outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-surface-200/50 pt-2 border-t border-white/5">
                {report.userId ? (
                  <span>User: {report.userId.name} ({report.userId.email})</span>
                ) : (
                  <span>Anonymous User</span>
                )}
                {report.questionId && (
                  <span className="flex items-center gap-1">
                    Question ID: <Link href={`/admin/questions?search=${report.questionId}`} className="font-mono text-primary-400 hover:underline">{report.questionId}</Link>
                  </span>
                )}
                {report.pageUrl && (
                  <span>Route: <Link href={report.pageUrl} target="_blank" rel="noreferrer" className="text-primary-400 hover:underline">{report.pageUrl}</Link></span>
                )}
              </div>

              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Add admin notes..."
                  defaultValue={report.adminNotes || ""}
                  onBlur={(e) => {
                    if (e.target.value !== report.adminNotes) {
                      updateNotes(report._id, e.target.value);
                    }
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-xs text-white placeholder:text-surface-200/30 focus:border-primary-400/50 focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
