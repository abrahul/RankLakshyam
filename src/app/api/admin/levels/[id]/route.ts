import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import Level from "@/lib/db/models/Level";
import Exam from "@/lib/db/models/Exam";

// PUT /api/admin/levels/[id]
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
    const level = await Level.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!level) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Level not found", statusCode: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: level });
  } catch (error) {
    console.error("Update level error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update level", statusCode: 500 } },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/levels/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const { id } = await params;

    await connectDB();
    const hasExams = await Exam.exists({ levelId: id });
    if (hasExams) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "HAS_EXAMS",
            message: "Cannot delete this category while it still has exams. Delete/move exams first.",
            statusCode: 400,
          },
        },
        { status: 400 }
      );
    }
    const deleted = await Level.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Level not found", statusCode: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("Delete level error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete level", statusCode: 500 } },
      { status: 500 }
    );
  }
}
