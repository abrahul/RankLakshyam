import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import CurrentAffair from "@/lib/db/models/CurrentAffair";

// DELETE /api/admin/ca/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    await connectDB();
    const { id } = await params;
    const deleted = await CurrentAffair.findByIdAndDelete(id);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Entry not found", statusCode: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete", statusCode: 500 } },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/ca/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const { id } = await params;
    await connectDB();

    const updated = await CurrentAffair.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Entry not found", statusCode: 404 } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to update", statusCode: 500 } },
      { status: 500 }
    );
  }
}
