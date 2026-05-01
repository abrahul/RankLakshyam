import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import {
  CURRENT_AFFAIRS_SAMPLE,
  getCAEntries,
  importCurrentAffairsQuestions,
  parseCAScope,
} from "@/lib/current-affairs/admin-import";

// GET /api/admin/ca/bulk returns a sample payload for import tools.
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  return NextResponse.json({
    success: true,
    data: CURRENT_AFFAIRS_SAMPLE,
  });
}

// POST /api/admin/ca/bulk
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json() as Record<string, unknown>;
    const scope = parseCAScope(body);
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
      maxItems: scope.caType === "daily" ? 100 : 500,
    });

    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    console.error("CA bulk POST error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
