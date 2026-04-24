import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import SubTopic from "@/lib/db/models/SubTopic";
import { requireAdmin } from "@/lib/utils/admin-guard";

// GET /api/subtopics — fetch subtopics, filtered by topicId
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get("topicId");

    await connectDB();

    const filter: Record<string, unknown> = {};
    if (topicId) filter.topicId = topicId;

    const subtopics = await SubTopic.find(filter).sort({ sortOrder: 1 }).lean();

    return NextResponse.json({ success: true, data: subtopics });
  } catch (error) {
    console.error("SubTopics GET error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}

// POST /api/subtopics — admin: add new subtopic
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const { name, topicId, sortOrder } = body;

    if (!name?.en || !topicId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "name.en and topicId are required", statusCode: 400 } },
        { status: 400 }
      );
    }

    await connectDB();
    const subtopic = await SubTopic.create({
      name: { en: name.en, ml: name.ml || "" },
      topicId,
      sortOrder: sortOrder ?? 0,
    });

    return NextResponse.json({ success: true, data: subtopic }, { status: 201 });
  } catch (error) {
    console.error("SubTopics POST error:", error);
    const message = error instanceof Error ? error.message : "Failed to create subtopic";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message, statusCode: 500 } },
      { status: 500 }
    );
  }
}
