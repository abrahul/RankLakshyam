import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import Category from "@/lib/db/models/Category";
import Exam from "@/lib/db/models/Exam";
import Topic from "@/lib/db/models/Topic";

// PUT /api/admin/categories/[id]
export async function PUT(
  request: Request,
  { params }: RouteContext<"/api/admin/categories/[id]">
) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const { id } = await params;
    const body = await request.json();

    await connectDB();
    const updated = await Category.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Category not found", statusCode: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update category error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update category", statusCode: 500 } },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/categories/[id]
export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/admin/categories/[id]">
) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const { id } = await params;

    await connectDB();

    const [hasExams, hasTopics] = await Promise.all([
      Exam.exists({ categoryId: id }),
      Topic.exists({ $or: [{ categoryId: id }, { categoryIds: id }] }),
    ]);

    if (hasExams || hasTopics) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFLICT",
            message: "Category has linked exams/topics. Delete them first.",
            statusCode: 409,
          },
        },
        { status: 409 }
      );
    }

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Category not found", statusCode: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete category", statusCode: 500 } },
      { status: 500 }
    );
  }
}
