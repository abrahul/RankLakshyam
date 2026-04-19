import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";

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

  return NextResponse.json({ success: true, data: question });
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

    await connectDB();

    const question = await Question.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!question) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Question not found", statusCode: 404 } },
        { status: 404 }
      );
    }

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
