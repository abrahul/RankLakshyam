import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import CurrentAffair from "@/lib/db/models/CurrentAffair";

/**
 * GET /api/ca
 * Query params:
 *   month   — number 1-12 (required)
 *   year    — number (required)
 *   date    — YYYY-MM-DD (optional — narrows to exact day)
 *   page    — default 1
 *   limit   — default 30, max 100
 */
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
  const dateParam = searchParams.get("date");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "30", 10)));

  if (!m || m < 1 || m > 12 || !y || y < 2000) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_INPUT", message: "month and year required", statusCode: 400 } },
      { status: 400 }
    );
  }

  await connectDB();

  // Build filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { month: m, year: y };

  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const d = new Date(dateParam);
    const nextDay = new Date(d);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    filter.date = { $gte: d, $lt: nextDay };
  }

  const [items, total] = await Promise.all([
    CurrentAffair.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CurrentAffair.countDocuments(filter),
  ]);

  return NextResponse.json({
    success: true,
    data: items,
    meta: { month: m, year: y, date: dateParam ?? null, page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
