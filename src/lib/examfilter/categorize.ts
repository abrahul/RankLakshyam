import examIndex from "@/lib/examfilter/exam_index_complete.json";

export type PscLevel = "10th_level" | "plus2_level" | "degree_level" | "other_exams";

type ExamEntry = { exam: string; code: string };
type ExamIndex = Record<PscLevel, ExamEntry[]>;

export type CategorizationResult = {
  level: PscLevel;
  exam: string;
  confidence: number;
};

type CompiledExamIndex = {
  codeToExam: Map<string, { level: PscLevel; exam: string }>;
  exams: Array<{ level: PscLevel; exam: string; code: string; norm: string; tokens: string[] }>;
  tokenToExamIdx: Map<string, number[]>;
  defaultExamByLevel: Record<PscLevel, { level: PscLevel; exam: string }>;
  anyExam: { level: PscLevel; exam: string } | null;
};

let compiled: CompiledExamIndex | null = null;

function normalizeText(input: string) {
  return input
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(norm: string) {
  const stop = new Set(["THE", "AND", "OF", "IN", "TO", "FOR", "WITH", "KERALA", "PSC", "EXAM", "STAGE"]);
  return norm
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stop.has(t));
}

function padCode(code: string) {
  const m = code.match(/^\s*(\d{2,3})\s*\/\s*(\d{2})\s*$/);
  if (!m) return null;
  const n = m[1].padStart(3, "0");
  return `${n}/${m[2]}`;
}

function extractExamCodeFromText(text: string): string | null {
  const m = text.match(/\b(\d{2,3})\s*\/\s*(\d{2})\b/);
  if (!m) return null;
  return padCode(`${m[1]}/${m[2]}`);
}

function buildCompiledIndex(): CompiledExamIndex {
  const index = examIndex as unknown as ExamIndex;

  const codeToExam = new Map<string, { level: PscLevel; exam: string }>();
  const exams: Array<{ level: PscLevel; exam: string; code: string; norm: string; tokens: string[] }> = [];

  for (const level of Object.keys(index) as PscLevel[]) {
    for (const entry of index[level]) {
      const code = padCode(entry.code) ?? entry.code;
      codeToExam.set(code, { level, exam: entry.exam });
      const norm = normalizeText(entry.exam);
      const tokens = tokenize(norm);
      exams.push({ level, exam: entry.exam, code, norm, tokens });
    }
  }

  const tokenToExamIdx = new Map<string, number[]>();
  for (let i = 0; i < exams.length; i++) {
    for (const t of exams[i].tokens) {
      const arr = tokenToExamIdx.get(t);
      if (arr) arr.push(i);
      else tokenToExamIdx.set(t, [i]);
    }
  }

  const anyExam = exams.length ? { level: exams[0].level, exam: exams[0].exam } : null;

  const defaultExamByLevel = (Object.keys(index) as PscLevel[]).reduce(
    (acc, level) => {
      const list = index[level] || [];
      const various = list.find((e) => /VARIOUS/i.test(e.exam));
      const pick = various ?? list[0];
      acc[level] = { level, exam: pick?.exam || anyExam?.exam || "" };
      return acc;
    },
    {} as Record<PscLevel, { level: PscLevel; exam: string }>
  );

  return { codeToExam, exams, tokenToExamIdx, defaultExamByLevel, anyExam };
}

function getIndex() {
  if (!compiled) compiled = buildCompiledIndex();
  return compiled;
}

function trigramSet(s: string) {
  const str = `  ${s}  `;
  const out = new Set<string>();
  for (let i = 0; i < str.length - 2; i++) out.add(str.slice(i, i + 3));
  return out;
}

function jaccard(a: Set<string>, b: Set<string>) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

function guessLevelFromText(text: string): PscLevel {
  const t = normalizeText(text);
  const hasAny = (arr: string[]) => arr.some((x) => t.includes(x));

  if (hasAny(["ENGINEER", "MEDICAL", "NURSE", "TEACHER", "LECTURER", "PROFESSOR", "TECHNICAL", "MECHANIC"])) {
    return "other_exams";
  }
  if (hasAny(["KAS", "SECRETARIAT", "ASSISTANT", "SI", "SUB INSPECTOR", "DEGREE"])) {
    return "degree_level";
  }
  if (hasAny(["POLICE", "FIRE", "EXCISE", "FOREST", "CIVIL", "GUARD"])) {
    return "plus2_level";
  }
  return "10th_level";
}

export type CategorizeQuestionInput = {
  text?: string;
  optionsText?: string;
  explanation?: string;
  examCode?: string;
  examName?: string;
  sourceRef?: string;
};

export function categorizePscQuestion(input: CategorizeQuestionInput): CategorizationResult {
  const idx = getIndex();

  const haystack = [
    input.examCode || "",
    input.examName || "",
    input.sourceRef || "",
    input.text || "",
    input.optionsText || "",
    input.explanation || "",
  ]
    .filter(Boolean)
    .join(" \n ");

  // STEP 1: exam code exact match
  const fromExplicitCode = padCode(input.examCode || "");
  const fromTextCode = extractExamCodeFromText(haystack);
  const code = fromExplicitCode || fromTextCode;
  if (code) {
    const hit = idx.codeToExam.get(code);
    if (hit) return { level: hit.level, exam: hit.exam, confidence: 0.99 };
  }

  // STEP 2: exam name fuzzy match
  const nameCandidate = input.examName || input.sourceRef || "";
  const normQ = normalizeText(nameCandidate || haystack);
  const qTokens = tokenize(normQ);

  const candidateIdxs = new Set<number>();
  for (const tok of qTokens) {
    const arr = idx.tokenToExamIdx.get(tok);
    if (arr) for (const i of arr) candidateIdxs.add(i);
  }
  // If we have no token hits, fall back to scanning all exams (rare but possible).
  const scan = candidateIdxs.size ? Array.from(candidateIdxs) : idx.exams.map((_, i) => i);

  const qTri = trigramSet(normQ);
  let best: { score: number; level: PscLevel; exam: string } | null = null;

  for (const i of scan) {
    const e = idx.exams[i];
    const score = jaccard(qTri, trigramSet(e.norm));
    const substrBoost = e.norm && (normQ.includes(e.norm) || e.norm.includes(normQ)) ? 0.15 : 0;
    const final = Math.min(1, score + substrBoost);
    if (!best || final > best.score) best = { score: final, level: e.level, exam: e.exam };
  }

  if (best && best.score >= 0.55) {
    return { level: best.level, exam: best.exam, confidence: Math.max(0.6, Math.min(0.95, best.score)) };
  }

  // STEP 3: inference -> choose a safe default exam in the inferred level
  const level = guessLevelFromText(haystack);
  const fallback = idx.defaultExamByLevel[level];

  const exam = fallback.exam || idx.anyExam?.exam || "";
  if (!exam) {
    // "Absolutely impossible" only if the source-of-truth JSON is empty.
    return { level, exam: "", confidence: 0.0 };
  }

  return { level, exam, confidence: 0.35 };
}
