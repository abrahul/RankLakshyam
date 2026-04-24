import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Exam from "@/lib/db/models/Exam";
import Level from "@/lib/db/models/Level";
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
    const levelId = searchParams.get("levelId");
    const levelName = searchParams.get("level"); // convenience: filter by level name

    await connectDB();

    const filter: Record<string, unknown> = {};

    if (levelId) {
      filter.levelId = levelId;
    } else if (levelName) {
      const level = await Level.findOne({ name: levelName }).lean();
      if (level) {
        filter.levelId = level._id;
      } else {
        return NextResponse.json({ success: true, data: [] });
      }
    }

    const exams = await Exam.find(filter)
      .populate("levelId", "name displayName")
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
    const { name, code, levelId, note } = body;

    if (!name || !levelId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "name and levelId are required", statusCode: 400 } },
        { status: 400 }
      );
    }

    await connectDB();

    // Validate levelId exists
    const level = await Level.findById(levelId).lean();
    if (!level) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "Invalid levelId", statusCode: 400 } },
        { status: 400 }
      );
    }

    const exam = await Exam.create({ name, code: code || null, levelId, note: note || "" });

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
