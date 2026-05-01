import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import { validateEntries, bulkInsertByDate } from "@/lib/ca/bulk.service";
import CurrentAffair from "@/lib/db/models/CurrentAffair";

const MAX_ENTRIES = 500;

// POST /api/admin/ca/daily  — bulk insert by date
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const { date, entries } = body as { date: string; entries: unknown[] };

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "date YYYY-MM-DD required", statusCode: 400 } },
        { status: 400 }
      );
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "entries[] required", statusCode: 400 } },
        { status: 400 }
      );
    }
    if (entries.length > MAX_ENTRIES) {
      return NextResponse.json(
        { success: false, error: { code: "LIMIT_EXCEEDED", message: `Max ${MAX_ENTRIES} per batch`, statusCode: 400 } },
        { status: 400 }
      );
    }

    const { valid, errors: validationErrors } = validateEntries(entries);
    await connectDB();
    const result = await bulkInsertByDate(date, valid);

    return NextResponse.json({
      success: true,
      data: { inserted: result.inserted, skipped: result.skipped, validationErrors, writeErrors: result.errors },
    });
  } catch (err) {
    console.error("CA daily POST error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal error", statusCode: 500 } },
      { status: 500 }
    );
  }
}

// GET /api/admin/ca/daily?date=YYYY-MM-DD&page=1&limit=50
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_INPUT", message: "date YYYY-MM-DD required", statusCode: 400 } },
      { status: 400 }
    );
  }

  await connectDB();
  const d = new Date(date);
  const nextDay = new Date(d);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const filter = { date: { $gte: d, $lt: nextDay } };
  const [items, total] = await Promise.all([
    CurrentAffair.find(filter).sort({ date: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    CurrentAffair.countDocuments(filter),
  ]);

  return NextResponse.json({
    success: true,
    data: items,
    meta: { date, page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
