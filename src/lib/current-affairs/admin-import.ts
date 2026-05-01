import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";
import { DEFAULT_QUESTION_STYLE, QUESTION_STYLE_VALUES, type QuestionStyle } from "@/lib/question-styles";

type CAScope =
  | { caType: "daily"; date: string }
  | { caType: "monthly"; month: number; year: number };

type ImportResults = {
  created: number;
  skipped: number;
  errors: string[];
};

const CURRENT_AFFAIRS_CATEGORY_ID = new mongoose.Types.ObjectId("000000000000000000000000");
const OPTION_KEYS = ["A", "B", "C", "D"] as const;

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readBilingualText(raw: Record<string, unknown>, fallbackEnKey: string, fallbackMlKey: string) {
  const nested = raw.text && typeof raw.text === "object" ? raw.text as Record<string, unknown> : null;
  return {
    en: readText(nested?.en ?? raw[fallbackEnKey]),
    ml: readText(nested?.ml ?? raw[fallbackMlKey]),
  };
}

function normalizeOptions(rawOptions: unknown) {
  if (!Array.isArray(rawOptions)) return null;
  const byKey = new Map<string, Record<string, unknown>>();
  rawOptions.forEach((option) => {
    if (!option || typeof option !== "object") return;
    const entry = option as Record<string, unknown>;
    const key = readText(entry.key).toUpperCase();
    if (OPTION_KEYS.includes(key as (typeof OPTION_KEYS)[number])) {
      byKey.set(key, entry);
    }
  });

  return OPTION_KEYS.map((key, index) => {
    const source = byKey.get(key) ?? (rawOptions[index] && typeof rawOptions[index] === "object" ? rawOptions[index] as Record<string, unknown> : {});
    return {
      key,
      en: readText(source.en),
      ml: readText(source.ml),
    };
  });
}

function getQuestionStyle(value: unknown): QuestionStyle {
  return typeof value === "string" && QUESTION_STYLE_VALUES.includes(value as QuestionStyle)
    ? value as QuestionStyle
    : DEFAULT_QUESTION_STYLE;
}

function getTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((tag) => readText(tag)).filter(Boolean);
}

function getDifficulty(value: unknown): 1 | 2 | 3 | 4 | 5 {
  const difficulty = Number(value);
  return difficulty === 1 || difficulty === 2 || difficulty === 3 || difficulty === 4 || difficulty === 5
    ? difficulty
    : 2;
}

function describeEntry(index: number, text: string) {
  const preview = text.replace(/\s+/g, " ").slice(0, 80);
  return preview ? `Q${index + 1} (${preview})` : `Q${index + 1}`;
}

export function parseCAScope(body: Record<string, unknown>): CAScope | { error: string } {
  const caType = readText(body.caType || body.type).toLowerCase();
  const date = readText(body.date);
  const month = Number(body.month);
  const year = Number(body.year);

  if (caType === "daily" || date) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { error: "date YYYY-MM-DD required for daily current affairs" };
    }
    return { caType: "daily", date };
  }

  if (caType === "monthly" || month || year) {
    if (!month || month < 1 || month > 12 || !year || year < 2000 || year > 2100) {
      return { error: "month (1-12) and year required for monthly current affairs" };
    }
    return { caType: "monthly", month, year };
  }

  return { error: "caType must be daily or monthly" };
}

export function getCAEntries(body: Record<string, unknown>) {
  const entries = body.questions ?? body.items;
  return Array.isArray(entries) ? entries : null;
}

export async function importCurrentAffairsQuestions({
  entries,
  scope,
  createdBy,
  maxItems,
}: {
  entries: unknown[];
  scope: CAScope;
  createdBy: string;
  maxItems: number;
}): Promise<ImportResults> {
  if (!entries.length) {
    return { created: 0, skipped: 0, errors: ["questions/items array required"] };
  }

  if (entries.length > maxItems) {
    return { created: 0, skipped: entries.length, errors: [`Max ${maxItems} per batch`] };
  }

  await connectDB();
  const results: ImportResults = { created: 0, skipped: 0, errors: [] };

  for (let i = 0; i < entries.length; i++) {
    const raw = entries[i];
    if (!raw || typeof raw !== "object") {
      results.errors.push(`Q${i + 1}: question object required`);
      results.skipped++;
      continue;
    }

    const entry = raw as Record<string, unknown>;
    const text = readBilingualText(entry, "en", "ml");
    const label = describeEntry(i, text.en);
    const options = normalizeOptions(entry.options);
    const answer = readText(entry.correctOption ?? entry.answer).toUpperCase();
    const explanationSource = entry.explanation && typeof entry.explanation === "object"
      ? entry.explanation as Record<string, unknown>
      : {};
    const explanation = {
      en: readText(explanationSource.en),
      ml: readText(explanationSource.ml),
    };

    if (!text.en) {
      results.errors.push(`${label}: text.en is required`);
      results.skipped++;
      continue;
    }
    if (!options || options.some((option) => !option.en)) {
      results.errors.push(`${label}: options A-D with English text are required`);
      results.skipped++;
      continue;
    }
    if (!OPTION_KEYS.includes(answer as (typeof OPTION_KEYS)[number])) {
      results.errors.push(`${label}: answer/correctOption must be A, B, C, or D`);
      results.skipped++;
      continue;
    }

    const duplicateFilter: Record<string, unknown> = {
      "text.en": text.en,
      type: "current_affairs",
      caType: scope.caType,
      ...(scope.caType === "daily"
        ? { caDate: scope.date }
        : { caMonth: scope.month, caYear: scope.year }),
    };
    const existing = await Question.findOne(duplicateFilter).select({ _id: 1 }).lean();
    if (existing) {
      results.errors.push(`${label}: duplicate`);
      results.skipped++;
      continue;
    }

    await Question.create({
      text,
      options,
      answer,
      explanation,
      categoryId: CURRENT_AFFAIRS_CATEGORY_ID,
      topicId: "Current Affairs",
      tags: getTags(entry.tags),
      difficulty: getDifficulty(entry.difficulty),
      exam: readText(entry.exam),
      examCode: readText(entry.examCode),
      language: "en",
      questionStyle: getQuestionStyle(entry.questionStyle),
      type: "current_affairs",
      caType: scope.caType,
      ...(scope.caType === "daily"
        ? { caDate: scope.date }
        : { caMonth: scope.month, caYear: scope.year }),
      status: "approved",
      isVerified: true,
      createdBy,
    });
    results.created++;
  }

  return results;
}

export const CURRENT_AFFAIRS_SAMPLE = {
  caType: "daily",
  date: "2026-05-01",
  questions: [
    {
      text: {
        en: "Which state launched the Green Hydrogen Valley project in April 2026?",
        ml: "2026 ഏപ്രിലിൽ ഗ്രീൻ ഹൈഡ്രജൻ വാലി പദ്ധതി ആരംഭിച്ച സംസ്ഥാനം ഏത്?",
      },
      options: [
        { key: "A", en: "Kerala", ml: "കേരളം" },
        { key: "B", en: "Tamil Nadu", ml: "തമിഴ്നാട്" },
        { key: "C", en: "Karnataka", ml: "കർണാടക" },
        { key: "D", en: "Maharashtra", ml: "മഹാരാഷ്ട്ര" },
      ],
      correctOption: "A",
      explanation: {
        en: "Use this field for a short source-backed explanation.",
        ml: "ചുരുക്കത്തിലുള്ള വിശദീകരണം ഇവിടെ ചേർക്കുക.",
      },
      tags: ["current-affairs", "environment"],
      difficulty: 2,
      questionStyle: "direct",
    },
  ],
};
