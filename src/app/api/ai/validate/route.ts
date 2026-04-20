import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import {
  VALIDATOR_SYSTEM_PROMPT,
  HARD_CONSTRAINTS,
} from "@/app/api/ai/prompts";
import { createOpenAIJsonResponse } from "@/app/api/ai/openai";
import {
  PscQuestionSchema,
  PscQuestionJsonSchema,
  PscValidationResultSchema,
} from "@/app/api/ai/schema";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const { question } = body ?? {};

    const parsedQuestion = PscQuestionSchema.parse(question);

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_API_KEY",
            message: "Set OPENAI_API_KEY to use AI validation",
            statusCode: 500,
          },
        },
        { status: 500 }
      );
    }

    const system = `${VALIDATOR_SYSTEM_PROMPT}\n\n${HARD_CONSTRAINTS}`.trim();
    const user = `Validate and correct this question JSON.\n\nQuestion JSON:\n${JSON.stringify(
      parsedQuestion
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

    const result = PscValidationResultSchema.parse(json);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("AI validate error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to validate question";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message, statusCode: 500 } },
      { status: 500 }
    );
  }
}
