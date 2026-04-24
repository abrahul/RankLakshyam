import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Exam from "@/lib/db/models/Exam";
import Category from "@/lib/db/models/Category";
import { requireAdmin } from "@/lib/utils/admin-guard";

// GET /api/exams — fetch exams, optionally filtered by level
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
    const categoryId = searchParams.get("categoryId");
    const categorySlug = searchParams.get("category"); // convenience: filter by category slug

    await connectDB();

    const filter: Record<string, unknown> = {};

    if (categoryId) {
      filter.categoryId = categoryId;
    } else if (categorySlug) {
      const category = await Category.findOne({ slug: categorySlug }).lean();
      if (category) {
        filter.categoryId = category._id;
      } else {
        return NextResponse.json({ success: true, data: [] });
      }
    }

    const exams = await Exam.find(filter)
      .populate("categoryId", "slug name sortOrder")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ success: true, data: exams });
  } catch (error) {
    console.error("Exams GET error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}

// POST /api/exams — admin: add new exam
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const { name, code, categoryId, note } = body;

    if (!name || !categoryId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "name and categoryId are required", statusCode: 400 } },
        { status: 400 }
      );
    }

    await connectDB();

    // Validate categoryId exists
    const category = await Category.findById(categoryId).lean();
    if (!category) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "Invalid categoryId", statusCode: 400 } },
        { status: 400 }
      );
    }

    const exam = await Exam.create({ name, code: code || null, categoryId, note: note || "" });

    return NextResponse.json({ success: true, data: exam }, { status: 201 });
  } catch (error) {
    console.error("Exams POST error:", error);
    const message = error instanceof Error ? error.message : "Failed to create exam";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message, statusCode: 500 } },
      { status: 500 }
    );
  }
}
