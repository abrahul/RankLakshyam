import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Topic from "@/lib/db/models/Topic";
import SubTopic from "@/lib/db/models/SubTopic";
import Question from "@/lib/db/models/Question";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const levelId = searchParams.get("levelId");

    await connectDB();

    const topicFilter: Record<string, unknown> = {};
    if (levelId) topicFilter.levelId = levelId;

    const topics = await Topic.find(topicFilter).sort({ sortOrder: 1 });

    // Fetch all subtopics for the topics
    const topicIds = topics.map((t) => t._id);
    const subtopics = await SubTopic.find({ topicId: { $in: topicIds } }).sort({ sortOrder: 1 });

    // Per-topic and per-subtopic counts in one aggregate
    const counts = await Question.aggregate([
      { $match: { isVerified: true } },
      { $group: { _id: { topic: "$topicId", subTopic: "$subTopic" }, count: { $sum: 1 } } },
    ]);

    // Build maps
    const topicTotal: Record<string, number> = {};
    const subTopicCount: Record<string, Record<string, number>> = {};
    for (const c of counts as Array<{ _id: { topic: string; subTopic: string }; count: number }>) {
      const { topic, subTopic } = c._id;
      topicTotal[topic] = (topicTotal[topic] || 0) + c.count;
      if (subTopic) {
        subTopicCount[topic] = subTopicCount[topic] || {};
        subTopicCount[topic][subTopic] = c.count;
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
      levelId: t.levelId || null,
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
