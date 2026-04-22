import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import Topic from "@/lib/db/models/Topic";

// PUT /api/admin/topics/[id] — update topic fields (subTopics, examTags, etc.)
export async function PUT(
  request: Request,
  { params }: RouteContext<"/api/admin/topics/[id]">
) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const { id } = await params;
    const body = await request.json();

    await connectDB();

    const topic = await Topic.findByIdAndUpdate(
      id,
      { $set: body },
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
