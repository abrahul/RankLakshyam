import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db/connection";
import User from "@/lib/db/models/User";

export const runtime = "nodejs";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, error: "Dev login is disabled in production" },
      { status: 403 }
    );
  }

  if (!AUTH_SECRET) {
    return NextResponse.json(
      { success: false, error: "Missing auth secret" },
      { status: 500 }
    );
  }

  try {
    await connectDB();

    const dbUser = await User.findOneAndUpdate(
      { email: "dev@ranklakshyam.local" },
      {
        $setOnInsert: {
          name: "Dev User",
          email: "dev@ranklakshyam.local",
          image: "",
          role: "user",
          onboarded: false,
          targetExam: "ldc",
        },
      },
      { upsert: true, new: true, lean: true }
    );

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "Failed to create dev user" },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      {
        userId: String(dbUser._id),
        email: dbUser.email,
        role: dbUser.role || "user",
        onboarded: dbUser.onboarded ?? false,
        targetExam: dbUser.targetExam || "ldc",
      },
      AUTH_SECRET,
      { expiresIn: "30d" }
    );

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: String(dbUser._id),
          name: dbUser.name,
          email: dbUser.email,
          image: dbUser.image,
          role: dbUser.role || "user",
          onboarded: dbUser.onboarded ?? false,
          targetExam: dbUser.targetExam || "ldc",
        },
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Dev login failed",
      },
      { status: 500 }
    );
  }
}
