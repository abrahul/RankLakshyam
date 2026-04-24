import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import Topic from "@/lib/db/models/Topic";
import mongoose from "mongoose";

// PUT /api/admin/topics/[id] — update topic fields (levelId, name, icon, etc.)
export async function PUT(
  request: Request,
  { params }: RouteContext<"/api/admin/topics/[id]">
) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const normalizedCategoryIds = Array.isArray(body.categoryIds)
      ? body.categoryIds.filter((value: unknown) => typeof value === "string" && mongoose.isValidObjectId(value))
      : typeof body.categoryId === "string" && mongoose.isValidObjectId(body.categoryId)
        ? [body.categoryId]
        : undefined;

    await connectDB();

    const topic = await Topic.findByIdAndUpdate(
      id,
      {
        $set: {
          ...body,
          ...(normalizedCategoryIds
            ? {
                categoryIds: normalizedCategoryIds,
                categoryId: normalizedCategoryIds[0] || undefined,
              }
            : {}),
        },
      },
      { new: true, runValidators: true }
    );

    if (!topic) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Topic not found", statusCode: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: topic });
  } catch (error) {
    console.error("Update topic error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update topic", statusCode: 500 } },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/topics/[id]
export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/admin/topics/[id]">
) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const { id } = await params;

    await connectDB();
    const deleted = await Topic.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Topic not found", statusCode: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("Delete topic error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete topic", statusCode: 500 } },
      { status: 500 }
    );
  }
}
