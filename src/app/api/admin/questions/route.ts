import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";
import { categorizePscQuestion } from "@/lib/examfilter/categorize";
import { LEVEL_NAMES } from "@/lib/db/models/Level";

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET all questions (admin view with answers)
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  const { searchParams } = new URL(request.url);
  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
  const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
  const limit = Number.isFinite(rawLimit) ? Math.min(200, Math.max(1, rawLimit)) : 20;
  const topic = searchParams.get("topic");
  const subTopic = searchParams.get("subTopic");
  const level = searchParams.get("level");
  const exam = searchParams.get("exam");
  const verified = searchParams.get("verified");
  const search = searchParams.get("search");

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (topic) filter.topicId = topic;
  if (subTopic) filter.subTopic = subTopic;
  if (level && (LEVEL_NAMES as readonly string[]).includes(level)) {
    filter.level = level;
  }
  if (exam) filter.exam = exam;
  if (verified === "true") filter.isVerified = true;
  if (verified === "false") filter.isVerified = false;
  if (search) {
    const s = escapeRegex(search.slice(0, 64));
    filter.$or = [
      { "text.en": { $regex: s, $options: "i" } },
      { "text.ml": { $regex: s, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [questions, total] = await Promise.all([
    Question.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Question.countDocuments(filter),
  ]);

  return NextResponse.json({
    success: true,
    data: questions,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// POST create a new question
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const {
      text, options, correctOption, explanation, topicId, subTopic, tags,
      difficulty, pyq, questionStyle, level: bodyLevel, exam: bodyExam,
      examCode: bodyExamCode,
    } = body;

    // Validation
    if (!text?.en || !options || options.length !== 4 || !correctOption || !topicId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "text.en, 4 options, correctOption, and topicId are required", statusCode: 400 } },
        { status: 400 }
      );
    }

    const validKeys = ["A", "B", "C", "D"];
    if (!validKeys.includes(correctOption)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "correctOption must be A, B, C, or D", statusCode: 400 } },
        { status: 400 }
      );
    }

    await connectDB();

    // Auto-fill level/exam from examCode or categorize
    const categorization = categorizePscQuestion({
      text: text.en,
      optionsText: Array.isArray(options) ? options.map((o: { en?: string }) => o?.en || "").join(" \n ") : "",
      explanation: explanation?.en || "",
      examCode: bodyExamCode,
      examName: bodyExam || pyq?.exam,
      sourceRef: typeof body?.sourceRef === "string" ? body.sourceRef : undefined,
    });

    // Priority: explicit body > categorization
    const resolvedLevel = bodyLevel || categorization.level;
    const resolvedExam = bodyExam || categorization.exam;
    const resolvedExamCode = bodyExamCode || "";

    const question = await Question.create({
      text: { en: text.en, ml: text.ml || "" },
      options: options.map((o: { key: string; en: string; ml?: string }) => ({
        key: o.key,
        en: o.en,
        ml: o.ml || "",
      })),
      correctOption,
      explanation: { en: explanation?.en || "", ml: explanation?.ml || "" },
      topicId,
      subTopic: subTopic || "",
      tags: tags || [],
      difficulty: difficulty || 2,
      questionStyle: questionStyle || "direct",
      level: resolvedLevel,
      exam: resolvedExam,
      examCode: resolvedExamCode,
      pyq: pyq || undefined,
      isVerified: true, // Admin-created = auto-verified
      createdBy: guard.userId,
    });

    return NextResponse.json({ success: true, data: question }, { status: 201 });
  } catch (error) {
    console.error("Create question error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create question", statusCode: 500 } },
      { status: 500 }
    );
  }
}
