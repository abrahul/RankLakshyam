"use client";

import { useState, useEffect } from "react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

interface CAItem {
  _id: string;
  question_en: string;
  question_ml: string;
  answer_en: string;
  answer_ml: string;
  explanation_en: string;
  explanation_ml: string;
  date: string | null;
  month: number;
  year: number;
  is_important: boolean;
}

type Tab = "daily" | "monthly";
type Lang = "en" | "ml" | "both";

export default function CurrentAffairsPage() {
  const now = new Date();
  const [tab, setTab] = useState<Tab>("daily");
  const [date, setDate] = useState(now.toISOString().slice(0, 10));
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [lang, setLang] = useState<Lang>("both");
  const [items, setItems] = useState<CAItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const targetMonth = tab === "daily" ? parseInt(date.slice(5, 7)) : month;
      const targetYear = tab === "daily" ? parseInt(date.slice(0, 4)) : year;
      
      let url = `/api/ca?month=${targetMonth}&year=${targetYear}`;
      if (tab === "daily") {
        url += `&date=${date}`;
      }
      
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
    <div className="px-4 pt-6 md:p-8 md:pt-10 animate-fade-in max-w-3xl mx-auto pb-20">
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
        <div className="ml-auto flex gap-1">
          {(["en", "ml", "both"] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-all uppercase ${
                lang === l
                  ? "bg-primary-500/20 text-primary-300 border border-primary-500/30"
                  : "bg-white/5 text-surface-200/50 hover:bg-white/10"
              }`}
            >
              {l}
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
        <div className="space-y-4">
          {items.map((item, i) => (
            <CAItemCard key={item._id} item={item} index={i} lang={lang} />
          ))}
          <p className="text-xs text-surface-200/30 text-center pt-2">{items.length} items</p>
        </div>
      )}
    </div>
  );
}

// ─── Item Card ───────────────────────────────────────────────────────────────

function CAItemCard({ item, index, lang }: { item: CAItem; index: number; lang: Lang }) {
  const [expanded, setExpanded] = useState(false);

  const hasExplanation = 
    (lang === "en" || lang === "both") && item.explanation_en ||
    (lang === "ml" || lang === "both") && item.explanation_ml;

  return (
    <div className="glass-card p-5 relative group hover:border-primary-500/30 transition-all">
      {item.is_important && (
        <span className="absolute top-3 right-3 text-lg" title="Important">⭐</span>
      )}
      
      <div className="flex gap-4 mb-4">
        <span className="text-2xl font-bold text-primary-400/30 leading-none select-none pt-0.5 w-8 text-right flex-shrink-0">
          {index + 1}
        </span>
        <div className="space-y-2 flex-1 pt-1">
          {/* Question */}
          <div className="space-y-1">
            {(lang === "en" || lang === "both") && (
              <p className="text-[15px] font-semibold text-white leading-snug">{item.question_en}</p>
            )}
            {(lang === "ml" || lang === "both") && (
              <p className="text-[15px] text-surface-200/90 leading-snug">{item.question_ml}</p>
            )}
          </div>
          
          {/* Answer */}
          <div className="mt-3 p-3 rounded-lg bg-primary-500/10 border border-primary-500/20 inline-block w-full">
            <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider mb-1 block">Answer</span>
            <div className="space-y-0.5">
              {(lang === "en" || lang === "both") && (
                <p className="text-sm font-semibold text-primary-300">{item.answer_en}</p>
              )}
              {(lang === "ml" || lang === "both") && (
                <p className="text-sm text-primary-200/80">{item.answer_ml}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Explanation */}
      {hasExplanation && (
        <div className="ml-12">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs font-semibold text-surface-200/50 hover:text-surface-200 transition-colors"
          >
            {expanded ? "▼ Hide Explanation" : "▶ Show Explanation"}
          </button>
          
          {expanded && (
            <div className="mt-3 p-4 rounded-lg bg-white/5 border border-white/10 space-y-2 animate-slide-up">
              {(lang === "en" || lang === "both") && item.explanation_en && (
                <p className="text-sm text-surface-200 leading-relaxed">{item.explanation_en}</p>
              )}
              {(lang === "ml" || lang === "both") && item.explanation_ml && (
                <p className="text-sm text-surface-200/80 leading-relaxed">{item.explanation_ml}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
