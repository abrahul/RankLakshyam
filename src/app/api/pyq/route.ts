import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";
import { LEVEL_NAMES } from "@/lib/db/models/Level";

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
    const level = searchParams.get("level");
    const exam = searchParams.get("exam");
    const yearParam = searchParams.get("year");
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const year = yearParam ? parseInt(yearParam, 10) : null;

    await connectDB();

    const match: Record<string, unknown> = {
      isVerified: true,
      sourceType: { $in: ["pyq", "pyq_variant"] },
    };

    if (level && (LEVEL_NAMES as readonly string[]).includes(level)) {
      match.level = level;
    }
    if (exam && exam.length <= 128) match.exam = exam;
    if (year) match["pyq.year"] = year;

    const questions = await Question.aggregate([
      { $match: match },
      { $sample: { size: limit } },
      { $project: { correctOption: 0, explanation: 0, optionWhy: 0 } },
    ]);

    return NextResponse.json({
      success: true,
      data: questions,
      meta: { limit, level: level || undefined, exam: exam || undefined, year: year || undefined },
    });
  } catch (error) {
    console.error("PYQ error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
