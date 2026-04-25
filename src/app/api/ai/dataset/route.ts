import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";
import Topic from "@/lib/db/models/Topic";
import Exam from "@/lib/db/models/Exam";
import Category from "@/lib/db/models/Category";
import mongoose from "mongoose";
import {
  GENERATOR_SYSTEM_PROMPT,
  VALIDATOR_SYSTEM_PROMPT,
  HARD_CONSTRAINTS,
  buildGeneratorUserPrompt,
  VARIANTS_SYSTEM_PROMPT,
  buildVariantsUserPrompt,
} from "@/app/api/ai/prompts";
import { createOpenAIJsonResponse } from "@/app/api/ai/openai";
import {
  PscQuestionJsonSchema,
  PscQuestionSchema,
  PscValidationResultSchema,
  type PscQuestion,
} from "@/app/api/ai/schema";
import { QUESTION_STYLE_VALUES, type QuestionStyle } from "@/lib/question-styles";

type Style = QuestionStyle;

function getPrimaryCategoryId(topic: { categoryId?: unknown; categoryIds?: unknown[] } | null | undefined) {
  return topic?.categoryId || topic?.categoryIds?.[0] || null;
}

function matchesLevel(category: { slug?: string; name?: { en?: string } } | null, level: string) {
  const haystack = `${category?.slug || ""} ${category?.name?.en || ""}`.toLowerCase();
  if (level === "degree_level") return haystack.includes("degree");
  if (level === "plus2_level") return haystack.includes("12th") || haystack.includes("plus two") || haystack.includes("plus2");
  if (level === "other_exams") return haystack.includes("other");
  if (level === "10th_level") return haystack.includes("10th");
  return false;
}

async function resolveCategoryIdForQuestion(
  topic: { categoryId?: unknown; categoryIds?: unknown[] } | null | undefined,
  level: string
) {
  const categoryIds = [topic?.categoryId, ...(topic?.categoryIds || [])]
    .filter(Boolean)
    .map((value) => String(value));

  if (!categoryIds.length) return null;

  const categories = await Category.find({ _id: { $in: categoryIds } })
    .select({ _id: 1, slug: 1, name: 1 })
    .lean();
  const match = categories.find((category) => matchesLevel(category, level));
  return match?._id || getPrimaryCategoryId(topic);
}

const SourceTypeSchema = z.enum(["pyq", "institute", "internet"]);

const DatasetSourceSchema = z.object({
  sourceType: SourceTypeSchema,
  sourceRef: z.string().optional().default(""),
  sourceText: z.string().min(1),
  topicHint: z.string().optional(),
  level: z.string().optional(),
  exam: z.string().optional(),
});

const DatasetRequestSchema = z.object({
  sources: z.array(DatasetSourceSchema).min(1),
  store: z.boolean().optional().default(true),
  totalQuestions: z.number().int().min(1).max(20).optional().default(20),
  useAiValidator: z.boolean().optional().default(true),
  generatePyqVariants: z.boolean().optional().default(true),
});

const DEFAULT_MIX: Array<{ style: Style; count: number; difficultyHint: string }> = [
  { style: "direct", count: 5, difficultyHint: "1-2" },
  { style: "statement", count: 3, difficultyHint: "3-4" },
  { style: "assertion-reason", count: 2, difficultyHint: "4" },
  { style: "match", count: 2, difficultyHint: "3-4" },
  { style: "order", count: 2, difficultyHint: "3-4" },
  { style: "odd-one", count: 2, difficultyHint: "3" },
  { style: "fill-blank", count: 2, difficultyHint: "2-3" },
  { style: "multi-correct", count: 2, difficultyHint: "4-5" },
];

function pickSource(
  sources: Array<z.infer<typeof DatasetSourceSchema>>,
  style: Style,
  idx: number
) {
  const pyq = sources.filter((s) => s.sourceType === "pyq");
  const nonPyq = sources.filter((s) => s.sourceType !== "pyq");

  if (style === QUESTION_STYLE_VALUES[0] && pyq.length) return pyq[idx % pyq.length];
  if (style !== "direct" && nonPyq.length) return nonPyq[idx % nonPyq.length];
  return sources[idx % sources.length];
}

