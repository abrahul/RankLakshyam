import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";
import { getCAEntries, importCurrentAffairsQuestions, parseCAScope } from "@/lib/current-affairs/admin-import";

// POST /api/admin/ca/daily
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json() as Record<string, unknown>;
    const scope = parseCAScope({ ...body, caType: "daily" });
    if ("error" in scope) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: scope.error, statusCode: 400 } },
        { status: 400 }
      );
    }

    const entries = getCAEntries(body);
    if (!entries) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "questions/items array required", statusCode: 400 } },
        { status: 400 }
      );
    }

    const results = await importCurrentAffairsQuestions({
      entries,
      scope,
      createdBy: guard.userId,
      maxItems: 100,
    });

    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    console.error("CA daily POST error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal error", statusCode: 500 } },
      { status: 500 }
    );
  }
}

// GET /api/admin/ca/daily?date=YYYY-MM-DD
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_INPUT", message: "date YYYY-MM-DD required", statusCode: 400 } },
      { status: 400 }
    );
  }

  await connectDB();
  const items = await Question.find({ type: "current_affairs", caType: "daily", caDate: date }).sort({ createdAt: 1 }).lean();
  return NextResponse.json({ success: true, data: items });
}
