import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Topic from "@/lib/db/models/Topic";
import SubTopic from "@/lib/db/models/SubTopic";
import Question from "@/lib/db/models/Question";
import { requireAdmin } from "@/lib/utils/admin-guard";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId") || searchParams.get("levelId");

    await connectDB();

    const topicFilter: Record<string, unknown> = {};
    if (categoryId) topicFilter.categoryId = categoryId;

    const topics = await Topic.find(topicFilter).sort({ sortOrder: 1 });

    // Fetch all subtopics for the topics
    const topicIds = topics.map((t) => t._id);
    const subtopics = await SubTopic.find({ topicId: { $in: topicIds } }).sort({ sortOrder: 1 });

    // Per-topic and per-subtopic counts in one aggregate
    const match: Record<string, unknown> = { isVerified: true };
    if (categoryId && mongoose.isValidObjectId(categoryId)) {
      match.categoryId = new mongoose.Types.ObjectId(categoryId);
    }

    const counts = await Question.aggregate([
      { $match: match },
      { $group: { _id: { topic: "$topicId", subtopic: "$subtopicId" }, count: { $sum: 1 } } },
    ]);

    // Build maps
    const topicTotal: Record<string, number> = {};
    const subTopicCount: Record<string, Record<string, number>> = {};
    for (const c of counts as Array<{ _id: { topic: string; subtopic: unknown }; count: number }>) {
      const { topic, subtopic } = c._id;
      topicTotal[topic] = (topicTotal[topic] || 0) + c.count;
      if (subtopic) {
        const sid = String(subtopic);
        subTopicCount[topic] = subTopicCount[topic] || {};
        subTopicCount[topic][sid] = c.count;
      }
    }

    // Group subtopics by topicId
    const subtopicsByTopic: Record<string, typeof subtopics> = {};
    for (const st of subtopics) {
      const tid = st.topicId;
      if (!subtopicsByTopic[tid]) subtopicsByTopic[tid] = [];
      subtopicsByTopic[tid].push(st);
    }

    const topicsWithCounts = topics.map((t) => ({
      id: t._id,
      name: t.name,
      icon: t.icon,
      color: t.color,
      categoryId: t.categoryId || null,
      subTopics: (subtopicsByTopic[t._id] || []).map((st) => ({
        id: String(st._id),
        name: st.name,
        questionCount: subTopicCount[t._id]?.[String(st._id)] || 0,
      })),
      questionCount: topicTotal[t._id] || 0,
    }));

    return NextResponse.json({ success: true, data: topicsWithCounts });
  } catch (error) {
    console.error("Topics error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}

// POST /api/topics — admin: create topic
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const { id, name, icon, color, categoryId, dailyWeight, sortOrder } = body;

    if (!id || !name?.en || !categoryId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "id, name.en and categoryId are required", statusCode: 400 } },
        { status: 400 }
      );
    }

    await connectDB();
    const created = await Topic.create({
      _id: String(id),
      name: { en: String(name.en).trim(), ml: String(name.ml || "").trim() },
      icon: String(icon || "📚"),
      color: String(color || "#6366f1"),
      categoryId,
      dailyWeight: dailyWeight ?? 2,
      sortOrder: sortOrder ?? 0,
      questionCount: 0,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("Topics POST error:", error);
    const message = error instanceof Error ? error.message : "Failed to create topic";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message, statusCode: 500 } },
      { status: 500 }
    );
  }
}
