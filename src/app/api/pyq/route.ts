import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Category from "@/lib/db/models/Category";
import Question from "@/lib/db/models/Question";
import { categoryMatchesLegacyLevel, isLegacyLevelKey } from "@/lib/category-levels";
import mongoose from "mongoose";

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
    const categoryIdParam = searchParams.get("categoryId");
    const legacyLevel = searchParams.get("level");
    const exam = searchParams.get("exam");
    const yearParam = searchParams.get("year");
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const year = yearParam ? parseInt(yearParam, 10) : null;

    await connectDB();

    let resolvedCategoryId: mongoose.Types.ObjectId | null = null;
    if (categoryIdParam && mongoose.isValidObjectId(categoryIdParam)) {
      resolvedCategoryId = new mongoose.Types.ObjectId(categoryIdParam);
    } else if (legacyLevel && isLegacyLevelKey(legacyLevel)) {
      const categories = await Category.find({})
        .select({ _id: 1, slug: 1, name: 1 })
        .lean();
      const category = categories.find((entry) => categoryMatchesLegacyLevel(entry, legacyLevel));
      if (category?._id) resolvedCategoryId = category._id as mongoose.Types.ObjectId;
    }

    const match: Record<string, unknown> = {
      isVerified: true,
      sourceType: { $in: ["pyq", "pyq_variant"] },
    };

    if (resolvedCategoryId) match.categoryId = resolvedCategoryId;
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
      meta: {
        limit,
        categoryId: resolvedCategoryId ? String(resolvedCategoryId) : undefined,
        exam: exam || undefined,
        year: year || undefined,
      },
    });
  } catch (error) {
    console.error("PYQ error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
