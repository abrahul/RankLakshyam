import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import { validateEntries, bulkInsertByDate } from "@/lib/ca/bulk.service";

const MAX_ENTRIES = 500;

// POST /api/admin/ca/bulk/date
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
        { success: false, error: { code: "LIMIT_EXCEEDED", message: `Max ${MAX_ENTRIES} entries per batch`, statusCode: 400 } },
        { status: 400 }
      );
    }

    const { valid, errors: validationErrors } = validateEntries(entries);

    if (valid.length === 0) {
      return NextResponse.json({
        success: false,
        error: { code: "ALL_INVALID", message: "No valid entries", statusCode: 422 },
        data: { inserted: 0, skipped: 0, validationErrors },
      }, { status: 422 });
    }

    await connectDB();
    const result = await bulkInsertByDate(date, valid);

    return NextResponse.json({
      success: true,
      data: {
        inserted: result.inserted,
        skipped: result.skipped,
        validationErrors,
        writeErrors: result.errors,
      },
    });
  } catch (err) {
    console.error("CA bulk/date error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
