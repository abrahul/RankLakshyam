import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import SubTopic from "@/lib/db/models/SubTopic";

// PUT /api/admin/subtopics/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const { id } = await params;
    const body = await request.json();

    await connectDB();
    const subtopic = await SubTopic.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!subtopic) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "SubTopic not found", statusCode: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: subtopic });
  } catch (error) {
    console.error("Update subtopic error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update subtopic", statusCode: 500 } },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/subtopics/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const { id } = await params;

    await connectDB();
    const deleted = await SubTopic.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "SubTopic not found", statusCode: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("Delete subtopic error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete subtopic", statusCode: 500 } },
      { status: 500 }
    );
  }
}
