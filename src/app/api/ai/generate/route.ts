import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";
import Topic from "@/lib/db/models/Topic";
import Exam from "@/lib/db/models/Exam";
import {
  GENERATOR_SYSTEM_PROMPT,
  HARD_CONSTRAINTS,
  buildGeneratorUserPrompt,
} from "@/app/api/ai/prompts";
import { createOpenAIJsonResponse } from "@/app/api/ai/openai";
import { PscQuestionJsonSchema, PscQuestionSchema } from "@/app/api/ai/schema";

function getPrimaryCategoryId(topic: { categoryId?: unknown; categoryIds?: unknown[] } | null | undefined) {
  return topic?.categoryId || topic?.categoryIds?.[0] || null;
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const {
      sourceText,
      sourceType,
      sourceRef,
      topicHint,
      level: bodyLevel,
      exam: bodyExam,
      difficultyHint,
      styleHint,
      store = true,
    } = body ?? {};

    if (typeof sourceText !== "string" || !sourceText.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "sourceText is required",
            statusCode: 400,
          },
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_API_KEY",
            message: "Set OPENAI_API_KEY to use AI generation",
            statusCode: 500,
          },
        },
        { status: 500 }
      );
    }

    const system = `${GENERATOR_SYSTEM_PROMPT}\n\n${HARD_CONSTRAINTS}`.trim();
    const user = buildGeneratorUserPrompt({
      sourceType,
      topicHint,
      level: bodyLevel,
      exam: bodyExam,
      difficultyHint,
      styleHint,
      sourceText,
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

    const parsed = PscQuestionSchema.parse(json);

    if (!store) {
      return NextResponse.json({ success: true, data: { question: parsed } });
    }

    await connectDB();

    const topic = await Topic.findById(parsed.topicId).select({ categoryId: 1, categoryIds: 1 }).lean();
    const primaryCategoryId = getPrimaryCategoryId(topic);
    if (!primaryCategoryId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "Invalid topicId (no category linked)", statusCode: 400 } },
        { status: 400 }
      );
    }

    let examTags: mongoose.Types.ObjectId[] = [];
    const examCode = String(parsed.examCode || "").trim();
    const examName = String(parsed.exam || "").trim();
    if (examCode || examName) {
      const examDoc = await Exam.findOne({
        categoryId: primaryCategoryId,
        ...(examCode ? { code: examCode } : { name: examName }),
      }).select({ _id: 1 }).lean();
      if (examDoc?._id) examTags = [examDoc._id as unknown as mongoose.Types.ObjectId];
    }

    const created = await Question.create({
      text: { en: parsed.text.en, ml: parsed.text.ml ?? "" },
      options: parsed.options.map((o) => ({
        key: o.key,
        en: o.en,
        ml: o.ml ?? "",
      })),
      answer: parsed.correctOption,
      explanation: { en: parsed.explanation.en, ml: parsed.explanation.ml },
      categoryId: primaryCategoryId,
      topicId: parsed.topicId,
      subtopicId:
        parsed.subTopic && mongoose.isValidObjectId(parsed.subTopic)
          ? new mongoose.Types.ObjectId(parsed.subTopic)
          : undefined,
      examTags,
      tags: parsed.tags ?? [],
      difficulty: parsed.difficulty,
      language: "en",
      questionStyle: parsed.questionStyle,
      sourceType:
        sourceType === "pyq" ||
        sourceType === "pyq_variant" ||
        sourceType === "institute" ||
        sourceType === "internet"
          ? sourceType
          : undefined,
      sourceRef: typeof sourceRef === "string" ? sourceRef : "",
      status: "review",
      isVerified: false,
      createdByLabel: "ai",
      createdBy: guard.userId,
    });

    return NextResponse.json(
      { success: true, data: { saved: true, question: created } },
      { status: 201 }
    );
  } catch (error) {
    console.error("AI generate error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate question";
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message, statusCode: 500 },
      },
      { status: 500 }
    );
  }
}
