import CurrentAffair from "@/lib/db/models/CurrentAffair";

export interface CAEntryInput {
  question_en: string;
  question_ml: string;
  answer_en: string;
  answer_ml: string;
  explanation_en?: string;
  explanation_ml?: string;
  is_important?: boolean;
  date?: string; // YYYY-MM-DD, only for monthly bulk (optional per entry)
}

export interface ValidationError {
  index: number;
  message: string;
}

export interface BulkResult {
  inserted: number;
  skipped: number;
  errors: ValidationError[];
}

// ── Validate entries ──────────────────────────────────────────────────────────

export function validateEntries(entries: unknown[]): {
  valid: CAEntryInput[];
  errors: ValidationError[];
} {
  const valid: CAEntryInput[] = [];
  const errors: ValidationError[] = [];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i] as Record<string, unknown>;
    const label = `Entry ${i + 1}`;

    if (!e.question_en || typeof e.question_en !== "string" || !e.question_en.trim()) {
      errors.push({ index: i, message: `${label}: question_en required` });
      continue;
    }
    if (!e.question_ml || typeof e.question_ml !== "string" || !e.question_ml.trim()) {
      errors.push({ index: i, message: `${label}: question_ml required` });
      continue;
    }
    if (!e.answer_en || typeof e.answer_en !== "string" || !e.answer_en.trim()) {
      errors.push({ index: i, message: `${label}: answer_en required` });
      continue;
    }
    if (!e.answer_ml || typeof e.answer_ml !== "string" || !e.answer_ml.trim()) {
      errors.push({ index: i, message: `${label}: answer_ml required` });
      continue;
    }

    valid.push({
      question_en: e.question_en.trim(),
      question_ml: e.question_ml.trim(),
      answer_en: e.answer_en.trim(),
      answer_ml: e.answer_ml.trim(),
      explanation_en: typeof e.explanation_en === "string" ? e.explanation_en.trim() : "",
      explanation_ml: typeof e.explanation_ml === "string" ? e.explanation_ml.trim() : "",
      is_important: !!e.is_important,
      ...(typeof e.date === "string" ? { date: e.date } : {}),
    });
  }

  return { valid, errors };
}

// ── Bulk insert by date ───────────────────────────────────────────────────────

export async function bulkInsertByDate(
  dateStr: string,
  entries: CAEntryInput[]
): Promise<BulkResult> {
  const d = new Date(dateStr);
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  const source_batch = `${dateStr}-daily`;

  const docs = entries.map((e) => ({
    question_en: e.question_en,
    question_ml: e.question_ml,
    answer_en: e.answer_en,
    answer_ml: e.answer_ml,
    explanation_en: e.explanation_en ?? "",
    explanation_ml: e.explanation_ml ?? "",
    date: d,
    month,
    year,
    source_batch,
    is_important: e.is_important ?? false,
  }));

  return runBulkInsert(docs);
}

// ── Bulk insert by month ──────────────────────────────────────────────────────

export async function bulkInsertByMonth(
  month: number,
  year: number,
  entries: CAEntryInput[]
): Promise<BulkResult> {
  const source_batch = `${year}-${String(month).padStart(2, "0")}-monthly`;

  const docs = entries.map((e) => {
    let date: Date | null = null;
    if (e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
      date = new Date(e.date);
    }
    return {
      question_en: e.question_en,
      question_ml: e.question_ml,
      answer_en: e.answer_en,
      answer_ml: e.answer_ml,
      explanation_en: e.explanation_en ?? "",
      explanation_ml: e.explanation_ml ?? "",
      date,
      month,
      year,
      source_batch,
      is_important: e.is_important ?? false,
    };
  });

  return runBulkInsert(docs);
}

// ── Internal: ordered insertMany with duplicate skipping ─────────────────────

type CADoc = {
  question_en: string;
  question_ml: string;
  answer_en: string;
  answer_ml: string;
  explanation_en: string;
  explanation_ml: string;
  date: Date | null;
  month: number;
  year: number;
  source_batch: string;
  is_important: boolean;
};

async function runBulkInsert(docs: CADoc[]): Promise<BulkResult> {
  const result: BulkResult = { inserted: 0, skipped: 0, errors: [] };

  if (docs.length === 0) return result;

  try {
    // ordered:false → continue on duplicate key errors
    const res = await CurrentAffair.insertMany(docs, {
      ordered: false,
      rawResult: true,
    });
    result.inserted = (res as { insertedCount?: number }).insertedCount ?? docs.length;
    result.skipped = docs.length - result.inserted;
  } catch (err: unknown) {
    // Mongoose bulk write error — partial inserts may have succeeded
    const bulkErr = err as {
      insertedDocs?: unknown[];
      writeErrors?: Array<{ errmsg?: string; index?: number }>;
    };

    result.inserted = bulkErr.insertedDocs?.length ?? 0;
    const writeErrors = bulkErr.writeErrors ?? [];
    result.skipped = writeErrors.length;

    for (const we of writeErrors) {
      // 11000 = duplicate key — treat as skip, not error
      if (!we.errmsg?.includes("11000")) {
        result.errors.push({
          index: we.index ?? -1,
          message: we.errmsg ?? "Unknown write error",
        });
      }
    }

    // if ALL failures are dupes, don't throw
    if (result.errors.length > 0) {
      throw err;
    }
  }

  return result;
}
