import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Report from "@/lib/db/models/Report";
import mongoose from "mongoose";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id ? new mongoose.Types.ObjectId(session.user.id) : undefined;
    
    const body = await request.json();
    const { type, description, questionId, pageUrl } = body;

    if (!type || !description) {
      return NextResponse.json(
        { success: false, error: "Type and description are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const report = await Report.create({
      type,
      description,
      questionId,
      pageUrl,
      userId,
      status: "open",
    });

    return NextResponse.json({ success: true, data: report });
  } catch (error: any) {
    console.error("Create report error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
