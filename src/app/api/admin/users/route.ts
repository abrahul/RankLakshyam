import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import User from "@/lib/db/models/User";

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET all users (admin)
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  const { searchParams } = new URL(request.url);
  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
  const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
  const limit = Number.isFinite(rawLimit) ? Math.min(200, Math.max(1, rawLimit)) : 20;
  const search = searchParams.get("search");

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (search) {
    const s = escapeRegex(search.slice(0, 64));
    filter.$or = [
      { name: { $regex: s, $options: "i" } },
      { email: { $regex: s, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("name email image role targetExam stats.totalXP stats.currentStreak stats.totalAttempted stats.accuracy createdAt")
      .lean(),
    User.countDocuments(filter),
  ]);

  return NextResponse.json({
    success: true,
    data: users,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
