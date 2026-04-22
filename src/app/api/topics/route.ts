import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Topic from "@/lib/db/models/Topic";
import Question from "@/lib/db/models/Question";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } }, { status: 401 });
    }

    await connectDB();
    const topics = await Topic.find({}).sort({ sortOrder: 1 });

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

    const topicsWithCounts = topics.map((t) => ({
      id: t._id,
      name: t.name,
      icon: t.icon,
      color: t.color,
      examTags: t.examTags || [],
      subTopics: (t.subTopics || []).map((st) => ({
        id: st.id,
        name: st.name,
        questionCount: subTopicCount[t._id]?.[st.id] || 0,
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
