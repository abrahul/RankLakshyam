import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import TopicPerformance from "@/lib/db/models/TopicPerformance";
import StylePerformance from "@/lib/db/models/StylePerformance";
import Question from "@/lib/db/models/Question";
import TestSession from "@/lib/db/models/TestSession";
import mongoose from "mongoose";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } },
        { status: 401 }
      );
    }

    await connectDB();

    const [weakTopics, weakStyles] = await Promise.all([
      TopicPerformance.find({ userId: session.user.id, attempts: { $gte: 5 } })
        .sort({ accuracy: 1 })
        .limit(4)
        .lean(),
      StylePerformance.find({ userId: session.user.id, attempts: { $gte: 5 } })
        .sort({ accuracy: 1 })
        .limit(2)
        .lean(),
    ]);

    const topicIds = weakTopics.map((t) => t.topicId);
    const styles = weakStyles.map((s) => s.questionStyle);

    const candidates = await Question.find(
      {
        isVerified: true,
        $or: [
          ...(topicIds.length ? [{ topicId: { $in: topicIds } }] : []),
          ...(styles.length ? [{ questionStyle: { $in: styles } }] : []),
        ],
      },
      { _id: 1 }
    ).lean();

    const pool = candidates.map((c) => c._id);
    let questionIds: mongoose.Types.ObjectId[] = [];

    if (pool.length) {
      const sample = await Question.aggregate([
        { $match: { _id: { $in: pool } } },
        { $sample: { size: Math.min(20, pool.length) } },
        { $project: { _id: 1 } },
      ]);
      questionIds = sample.map((s: { _id: mongoose.Types.ObjectId }) => s._id);
    }

    if (questionIds.length < 20) {
      const filler = await Question.aggregate([
        { $match: { isVerified: true, _id: { $nin: questionIds } } },
        { $sample: { size: 20 - questionIds.length } },
        { $project: { _id: 1 } },
      ]);
      questionIds = [
        ...questionIds,
        ...filler.map((f: { _id: mongoose.Types.ObjectId }) => f._id),
      ];
    }

    const testSession = await TestSession.create({
      userId: session.user.id,
      type: "weak_area",
      context: { mode: "weak" },
      questionIds,
      totalQuestions: questionIds.length,
      status: "in_progress",
      startedAt: new Date(),
    });

    const questions = await Question.find(
      { _id: { $in: questionIds } },
      { text: 1, options: 1, topicId: 1, difficulty: 1 }
    ).lean();
    const byId = new Map<string, (typeof questions)[number]>(questions.map((q) => [String(q._id), q]));
    const ordered = questionIds.map((id) => byId.get(String(id))).filter(Boolean);

    return NextResponse.json({
      success: true,
      data: {
        sessionId: testSession._id,
        questions: ordered,
        totalQuestions: ordered.length,
        targets: {
          topics: weakTopics.map((t) => ({ topicId: t.topicId, accuracy: t.accuracy })),
          styles: weakStyles.map((s) => ({ questionStyle: s.questionStyle, accuracy: s.accuracy })),
        },
      },
    });
  } catch (error) {
    console.error("Focus weak error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
