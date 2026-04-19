import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import User from "@/lib/db/models/User";

// GET all users (admin)
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search");

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
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
