import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";
import {
  GENERATOR_SYSTEM_PROMPT,
  HARD_CONSTRAINTS,
  buildGeneratorUserPrompt,
} from "@/app/api/ai/prompts";
import { createOpenAIJsonResponse } from "@/app/api/ai/openai";
import { PscQuestionJsonSchema, PscQuestionSchema } from "@/app/api/ai/schema";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const {
      sourceText,
      sourceType,
      topicHint,
      examTags,
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
      examTags,
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
    const created = await Question.create({
      text: { en: parsed.text.en, ml: parsed.text.ml ?? "" },
      options: parsed.options.map((o) => ({
        key: o.key,
        en: o.en,
        ml: o.ml ?? "",
      })),
      correctOption: parsed.correctOption,
      explanation: { en: parsed.explanation.en, ml: parsed.explanation.ml },
      topicId: parsed.topicId,
      subTopic: parsed.subTopic ?? "",
      tags: parsed.tags ?? [],
      difficulty: parsed.difficulty,
      questionStyle: parsed.questionStyle,
      examTags: (parsed.examTags ?? []).filter((t) =>
        ["ldc", "lgs", "degree", "police"].includes(t)
      ),
      isVerified: false,
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

