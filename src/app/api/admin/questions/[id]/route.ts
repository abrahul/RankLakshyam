import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";
import SubTopic from "@/lib/db/models/SubTopic";
import { QUESTION_STYLE_VALUES } from "@/lib/question-styles";

async function resolveSubtopicId(rawSubtopic: unknown, topicId: string) {
  if (typeof rawSubtopic !== "string") return undefined;
  const value = rawSubtopic.trim();
  if (!value) return undefined;
  if (mongoose.isValidObjectId(value)) {
    return new mongoose.Types.ObjectId(value);
  }

  const subtopic = await SubTopic.findOne({
    topicId,
    $or: [{ "name.en": value }, { "name.ml": value }],
  })
    .select({ _id: 1 })
    .lean();

  return subtopic?._id ? new mongoose.Types.ObjectId(String(subtopic._id)) : null;
}

// GET single question
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/admin/questions/[id]">
) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  const { id } = await params;
  await connectDB();

  const question = await Question.findById(id).lean();
  if (!question) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Question not found", statusCode: 404 } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      ...question,
      correctOption: String(question.answer || ""),
      subTopic: question.subtopicId ? String(question.subtopicId) : "",
      subtopicId: question.subtopicId ? String(question.subtopicId) : "",
    },
  });
}

// PUT update question
export async function PUT(
  request: Request,
  { params }: RouteContext<"/api/admin/questions/[id]">
) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const { id } = await params;
    const body = await request.json();

    if (body.questionStyle && !QUESTION_STYLE_VALUES.includes(body.questionStyle)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: `questionStyle must be one of: ${QUESTION_STYLE_VALUES.join(", ")}`,
            statusCode: 400,
          },
        },
        { status: 400 }
      );
    }

    await connectDB();

    const existingQuestion = await Question.findById(id).select({ topicId: 1 }).lean();
    if (!existingQuestion) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Question not found", statusCode: 404 } },
        { status: 404 }
      );
    }

    const topicId = typeof body.topicId === "string" && body.topicId.trim() ? body.topicId : String(existingQuestion.topicId);
    const hasSubtopicField = Object.prototype.hasOwnProperty.call(body, "subtopicId") || Object.prototype.hasOwnProperty.call(body, "subTopic");
    const resolvedSubtopicId = hasSubtopicField
      ? await resolveSubtopicId(body.subtopicId ?? body.subTopic, topicId)
      : undefined;

    if (hasSubtopicField && resolvedSubtopicId === null) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "Invalid subtopic for the selected topic", statusCode: 400 },
        },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = { ...body, topicId };
    delete update.subTopic;
    if (hasSubtopicField) {
      update.subtopicId = resolvedSubtopicId ?? null;
    }

    const question = await Question.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: question });
  } catch (error) {
    console.error("Update question error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update question", statusCode: 500 } },
      { status: 500 }
    );
  }
}

// DELETE question
export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/admin/questions/[id]">
) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  const { id } = await params;
  await connectDB();

  const result = await Question.findByIdAndDelete(id);
  if (!result) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Question not found", statusCode: 404 } },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: { deleted: true } });
}
