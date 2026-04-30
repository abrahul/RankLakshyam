import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import User from "@/lib/db/models/User";
import jwt from "jsonwebtoken";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
const GOOGLE_CLIENT_ID = process.env.AUTH_GOOGLE_ID || "";

interface GoogleTokenPayload {
  iss: string;
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  aud: string;
  exp: number;
}

async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenPayload> {
  // Verify with Google's tokeninfo endpoint
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
  if (!res.ok) {
    throw new Error("Invalid Google ID token");
  }
  const payload = await res.json();

  // Verify audience matches our client ID
  if (payload.aud !== GOOGLE_CLIENT_ID) {
    throw new Error("Token audience mismatch");
  }

  // Verify expiry
  if (payload.exp && Number(payload.exp) * 1000 < Date.now()) {
    throw new Error("Token expired");
  }

  return payload as GoogleTokenPayload;
}

/**
 * POST /api/auth/mobile
 *
 * Accepts: { idToken: string } — Google ID token from expo-auth-session
 * Returns: { success: true, data: { token, user } }
 *
 * The returned JWT can be used as `Authorization: Bearer <token>` for all API calls.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { success: false, error: "idToken is required" },
        { status: 400 }
      );
    }

    // 1. Verify Google token
    const googleUser = await verifyGoogleIdToken(idToken);

    // 2. Upsert user in DB (same logic as NextAuth JWT callback)
    await connectDB();

    const dbUser = await User.findOneAndUpdate(
      { email: googleUser.email },
      {
        $setOnInsert: {
          name: googleUser.name || "User",
          email: googleUser.email,
          image: googleUser.picture || "",
          role: "user",
          onboarded: false,
        },
      },
      { upsert: true, new: true, lean: true }
    );

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "Failed to create user" },
        { status: 500 }
      );
    }

    // 3. Sign a JWT for mobile use
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

    // 4. Return token + user info
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
  } catch (error: any) {
    console.error("Mobile auth error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Authentication failed" },
      { status: 401 }
    );
  }
}
