import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import User from "@/lib/db/models/User";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } }, { status: 401 });
    }

    const body = await request.json();
    const { targetExam, languagePref, reminderTime } = body;

    if (!targetExam || !languagePref) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "targetExam and languagePref are required", statusCode: 400 } },
        { status: 400 }
      );
    }

    await connectDB();
    await User.updateOne(
      { _id: session.user.id },
      {
        $set: {
          targetExam,
          languagePref,
          reminderTime: reminderTime || "07:00",
          onboarded: true,
        },
      }
    );

    return NextResponse.json({ success: true, data: { onboarded: true } });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
