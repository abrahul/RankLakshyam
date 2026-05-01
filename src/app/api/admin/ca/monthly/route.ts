import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import { validateEntries, bulkInsertByMonth } from "@/lib/ca/bulk.service";
import CurrentAffair from "@/lib/db/models/CurrentAffair";

const MAX_ENTRIES = 500;

// POST /api/admin/ca/monthly  — bulk insert by month
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const { month, year, entries } = body as { month: number; year: number; entries: unknown[] };

    const m = Number(month);
    const y = Number(year);
    if (!m || m < 1 || m > 12 || !y || y < 2000 || y > 2100) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "month (1-12) and year required", statusCode: 400 } },
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
    const result = await bulkInsertByMonth(m, y, valid);

    return NextResponse.json({
      success: true,
      data: { inserted: result.inserted, skipped: result.skipped, validationErrors, writeErrors: result.errors },
    });
  } catch (err) {
    console.error("CA monthly POST error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal error", statusCode: 500 } },
      { status: 500 }
    );
  }
}

// GET /api/admin/ca/monthly?month=1&year=2026&page=1&limit=50
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  const { searchParams } = new URL(request.url);
  const m = Number(searchParams.get("month"));
  const y = Number(searchParams.get("year"));
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

  if (!m || m < 1 || m > 12 || !y || y < 2000) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_INPUT", message: "month and year required", statusCode: 400 } },
      { status: 400 }
    );
  }

  await connectDB();
  const filter = { month: m, year: y };
  const [items, total] = await Promise.all([
    CurrentAffair.find(filter).sort({ date: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    CurrentAffair.countDocuments(filter),
  ]);

  return NextResponse.json({
    success: true,
    data: items,
    meta: { month: m, year: y, page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
