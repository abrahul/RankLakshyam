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
    const mode = searchParams.get("mode");
    const rawCount = searchParams.get("count") || searchParams.get("limit") || "20";
    const wantsAll =
      searchParams.get("all") === "1" ||
      searchParams.get("all") === "true" ||
      rawCount.toLowerCase() === "all";
    const rawLimit = parseInt(rawCount, 10);
    const maxLimit = 200;
    const limit = Math.min(maxLimit, Math.max(1, wantsAll ? maxLimit : Number.isFinite(rawLimit) ? rawLimit : 20));
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
    if (exam && exam.length <= 128) {
      match.$or = [{ exam }, { "pyq.exam": exam }, { examCode: exam }];
    }
    if (year) match["pyq.year"] = year;

    if (mode === "papers") {
      const papers = await Question.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              exam: { $ifNull: ["$pyq.exam", "$exam"] },
              year: "$pyq.year",
              categoryId: "$categoryId",
            },
            count: { $sum: 1 },
          },
        },
        { $match: { "_id.exam": { $ne: "" } } },
        { $sort: { "_id.year": -1, "_id.exam": 1 } },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            exam: "$_id.exam",
            year: "$_id.year",
            categoryId: "$_id.categoryId",
            count: 1,
          },
        },
      ]);

      return NextResponse.json({
        success: true,
        data: papers,
        meta: {
          limit,
          categoryId: resolvedCategoryId ? String(resolvedCategoryId) : undefined,
          exam: exam || undefined,
          year: year || undefined,
        },
      });
    }

    const questionStages: mongoose.PipelineStage[] = [{ $match: match }];
    if (exam || year || wantsAll) {
      questionStages.push({ $sort: { "pyq.year": -1, "pyq.questionNumber": 1, createdAt: 1 } });
      questionStages.push({ $limit: limit });
    } else {
      questionStages.push({ $sample: { size: limit } });
    }
    questionStages.push({ $project: { answer: 0, correctOption: 0, explanation: 0, optionWhy: 0 } });

    const [questions, total] = await Promise.all([
      Question.aggregate(questionStages),
      Question.countDocuments(match),
    ]);

    return NextResponse.json({
      success: true,
      data: questions,
      meta: {
        limit,
        total,
        requestedAll: wantsAll,
        capped: wantsAll && total > limit,
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
