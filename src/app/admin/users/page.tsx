"use client";

import { useEffect, useState, useCallback } from "react";

interface UserRow {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  targetExam: string;
  stats?: {
    totalXP?: number;
    currentStreak?: number;
    totalAttempted?: number;
    accuracy?: number;
  };
  createdAt: string;
}

interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);

    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    if (data.success) {
      setUsers(data.data);
      setMeta(data.meta);
    }
    setLoading(false);
  }, [search]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <div className="animate-fade-in">
      {/* Toolbar */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-surface-200/30 focus:border-primary-400/50 focus:outline-none transition-all"
        />
      </div>

      <div className="flex items-center gap-4 mb-4 text-xs text-surface-200/40">
        <span>Total: <strong className="text-white">{meta.total}</strong></span>
        <span>Page: <strong className="text-white">{meta.page}/{meta.totalPages || 1}</strong></span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl block mb-4">👥</span>
          <p className="text-surface-200/60">No users found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-surface-200/40 border-b border-white/5">
                <th className="pb-3 font-semibold">User</th>
                <th className="pb-3 font-semibold">Role</th>
                <th className="pb-3 font-semibold">Exam</th>
                <th className="pb-3 font-semibold text-right">XP</th>
                <th className="pb-3 font-semibold text-right">Streak</th>
                <th className="pb-3 font-semibold text-right">Questions</th>
                <th className="pb-3 font-semibold text-right">Accuracy</th>
                <th className="pb-3 font-semibold text-right">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr
                  key={user._id}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-all animate-fade-in"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-700 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                        {user.image ? (
                          <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          user.name[0]
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user.name}</p>
                        <p className="text-[11px] text-surface-200/40 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      user.role === "admin"
                        ? "bg-primary-500/20 text-primary-300"
                        : "bg-white/5 text-surface-200/40"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-surface-200/60 uppercase">{user.targetExam || "—"}</span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm font-bold text-accent-400">{user.stats?.totalXP || 0}</span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm text-orange-400">
                      {user.stats?.currentStreak ? `🔥${user.stats.currentStreak}` : "—"}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm text-surface-200/60">{user.stats?.totalAttempted || 0}</span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm text-surface-200/60">
                      {user.stats?.accuracy ? `${user.stats.accuracy}%` : "—"}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-xs text-surface-200/30">
                      {new Date(user.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", year: "2-digit",
                      })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => fetchUsers(meta.page - 1)}
            disabled={meta.page <= 1}
            className="px-4 py-2 rounded-lg text-sm bg-white/5 text-surface-200/60 hover:bg-white/10 disabled:opacity-30 transition-all"
          >
            ← Prev
          </button>
          <span className="text-sm text-surface-200/40 px-4">
            {meta.page} / {meta.totalPages}
          </span>
          <button
            onClick={() => fetchUsers(meta.page + 1)}
            disabled={meta.page >= meta.totalPages}
            className="px-4 py-2 rounded-lg text-sm bg-white/5 text-surface-200/60 hover:bg-white/10 disabled:opacity-30 transition-all"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
