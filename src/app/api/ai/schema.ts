import { z } from "zod";

export const QuestionStyleSchema = z.enum([
  "direct",
  "concept",
  "statement",
  "negative",
  "indirect",
]);

export const OptionKeySchema = z.enum(["A", "B", "C", "D"]);

export const PscOptionSchema = z.object({
  key: OptionKeySchema,
  en: z.string().min(1),
  ml: z.string().optional().default(""),
});

export const PscQuestionSchema = z
  .object({
    text: z.object({
      en: z.string().min(1),
      ml: z.string().optional().default(""),
    }),
    options: z.array(PscOptionSchema).length(4),
    correctOption: OptionKeySchema,
    explanation: z.object({
      en: z.string().min(1),
      ml: z.string().min(1),
    }),
    topicId: z.string().min(1),
    subTopic: z.string().optional().default(""),
    difficulty: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ]),
    level: z.enum(["10th_level", "plus2_level", "degree_level", "other_exams"]).optional().default("10th_level"),
    exam: z.string().optional().default(""),
    examCode: z.string().optional().default(""),
    tags: z.array(z.string()).optional().default([]),
    questionStyle: QuestionStyleSchema,
  })
  .superRefine((value, ctx) => {
    const keys = value.options.map((o) => o.key);
    const unique = new Set(keys);
    if (unique.size !== 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "options must contain unique keys A, B, C, D",
        path: ["options"],
      });
    }
    if (!keys.includes(value.correctOption)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "correctOption must match one of the option keys",
        path: ["correctOption"],
      });
    }
  });

export type PscQuestion = z.infer<typeof PscQuestionSchema>;

export const PscQuestionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "text",
    "options",
    "correctOption",
    "explanation",
    "topicId",
    "subTopic",
    "difficulty",
    "level",
    "exam",
    "examCode",
    "tags",
    "questionStyle",
  ],
  properties: {
    text: {
      type: "object",
      additionalProperties: false,
      required: ["en", "ml"],
      properties: {
        en: { type: "string" },
        ml: { type: "string" },
      },
    },
    options: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "en", "ml"],
        properties: {
          key: { type: "string", enum: ["A", "B", "C", "D"] },
          en: { type: "string" },
          ml: { type: "string" },
        },
      },
    },
    correctOption: { type: "string", enum: ["A", "B", "C", "D"] },
    explanation: {
      type: "object",
      additionalProperties: false,
      required: ["en", "ml"],
      properties: {
        en: { type: "string" },
        ml: { type: "string" },
      },
    },
    topicId: { type: "string" },
    subTopic: { type: "string" },
    difficulty: { type: "integer", minimum: 1, maximum: 5 },
    level: { type: "string", enum: ["10th_level", "plus2_level", "degree_level", "other_exams"] },
    exam: { type: "string" },
    examCode: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    questionStyle: {
      type: "string",
      enum: ["direct", "concept", "statement", "negative", "indirect"],
    },
  },
} as const;

export const PscQuestionArrayJsonSchema = {
  type: "array",
  minItems: 5,
  maxItems: 5,
  items: PscQuestionJsonSchema,
} as const;

export const PscValidationResultSchema = z.object({
  isValid: z.boolean(),
  issues: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
  correctedQuestion: PscQuestionSchema,
});

export type PscValidationResult = z.infer<typeof PscValidationResultSchema>;