async function generateOne({
  apiKey,
  model,
  source,
  styleHint,
  difficultyHint,
}: {
  apiKey: string;
  model: string;
  source: z.infer<typeof DatasetSourceSchema>;
  styleHint: Style;
  difficultyHint: string;
}): Promise<PscQuestion> {
  const system = `${GENERATOR_SYSTEM_PROMPT}\n\n${HARD_CONSTRAINTS}`.trim();
  const user = buildGeneratorUserPrompt({
    sourceType: source.sourceType,
    topicHint: source.topicHint,
    level: source.level,
    exam: source.exam,
    difficultyHint,
    styleHint,
    sourceText: source.sourceText,
  });

  const { json } = await createOpenAIJsonResponse<unknown>({
    apiKey,
    model,
    system,
    user,
    schemaName: "psc_question",
    jsonSchema: PscQuestionJsonSchema,
    temperature: 0.4,
  });

  return PscQuestionSchema.parse(json);
}

async function validateOne({
  apiKey,
  model,
  question,
}: {
  apiKey: string;
  model: string;
  question: PscQuestion;
}) {
  const system = `${VALIDATOR_SYSTEM_PROMPT}\n\n${HARD_CONSTRAINTS}`.trim();
  const user = `Validate this Kerala PSC MCQ JSON strictly. Fix issues in correctedQuestion.\n\nQuestion JSON:\n${JSON.stringify(
    question
  )}`;

  const { json } = await createOpenAIJsonResponse<unknown>({
    apiKey,
    model,
    system,
    user,
    schemaName: "psc_validation_result",
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      required: ["isValid", "issues", "suggestions", "correctedQuestion"],
      properties: {
        isValid: { type: "boolean" },
        issues: { type: "array", items: { type: "string" } },
        suggestions: { type: "array", items: { type: "string" } },
        correctedQuestion: PscQuestionJsonSchema,
      },
    },
    temperature: 0.2,
  });

  return PscValidationResultSchema.parse(json);
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const payload = DatasetRequestSchema.parse(await request.json());

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_API_KEY",
            message: "Set OPENAI_API_KEY to run dataset generation",
            statusCode: 500,
          },
        },
        { status: 500 }
      );
    }

    const jobs: Array<{ style: Style; difficultyHint: string }> = [];
    for (const chunk of DEFAULT_MIX) {
      for (let i = 0; i < chunk.count; i++) {
        jobs.push({ style: chunk.style, difficultyHint: chunk.difficultyHint });
      }
    }
    const target = Math.min(payload.totalQuestions, jobs.length);
    const selectedJobs = jobs.slice(0, target);

    await connectDB();

    const report = {
      inserted: 0,
      skippedDuplicates: 0,
      skippedInvalid: 0,
      errors: [] as string[],
      breakdown: {
        pyq: 0,
        pyq_variant: 0,
        institute: 0,
        internet: 0,
      },
      samples: [] as Array<{ id: string; textEn: string; sourceType?: string; questionStyle: string }>,
    };

    for (let i = 0; i < selectedJobs.length; i++) {
      const { style, difficultyHint } = selectedJobs[i];
      const source = pickSource(payload.sources, style, i);

      try {
        const generated = await generateOne({
          apiKey,
          model,
          source,
          styleHint: style,
          difficultyHint,
        });

        const validated = payload.useAiValidator
          ? await validateOne({ apiKey, model, question: generated })
          : { isValid: true, issues: [], suggestions: [], correctedQuestion: generated };

        if (!validated.isValid) {
          report.skippedInvalid++;
          continue;
        }

        const finalQuestion = validated.correctedQuestion;

        const existing = await Question.findOne({ "text.en": finalQuestion.text.en }).select({ _id: 1 }).lean();
        if (existing) {
          report.skippedDuplicates++;
          continue;
        }

        if (!payload.store) continue;

        const topic = await Topic.findById(finalQuestion.topicId).select({ categoryId: 1, categoryIds: 1 }).lean();
        const categoryId = await resolveCategoryIdForQuestion(topic, finalQuestion.level);
        if (!categoryId) {
          report.skippedInvalid++;
          continue;
        }

        // Best-effort: map examCode/exam name to an Exam under the topic's category
        let examTags: mongoose.Types.ObjectId[] = [];
        const examCode = String(finalQuestion.examCode || "").trim();
        const examName = String(finalQuestion.exam || "").trim();
        if (examCode || examName) {
          const examDoc = await Exam.findOne({
            categoryId,
            ...(examCode ? { code: examCode } : { name: examName }),
          }).select({ _id: 1 }).lean();
          if (examDoc?._id) examTags = [examDoc._id as unknown as mongoose.Types.ObjectId];
        }

        const created = await Question.create({
          text: { en: finalQuestion.text.en, ml: finalQuestion.text.ml ?? "" },
          options: finalQuestion.options.map((o) => ({
            key: o.key,
            en: o.en,
            ml: o.ml ?? "",
          })),
          answer: finalQuestion.correctOption,
          explanation: {
            en: finalQuestion.explanation.en,
            ml: finalQuestion.explanation.ml,
          },
          categoryId,
          topicId: finalQuestion.topicId,
          subtopicId:
            finalQuestion.subTopic && mongoose.isValidObjectId(finalQuestion.subTopic)
              ? new mongoose.Types.ObjectId(finalQuestion.subTopic)
              : undefined,
          examTags,
          tags: finalQuestion.tags ?? [],
          difficulty: finalQuestion.difficulty,
          exam: String(finalQuestion.exam || "").trim(),
          examCode: String(finalQuestion.examCode || "").trim(),
          language: "en",
          questionStyle: finalQuestion.questionStyle,
          sourceType: source.sourceType,
          sourceRef: source.sourceRef ?? "",
          status: "review",
          isVerified: false,
          createdByLabel: "ai",
          createdBy: guard.userId,
        });

        report.inserted++;
        if (source.sourceType === "pyq") report.breakdown.pyq++;
        if (source.sourceType === "institute") report.breakdown.institute++;
        if (source.sourceType === "internet") report.breakdown.internet++;

        if (report.samples.length < 5) {
          report.samples.push({
            id: String(created._id),
            textEn: created.text.en,
            sourceType: created.sourceType,
            questionStyle: created.questionStyle,
          });
        }

        if (payload.generatePyqVariants && source.sourceType === "pyq") {
          try {
            const { json: variantsJson } = await createOpenAIJsonResponse<unknown>({
              apiKey,
              model,
              system: `${VARIANTS_SYSTEM_PROMPT}\n\n${HARD_CONSTRAINTS}`.trim(),
              user: buildVariantsUserPrompt(JSON.stringify(finalQuestion)),
              schemaName: "psc_question_variants",
              jsonSchema: {
                type: "array",
                minItems: 5,
                maxItems: 5,
                items: PscQuestionJsonSchema,
              },
              temperature: 0.5,
            });

            const variantsArray = Array.isArray(variantsJson) ? variantsJson : [];
            const picked = variantsArray.slice(0, 3).map((q) => PscQuestionSchema.parse(q));

            for (const v of picked) {
              const dup = await Question.findOne({ "text.en": v.text.en }).select({ _id: 1 }).lean();
              if (dup) {
                report.skippedDuplicates++;
                continue;
              }

              let variantExamTags: mongoose.Types.ObjectId[] = [];
              const vExamCode = String(v.examCode || "").trim();
              const vExamName = String(v.exam || "").trim();
              if (vExamCode || vExamName) {
                const examDoc = await Exam.findOne({
                  categoryId,
                  ...(vExamCode ? { code: vExamCode } : { name: vExamName }),
                }).select({ _id: 1 }).lean();
                if (examDoc?._id) variantExamTags = [examDoc._id as unknown as mongoose.Types.ObjectId];
              }

              const createdVariant = await Question.create({
                text: { en: v.text.en, ml: v.text.ml ?? "" },
                options: v.options.map((o) => ({
                  key: o.key,
                  en: o.en,
                  ml: o.ml ?? "",
                })),
                answer: v.correctOption,
                explanation: { en: v.explanation.en, ml: v.explanation.ml },
                categoryId,
                topicId: v.topicId,
                subtopicId:
                  v.subTopic && mongoose.isValidObjectId(v.subTopic)
                    ? new mongoose.Types.ObjectId(v.subTopic)
                    : undefined,
                examTags: variantExamTags,
                tags: v.tags ?? [],
                difficulty: v.difficulty,
                exam: String(v.exam || "").trim(),
                examCode: String(v.examCode || "").trim(),
                language: "en",
                questionStyle: v.questionStyle,
                sourceType: "pyq_variant",
                sourceRef: source.sourceRef ?? "",
                parentQuestionId: created._id,
                status: "review",
                isVerified: false,
                createdByLabel: "ai",
                createdBy: guard.userId,
              });

              report.inserted++;
              report.breakdown.pyq_variant++;

              if (report.samples.length < 5) {
                report.samples.push({
                  id: String(createdVariant._id),
                  textEn: createdVariant.text.en,
                  sourceType: createdVariant.sourceType,
                  questionStyle: createdVariant.questionStyle,
                });
              }
            }
          } catch (e) {
            report.errors.push(
              `PYQ variants failed for Q${i + 1}: ${e instanceof Error ? e.message : "unknown error"}`
            );
          }
        }
      } catch (e) {
        report.errors.push(
          `Q${i + 1} failed: ${e instanceof Error ? e.message : "unknown error"}`
        );
      }
    }

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error("AI dataset error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to build dataset";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message, statusCode: 500 } },
      { status: 500 }
    );
  }
}
