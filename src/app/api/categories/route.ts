import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Category from "@/lib/db/models/Category";
import { requireAdmin } from "@/lib/utils/admin-guard";

// GET /api/categories — fetch all categories
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
    const categories = await Category.find({}).sort({ sortOrder: 1 }).lean();
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("Categories GET error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}

// POST /api/categories — admin: add new category
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const { slug, name, sortOrder } = body;

    if (!slug || !name?.en) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "slug and name.en are required", statusCode: 400 } },
        { status: 400 }
      );
    }

    await connectDB();
    const created = await Category.create({
      slug: String(slug).trim().toLowerCase(),
      name: { en: String(name.en).trim(), ml: String(name.ml || "").trim() },
      sortOrder: sortOrder ?? 0,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("Categories POST error:", error);
    const message = error instanceof Error ? error.message : "Failed to create category";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message, statusCode: 500 } },
      { status: 500 }
    );
  }
}

