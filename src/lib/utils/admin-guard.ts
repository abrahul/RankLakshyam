import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required", statusCode: 401 } },
        { status: 401 }
      ),
    };
  }

  if (session.user.role !== "admin") {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Admin access required", statusCode: 403 } },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true as const,
    userId: session.user.id,
    session,
  };
}
