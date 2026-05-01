import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";

// GET /api/ca/monthly?month=1&year=2026
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const m = Number(searchParams.get("month") ?? now.getMonth() + 1);
  const y = Number(searchParams.get("year") ?? now.getFullYear());

  if (!m || m < 1 || m > 12 || !y || y < 2000) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_INPUT", message: "month and year required", statusCode: 400 } },
      { status: 400 }
    );
  }

  await connectDB();
  const items = await Question.find(
    { type: "current_affairs", caType: "monthly", caMonth: m, caYear: y },
    { answer: 0, explanation: 0 }
  ).sort({ createdAt: 1 }).lean();

  return NextResponse.json({ success: true, data: items, meta: { month: m, year: y, total: items.length } });
}
