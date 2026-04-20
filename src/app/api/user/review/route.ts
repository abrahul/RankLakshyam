import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import QuestionProgress from "@/lib/db/models/QuestionProgress";
import TopicPerformance from "@/lib/db/models/TopicPerformance";
import StylePerformance from "@/lib/db/models/StylePerformance";
import TestAttempt from "@/lib/db/models/TestAttempt";
import Question from "@/lib/db/models/Question";

const ALLOWED_FILTERS = ["wrong", "unattempted", "weak_topics", "weak_styles"] as const;
type Filter = (typeof ALLOWED_FILTERS)[number];

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
    const filter = (searchParams.get("filter") || "wrong") as Filter;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(50, Math.max(10, parseInt(searchParams.get("limit") || "20", 10)));

    if (!ALLOWED_FILTERS.includes(filter)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_FILTER", message: "Invalid filter", statusCode: 400 } },
        { status: 400 }
      );
    }

    await connectDB();

    let questionIds: string[] = [];

    if (filter === "wrong") {
      const docs = await QuestionProgress.find({ userId: session.user.id, wrongAttempts: { $gte: 1 } })
        .sort({ lastAttemptedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      questionIds = docs.map((d) => String(d.questionId));
    }

    if (filter === "unattempted") {
      const recent = await TestAttempt.find({ userId: session.user.id, unattemptedCount: { $gte: 1 } })
        .sort({ completedAt: -1 })
        .limit(50)
        .lean();

      const set = new Set<string>();
      for (const t of recent) {
        for (const q of t.questions) {
          if (!q.selectedOption) set.add(String(q.questionId));
        }
      }
      questionIds = Array.from(set).slice((page - 1) * limit, page * limit);
    }

    if (filter === "weak_topics") {
      const weakTopics = await TopicPerformance.find({ userId: session.user.id, attempts: { $gte: 5 }, accuracy: { $lt: 60 } })
        .sort({ accuracy: 1 })
        .limit(5)
        .lean();
      const topicIds = weakTopics.map((t) => t.topicId);
      const qs = await Question.find({ topicId: { $in: topicIds }, isVerified: true })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      questionIds = qs.map((q) => String(q._id));
    }

    if (filter === "weak_styles") {
      const weakStyles = await StylePerformance.find({ userId: session.user.id, attempts: { $gte: 5 }, accuracy: { $lt: 60 } })
        .sort({ accuracy: 1 })
        .limit(3)
        .lean();
      const styles = weakStyles.map((s) => s.questionStyle);
      const qs = await Question.find({ questionStyle: { $in: styles }, isVerified: true })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      questionIds = qs.map((q) => String(q._id));
    }

    const questions = questionIds.length
      ? await Question.find(
          { _id: { $in: questionIds } },
          { text: 1, options: 1, correctOption: 1, explanation: 1, topicId: 1, subTopic: 1, difficulty: 1, questionStyle: 1 }
        ).lean()
      : [];
    const byId = new Map<string, (typeof questions)[number]>(questions.map((q) => [String(q._id), q]));

    const ordered = questionIds
      .map((id) => byId.get(String(id)))
      .filter(Boolean)
      .map((q) => {
        const qq = q as unknown as {
          _id: unknown;
          text: { en: string; ml: string };
          options: Array<{ key: string; en: string; ml: string }>;
          correctOption: "A" | "B" | "C" | "D";
          explanation: { en: string; ml: string };
          topicId: string;
          subTopic?: string;
          difficulty?: number;
          questionStyle?: string;
        };
        return {
          _id: qq._id,
          text: qq.text,
          options: qq.options,
          correctOption: qq.correctOption,
          explanation: qq.explanation,
          topicId: qq.topicId,
          subTopic: qq.subTopic,
          difficulty: qq.difficulty,
          questionStyle: qq.questionStyle,
        };
      });

    return NextResponse.json({
      success: true,
      data: ordered,
      meta: { page, limit, count: ordered.length },
    });
  } catch (error) {
    console.error("User review error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
