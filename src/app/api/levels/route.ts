import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Level from "@/lib/db/models/Level";
import { requireAdmin } from "@/lib/utils/admin-guard";

// GET /api/levels — fetch all levels
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
    const levels = await Level.find({}).sort({ sortOrder: 1 }).lean();

    return NextResponse.json({ success: true, data: levels });
  } catch (error) {
    console.error("Levels GET error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}

// POST /api/levels — admin: add new level
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const { name, displayName, sortOrder } = body;

    if (!name || !displayName?.en) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "name and displayName.en are required", statusCode: 400 } },
        { status: 400 }
      );
    }

    await connectDB();
    const level = await Level.create({ name, displayName, sortOrder: sortOrder ?? 0 });

    return NextResponse.json({ success: true, data: level }, { status: 201 });
  } catch (error) {
    console.error("Levels POST error:", error);
    const message = error instanceof Error ? error.message : "Failed to create level";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message, statusCode: 500 } },
      { status: 500 }
    );
  }
}
