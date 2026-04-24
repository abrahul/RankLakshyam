import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Topic from "@/lib/db/models/Topic";
import SubTopic from "@/lib/db/models/SubTopic";
import Question from "@/lib/db/models/Question";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/topics/[id]">
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectDB();

    const topic = await Topic.findById(id).lean();
    if (!topic) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Topic not found", statusCode: 404 } },
        { status: 404 }
      );
    }

    const subtopics = await SubTopic.find({ topicId: id }).sort({ sortOrder: 1 }).lean();

    const subTopicCounts = await Question.aggregate([
      { $match: { topicId: id, isVerified: true } },
      { $group: { _id: "$subtopicId", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(
      subTopicCounts.map((entry: { _id: unknown; count: number }) => [String(entry._id), entry.count])
    );

    const categoryIds = [
      ...new Set(
        [topic.categoryId, ...(topic.categoryIds || [])]
          .filter(Boolean)
          .map((value) => String(value))
      ),
    ];

    return NextResponse.json({
      success: true,
      data: {
        id: topic._id,
        name: topic.name,
        icon: topic.icon,
        color: topic.color,
        categoryId: categoryIds[0] || null,
        categoryIds,
        subTopics: subtopics.map((subtopic) => ({
          id: String(subtopic._id),
          name: subtopic.name,
          questionCount: countMap[String(subtopic._id)] || 0,
        })),
        totalQuestions: Object.values(countMap).reduce((sum: number, count: number) => sum + count, 0),
      },
    });
  } catch (error) {
    console.error("Topic detail error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
