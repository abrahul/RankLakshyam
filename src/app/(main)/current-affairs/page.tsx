"use client";

import { useState, useEffect } from "react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

interface CAItem {
  _id: string;
  text: { en: string; ml: string };
}

type Tab = "daily" | "monthly";

export default function CurrentAffairsPage() {
  const now = new Date();
  const [tab, setTab] = useState<Tab>("daily");
  const [date, setDate] = useState(now.toISOString().slice(0, 10));
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [lang, setLang] = useState<"en" | "ml">("en");
  const [items, setItems] = useState<CAItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        tab === "daily"
          ? `/api/ca/daily?date=${date}`
          : `/api/ca/monthly?month=${month}&year=${year}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setItems(data.data);
      else setError(data.error?.message || "Failed to load");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [tab, date, month, year]); // eslint-disable-line

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i);

  return (
    <div className="px-4 pt-6 md:p-8 md:pt-10 animate-fade-in max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2 font-[family-name:var(--font-display)]">
        📰 Current Affairs
      </h1>
      <p className="text-sm text-surface-200/60 mb-6">Stay updated with latest current affairs</p>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-5">
        {(["daily", "monthly"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
              tab === t
                ? "gradient-primary text-white"
                : "bg-white/5 text-surface-200/60 hover:bg-white/10"
            }`}
          >
            {t === "daily" ? "📅 Daily" : "📆 Monthly"}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {(["en", "ml"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                lang === l
                  ? "bg-primary-500/20 text-primary-300 border border-primary-500/30"
                  : "bg-white/5 text-surface-200/50 hover:bg-white/10"
              }`}
            >
              {l === "en" ? "EN" : "മ"}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      {tab === "daily" ? (
        <div className="glass-card-light p-4 mb-5 flex items-center gap-3">
          <span className="text-xs text-surface-200/60 font-semibold">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
          />
        </div>
      ) : (
        <div className="glass-card-light p-4 mb-5 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-200/60 font-semibold">Month</span>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
            >
              {MONTHS.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-200/60 font-semibold">Year</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/30">
          <p className="text-sm text-error-500">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <span className="text-4xl mb-3 block">📭</span>
          <p className="text-surface-200/50 text-sm">No current affairs for this {tab === "daily" ? "date" : "month"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={item._id} className="glass-card p-5 flex gap-4 group hover:border-primary-500/20 transition-all">
              <span className="text-2xl font-bold text-primary-400/30 leading-none select-none pt-0.5 w-8 text-right flex-shrink-0">
                {i + 1}
              </span>
              <p className="text-sm text-surface-200 leading-relaxed">
                {lang === "ml" && item.text.ml ? item.text.ml : item.text.en}
              </p>
            </div>
          ))}
          <p className="text-xs text-surface-200/30 text-center pt-2">{items.length} items</p>
        </div>
      )}
    </div>
  );
}
