import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Level from "@/lib/db/models/Level";
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
  const levelParam = searchParams.get("level");

  await connectDB();

  if (levelParam) {
    // Return exams for a specific level
    const level = await Level.findOne({ name: levelParam }).lean();
    if (!level) {
      return NextResponse.json({ success: true, data: { level: levelParam, exams: [] } });
    }

    const exams = await Exam.find({ levelId: level._id }).sort({ name: 1 }).lean();
    const mapped = exams.map((e) => ({ exam: e.name, code: e.code || "" }));

    return NextResponse.json({ success: true, data: { level: levelParam, exams: mapped } });
  }

  // Return all exams grouped by level
  const levels = await Level.find({}).sort({ sortOrder: 1 }).lean();
  const allExams = await Exam.find({}).sort({ name: 1 }).lean();

  const grouped: Record<string, Array<{ exam: string; code: string }>> = {};
  const levelIdToName: Record<string, string> = {};

  for (const level of levels) {
    levelIdToName[String(level._id)] = level.name;
    grouped[level.name] = [];
  }

  for (const exam of allExams) {
    const levelName = levelIdToName[String(exam.levelId)];
    if (levelName && grouped[levelName]) {
      grouped[levelName].push({ exam: exam.name, code: exam.code || "" });
    }
  }

  return NextResponse.json({ success: true, data: grouped });
}
