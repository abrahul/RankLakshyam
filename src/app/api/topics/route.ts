import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Topic from "@/lib/db/models/Topic";
import SubTopic from "@/lib/db/models/SubTopic";
import Question from "@/lib/db/models/Question";
import { requireAdmin } from "@/lib/utils/admin-guard";

function buildTopicCategoryFilter(categoryId?: string | null) {
  if (!categoryId) return {};
  return {
    $or: [
      { categoryId },
      { categoryIds: categoryId },
    ],
  };
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId") || searchParams.get("levelId");

    await connectDB();

    const topics = await Topic.find(buildTopicCategoryFilter(categoryId)).sort({ sortOrder: 1 });

    const topicIds = topics.map((topic) => topic._id);
    const subtopics = await SubTopic.find({ topicId: { $in: topicIds } }).sort({ sortOrder: 1 });

    const match: Record<string, unknown> = {
      isVerified: true,
      sourceType: { $nin: ["pyq", "pyq_variant"] },
    };
    if (categoryId && mongoose.isValidObjectId(categoryId)) {
      match.categoryId = new mongoose.Types.ObjectId(categoryId);
    }

    const counts = await Question.aggregate([
      { $match: match },
      { $group: { _id: { topic: "$topicId", subtopic: "$subtopicId" }, count: { $sum: 1 } } },
    ]);

    const topicTotal: Record<string, number> = {};
    const subTopicCount: Record<string, Record<string, number>> = {};
    for (const entry of counts as Array<{ _id: { topic: string; subtopic: unknown }; count: number }>) {
      const { topic, subtopic } = entry._id;
      topicTotal[topic] = (topicTotal[topic] || 0) + entry.count;
      if (subtopic) {
        const sid = String(subtopic);
        subTopicCount[topic] = subTopicCount[topic] || {};
        subTopicCount[topic][sid] = entry.count;
      }
    }

    const subtopicsByTopic: Record<string, typeof subtopics> = {};
    for (const subtopic of subtopics) {
      const topicId = subtopic.topicId;
      if (!subtopicsByTopic[topicId]) subtopicsByTopic[topicId] = [];
      subtopicsByTopic[topicId].push(subtopic);
    }

    const topicsWithCounts = topics.map((topic) => {
      const categoryIds = [
        ...new Set(
          [topic.categoryId, ...(topic.categoryIds || [])]
            .filter(Boolean)
            .map((value) => String(value))
        ),
      ];

      return {
        id: topic._id,
        name: topic.name,
        icon: topic.icon,
        color: topic.color,
        categoryId: categoryIds[0] || null,
        categoryIds,
        subTopics: (subtopicsByTopic[topic._id] || []).map((subtopic) => ({
          id: String(subtopic._id),
          name: subtopic.name,
          questionCount: subTopicCount[topic._id]?.[String(subtopic._id)] || 0,
        })),
        questionCount: topicTotal[topic._id] || 0,
      };
    });

    return NextResponse.json({ success: true, data: topicsWithCounts });
  } catch (error) {
    console.error("Topics error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const { id, name, icon, color, categoryId, categoryIds, dailyWeight, sortOrder } = body;

    const normalizedCategoryIds = Array.isArray(categoryIds)
      ? categoryIds.filter((value): value is string => typeof value === "string" && mongoose.isValidObjectId(value))
      : categoryId && mongoose.isValidObjectId(categoryId)
        ? [categoryId]
        : [];

    if (!id || !name?.en || normalizedCategoryIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "id, name.en and at least one category are required", statusCode: 400 } },
        { status: 400 }
      );
    }

    await connectDB();
    const created = await Topic.create({
      _id: String(id),
      name: { en: String(name.en).trim(), ml: String(name.ml || "").trim() },
      icon: String(icon || "📚"),
      color: String(color || "#6366f1"),
      categoryId: normalizedCategoryIds[0],
      categoryIds: normalizedCategoryIds,
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
