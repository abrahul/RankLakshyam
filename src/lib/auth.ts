import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { connectDB } from "@/lib/db/connection";
import User from "@/lib/db/models/User";
import mongoose from "mongoose";

const authDbSyncTimeoutRaw = Number(process.env.AUTH_DB_SYNC_TIMEOUT_MS);
const AUTH_DB_SYNC_TIMEOUT_MS =
  Number.isFinite(authDbSyncTimeoutRaw) && authDbSyncTimeoutRaw > 0
    ? authDbSyncTimeoutRaw
    : 2500;
const AUTH_DB_SYNC_DISABLED = ["0", "false", "off"].includes(
  String(process.env.AUTH_DB_SYNC ?? "").toLowerCase()
);
const AUTH_DB_SYNC_PROJECTION = {
  _id: 1,
  role: 1,
  onboarded: 1,
  targetExam: 1,
} as const;

let authDbSyncDisabledUntil = 0;
let authDbSyncFailureCount = 0;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) {
    return Promise.reject(new Error(`${label} timed out`));
  }

  let timeoutId: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function markAuthDbSyncSuccess() {
  authDbSyncFailureCount = 0;
  authDbSyncDisabledUntil = 0;
}

function markAuthDbSyncFailure(error: unknown) {
  const now = Date.now();
  const wasDisabled = now < authDbSyncDisabledUntil;

  authDbSyncFailureCount = Math.min(authDbSyncFailureCount + 1, 10);
  const backoffMs = Math.min(30_000 * 2 ** Math.min(authDbSyncFailureCount - 1, 4), 10 * 60_000);
  authDbSyncDisabledUntil = now + backoffMs;

  if (!wasDisabled) {
    console.error(
      `Auth DB sync failed (continuing sign-in). Backing off for ${backoffMs}ms:`,
      error
    );
  }
}

const authSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
if (!authSecret || authSecret.includes("generate-a-random-secret-here")) {
  throw new Error(
    "Missing auth secret. Set NEXTAUTH_SECRET (or AUTH_SECRET) in .env.local to a long random value."
  );
}
const resolvedAuthSecret = authSecret;

const googleClientId = process.env.AUTH_GOOGLE_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;
if (!googleClientId || googleClientId.includes("your-google-client-id")) {
  throw new Error(
    "Missing Google OAuth client id. Set AUTH_GOOGLE_ID in .env.local (ends with .apps.googleusercontent.com)."
  );
}
if (!googleClientSecret || googleClientSecret.includes("your-google-client-secret")) {
  throw new Error("Missing Google OAuth client secret. Set AUTH_GOOGLE_SECRET in .env.local.");
}

const nextAuth = NextAuth({
  secret: resolvedAuthSecret,
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  callbacks: {
    async signIn() {
      // Never block OAuth sign-in due to DB issues.
      // We'll attempt to sync the user record in the JWT callback.
      return true;
    },
    async jwt({ token, user }) {
      const email = String(user?.email ?? token.email ?? "");
      const name = user?.name ?? token.name ?? "User";
      const image = user?.image ?? token.picture ?? "";

      // Safe defaults so the session remains usable even when DB is down.
      token.role = token.role ?? "user";
      token.onboarded = token.onboarded ?? false;
      token.dbSyncedAt = token.dbSyncedAt ?? 0;

      // If an earlier login happened while the DB was down, we may have a non-ObjectId
      // fallback in `token.userId` (e.g. a UUID from `token.sub`). Retry syncing once DB is up.
      const hasValidDbUserId =
        typeof token.userId === "string" && mongoose.isValidObjectId(token.userId);

      const shouldRefreshFromDb =
        Date.now() - (typeof token.dbSyncedAt === "number" ? token.dbSyncedAt : 0) >
        5 * 60 * 1000;

      // Sync user from DB periodically so role/onboarding changes take effect for existing sessions.
      if (email && (!hasValidDbUserId || shouldRefreshFromDb)) {
        if (AUTH_DB_SYNC_DISABLED) return token;
        if (Date.now() < authDbSyncDisabledUntil) return token;

        try {
          await withTimeout(connectDB(), AUTH_DB_SYNC_TIMEOUT_MS, "connectDB");

          const dbUser = await withTimeout(
            User.findOneAndUpdate(
              { email },
              {
                $setOnInsert: {
                  name: String(name ?? "User"),
                  email,
                  image: String(image ?? ""),
                  role: "user",
                  onboarded: false,
                },
              },
              {
                upsert: true,
                new: true,
                lean: true,
                projection: AUTH_DB_SYNC_PROJECTION,
                maxTimeMS: AUTH_DB_SYNC_TIMEOUT_MS,
              }
            ),
            AUTH_DB_SYNC_TIMEOUT_MS,
            "User.findOneAndUpdate"
          );

          if (!dbUser) throw new Error("User lookup failed after upsert.");

          token.userId = String(dbUser._id);
          token.role = dbUser.role ?? token.role;
          token.onboarded =
            typeof dbUser.onboarded === "boolean" ? dbUser.onboarded : token.onboarded;
          token.targetExam = dbUser.targetExam ?? token.targetExam;
          token.dbSyncedAt = Date.now();
          markAuthDbSyncSuccess();
        } catch (error) {
          markAuthDbSyncFailure(error);
          // Don't poison the token with a non-ObjectId id; allow retry on next request.
          if (typeof token.userId !== "string" || !mongoose.isValidObjectId(token.userId)) {
            delete token.userId;
          }
          token.dbSyncedAt = Date.now();
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.userId) session.user.id = String(token.userId);
        else if (token.sub) session.user.id = String(token.sub);

        if (token.role) session.user.role = String(token.role);
        if (typeof token.onboarded === "boolean") session.user.onboarded = token.onboarded;
        if (token.targetExam) session.user.targetExam = String(token.targetExam);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
});

export const { handlers, signIn, signOut } = nextAuth;

// Re-export auth with mobile Bearer token support.
// When a mobile client sends `Authorization: Bearer <jwt>`, we decode it directly
// instead of relying on the NextAuth cookie. This avoids modifying every API route.
import jwt from "jsonwebtoken";
import { headers } from "next/headers";

type MobileSession = {
  user: {
    id: string;
    email: string;
    role: string;
    onboarded: boolean;
    targetExam: string;
    name?: string;
    image?: string;
  };
};

type MobileBearerPayload = {
  userId: string;
  email: string;
  role?: string;
  onboarded?: boolean;
  targetExam?: string;
};

async function mobileAuthFromBearer(): Promise<MobileSession | null> {
  try {
    const headersList = await headers();
    const authorization = headersList.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return null;

    const token = authorization.slice(7);
    const decoded = jwt.verify(token, resolvedAuthSecret) as unknown as MobileBearerPayload;
    if (!decoded.userId || !decoded.email) return null;

    return {
      user: {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role || "user",
        onboarded: decoded.onboarded ?? false,
        targetExam: decoded.targetExam || "ldc",
      },
    };
  } catch {
    return null;
  }
}

export async function auth(): Promise<any> {
  // Check for mobile Bearer token first
  const mobileSession = await mobileAuthFromBearer();
  if (mobileSession) return mobileSession;

  // Fall back to NextAuth cookie-based session
  return nextAuth.auth();
}
