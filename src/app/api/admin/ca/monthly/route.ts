import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";
import { getCAEntries, importCurrentAffairsQuestions, parseCAScope } from "@/lib/current-affairs/admin-import";

// POST /api/admin/ca/monthly
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json() as Record<string, unknown>;
    const scope = parseCAScope({ ...body, caType: "monthly" });
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
      maxItems: 500,
    });

    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    console.error("CA monthly POST error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal error", statusCode: 500 } },
      { status: 500 }
    );
  }
}

// GET /api/admin/ca/monthly?month=1&year=2026
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  const { searchParams } = new URL(request.url);
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  if (!month || month < 1 || month > 12 || !year || year < 2000) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_INPUT", message: "month and year required", statusCode: 400 } },
      { status: 400 }
    );
  }

  await connectDB();
  const items = await Question.find({ type: "current_affairs", caType: "monthly", caMonth: month, caYear: year }).sort({ createdAt: 1 }).lean();
  return NextResponse.json({ success: true, data: items });
}
