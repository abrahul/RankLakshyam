import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import DailyChallenge from "@/lib/db/models/DailyChallenge";
import Question from "@/lib/db/models/Question";
import { getTodayIST } from "@/lib/utils/scoring";
import { buildWeightedDailyChallengeQuestionIds } from "@/lib/daily-challenge/generate";

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || getTodayIST();

  if (!isValidDateString(date)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_INPUT", message: "Invalid date. Use YYYY-MM-DD.", statusCode: 400 } },
      { status: 400 }
    );
  }

  await connectDB();
  const challenge = await DailyChallenge.findOne({ date }).lean();
  return NextResponse.json({ success: true, data: { date, challenge } });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  const body = await request.json().catch(() => ({})) as { date?: string; force?: boolean };
  const date = body.date || getTodayIST();
  const force = !!body.force;

  if (!isValidDateString(date)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_INPUT", message: "Invalid date. Use YYYY-MM-DD.", statusCode: 400 } },
      { status: 400 }
    );
  }

  await connectDB();

  const existing = await DailyChallenge.findOne({ date });
  if (existing && !force) {
    return NextResponse.json({
      success: true,
      data: { date, created: false, challengeId: existing._id },
    });
  }

  const questionIds = await buildWeightedDailyChallengeQuestionIds();
  if (!questionIds.length) {
    return NextResponse.json(
      { success: false, error: { code: "NO_QUESTIONS", message: "No verified questions available.", statusCode: 404 } },
      { status: 404 }
    );
  }

  const topicMix: Record<string, number> = {};
  for (const q of await Question.find({ _id: { $in: questionIds } }, { topicId: 1 }).lean()) {
    topicMix[q.topicId] = (topicMix[q.topicId] || 0) + 1;
  }

  if (existing) {
    existing.questionIds = questionIds as never;
    existing.topicMix = topicMix;
    existing.difficultyLevel = "mixed";
    await existing.save();
    return NextResponse.json({ success: true, data: { date, created: false, updated: true, challengeId: existing._id } });
  }

  const created = await DailyChallenge.create({
    date,
    questionIds,
    topicMix,
    difficultyLevel: "mixed",
  });

  return NextResponse.json({ success: true, data: { date, created: true, challengeId: created._id } }, { status: 201 });
}

