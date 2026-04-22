import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";

// GET all questions (admin view with answers)
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const topic = searchParams.get("topic");
  const subTopic = searchParams.get("subTopic");
  const exam = searchParams.get("exam");
  const verified = searchParams.get("verified");
  const search = searchParams.get("search");

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (topic) filter.topicId = topic;
  if (subTopic) filter.subTopic = subTopic;
  if (exam) filter.examTags = exam;
  if (verified === "true") filter.isVerified = true;
  if (verified === "false") filter.isVerified = false;
  if (search) {
    filter.$or = [
      { "text.en": { $regex: search, $options: "i" } },
      { "text.ml": { $regex: search, $options: "i" } },
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
    const { text, options, correctOption, explanation, topicId, subTopic, tags, difficulty, examTags, pyq, questionStyle } = body;

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
      examTags: examTags || [],
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
