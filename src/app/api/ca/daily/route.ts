import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";

// GET /api/ca/daily?date=YYYY-MM-DD
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_INPUT", message: "date YYYY-MM-DD required", statusCode: 400 } },
      { status: 400 }
    );
  }

  await connectDB();
  const items = await Question.find(
    { type: "current_affairs", caType: "daily", caDate: date },
    { answer: 0, explanation: 0 }
  ).sort({ createdAt: 1 }).lean();

  return NextResponse.json({ success: true, data: items, meta: { date, total: items.length } });
}
