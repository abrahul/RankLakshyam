import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";

type ExamTag = "ldc" | "lgs" | "degree" | "police";

function normalizeExamTag(value: string | null): ExamTag | null {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v === "ldc") return "ldc";
  if (v === "lgs") return "lgs";
  if (v === "degree" || v === "degree_level") return "degree";
  if (v === "police") return "police";
  return null;
}

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
    const examTag = normalizeExamTag(searchParams.get("exam"));
    const yearParam = searchParams.get("year");
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const year = yearParam ? parseInt(yearParam, 10) : null;

    await connectDB();

    const match: Record<string, unknown> = {
      isVerified: true,
      sourceType: { $in: ["pyq", "pyq_variant"] },
    };

    if (examTag) match.examTags = examTag;
    if (year) match["pyq.year"] = year;

    const questions = await Question.aggregate([
      { $match: match },
      { $sample: { size: limit } },
      { $project: { correctOption: 0, explanation: 0, optionWhy: 0 } },
    ]);

    return NextResponse.json({
      success: true,
      data: questions,
      meta: { limit, exam: examTag, year: year || undefined },
    });
  } catch (error) {
    console.error("PYQ error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}

