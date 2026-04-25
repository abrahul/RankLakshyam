export const QUESTION_STYLE_VALUES = [
  "direct",
  "concept",
  "statement",
  "negative",
  "indirect",
] as const;

export type QuestionStyle = (typeof QUESTION_STYLE_VALUES)[number];

const QUESTION_STYLE_ALIASES: Record<string, QuestionStyle> = {
  direct: "direct",
  "direct-question": "direct",
  concept: "concept",
  "concept-based": "concept",
  statement: "statement",
  "statement-based": "statement",
  negative: "negative",
  indirect: "indirect",
};

export function normalizeQuestionStyle(value: unknown): QuestionStyle | undefined {
  if (typeof value !== "string") return undefined;

  const normalized = value.trim().toLowerCase();
  return QUESTION_STYLE_ALIASES[normalized];
}
