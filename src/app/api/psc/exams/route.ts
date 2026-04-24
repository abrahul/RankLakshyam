import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Category from "@/lib/db/models/Category";
import Exam from "@/lib/db/models/Exam";

// GET /api/psc/exams — returns exams from the database, optionally filtered by level name
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const categoryParam = searchParams.get("category") || searchParams.get("level");

  await connectDB();

  if (categoryParam) {
    const category = await Category.findOne({ slug: categoryParam }).lean();
    if (!category) {
      return NextResponse.json({ success: true, data: { category: categoryParam, exams: [] } });
    }

    const exams = await Exam.find({ categoryId: category._id }).sort({ name: 1 }).lean();
    const mapped = exams.map((e) => ({ exam: e.name, code: e.code || "" }));

    return NextResponse.json({ success: true, data: { category: categoryParam, exams: mapped } });
  }

  // Return all exams grouped by category slug
  const categories = await Category.find({}).sort({ sortOrder: 1 }).lean();
  const allExams = await Exam.find({}).sort({ name: 1 }).lean();

  const grouped: Record<string, Array<{ exam: string; code: string }>> = {};
  const categoryIdToSlug: Record<string, string> = {};

  for (const c of categories) {
    categoryIdToSlug[String(c._id)] = c.slug;
    grouped[c.slug] = [];
  }

  for (const exam of allExams) {
    const slug = categoryIdToSlug[String(exam.categoryId)];
    if (slug && grouped[slug]) {
      grouped[slug].push({ exam: exam.name, code: exam.code || "" });
    }
  }

  return NextResponse.json({ success: true, data: grouped });
}
