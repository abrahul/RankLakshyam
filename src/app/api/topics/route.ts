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

    // Get question counts per topic
    const counts = await Question.aggregate([
      { $match: { isVerified: true } },
      { $group: { _id: "$topicId", count: { $sum: 1 } } },
    ]);

    const countMap = Object.fromEntries(counts.map((c: { _id: string; count: number }) => [c._id, c.count]));

    const topicsWithCounts = topics.map((t) => ({
      id: t._id,
      name: t.name,
      icon: t.icon,
      color: t.color,
      subTopics: t.subTopics,
      questionCount: countMap[t._id] || 0,
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
