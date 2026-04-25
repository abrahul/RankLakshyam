export const QUESTION_STYLE_VALUES = [
  "direct",
  "statement",
  "assertion-reason",
  "match",
  "order",
  "odd-one",
  "fill-blank",
  "multi-correct",
] as const;

export type QuestionStyle = (typeof QUESTION_STYLE_VALUES)[number];

export const DEFAULT_QUESTION_STYLE: QuestionStyle = "direct";

export const QUESTION_STYLE_OPTIONS: ReadonlyArray<{ value: QuestionStyle; label: string }> = [
  { value: "direct", label: "Direct" },
  { value: "statement", label: "Statement" },
  { value: "assertion-reason", label: "Assertion-Reason" },
  { value: "match", label: "Match" },
  { value: "order", label: "Order" },
  { value: "odd-one", label: "Odd-One" },
  { value: "fill-blank", label: "Fill Blank" },
  { value: "multi-correct", label: "Multi-Correct" },
];
