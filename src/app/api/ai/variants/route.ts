import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import {
  HARD_CONSTRAINTS,
  VARIANTS_SYSTEM_PROMPT,
  buildVariantsUserPrompt,
} from "@/app/api/ai/prompts";
import { createOpenAIJsonResponse } from "@/app/api/ai/openai";
import {
  PscQuestionArrayJsonSchema,
  PscQuestionSchema,
} from "@/app/api/ai/schema";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const { question } = body ?? {};

    const base = PscQuestionSchema.parse(question);

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_API_KEY",
            message: "Set OPENAI_API_KEY to use AI variants",
            statusCode: 500,
          },
        },
        { status: 500 }
      );
    }

    const system = `${VARIANTS_SYSTEM_PROMPT}\n\n${HARD_CONSTRAINTS}`.trim();
    const user = buildVariantsUserPrompt(JSON.stringify(base));

    const { json } = await createOpenAIJsonResponse<unknown>({
      apiKey,
      model,
      system,
      user,
      schemaName: "psc_question_variants",
      jsonSchema: PscQuestionArrayJsonSchema,
      temperature: 0.5,
    });

    const variants = (Array.isArray(json) ? json : []).map((q) =>
      PscQuestionSchema.parse(q)
    );

    return NextResponse.json({ success: true, data: { variants } });
  } catch (error) {
    console.error("AI variants error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate variants";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message, statusCode: 500 } },
      { status: 500 }
    );
  }
}

