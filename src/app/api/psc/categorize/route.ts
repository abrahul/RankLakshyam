import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { categorizePscQuestion, type CategorizeQuestionInput } from "@/lib/examfilter/categorize";

type UnknownRecord = Record<string, unknown>;
function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Invalid JSON body", statusCode: 400 } },
      { status: 400 }
    );
  }

  const maybeQuestion = isRecord(body) ? body.question : undefined;
  const payload = maybeQuestion ?? body;
  const p: UnknownRecord | null = isRecord(payload) ? payload : null;

  const text =
    getString(p?.text) ?? (isRecord(p?.text) ? getString(p.text.en) : undefined);
  const optionsText =
    getString(p?.optionsText) ??
    (Array.isArray(p?.options)
      ? p.options
          .map((o) => getString(o) ?? (isRecord(o) ? getString(o.en) : "") ?? "")
          .join(" \n ")
      : undefined);
  const explanation =
    getString(p?.explanation) ?? (isRecord(p?.explanation) ? getString(p.explanation.en) : undefined);

  const input: CategorizeQuestionInput = {
    text,
    optionsText,
    explanation,
    examCode: getString(p?.examCode),
    examName:
      getString(p?.examName) ??
      (isRecord(p?.pyq) ? getString(p.pyq.exam) : undefined),
    sourceRef: getString(p?.sourceRef),
  };

  if (!input.text && !input.optionsText && !input.explanation && !input.examCode && !input.examName && !input.sourceRef) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Provide at least one of: text/options/explanation/examCode/examName/sourceRef", statusCode: 400 } },
      { status: 400 }
    );
  }

  const result = categorizePscQuestion(input);
  return NextResponse.json(result);
}
