import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { connectDB } from "@/lib/db/connection";
import User from "@/lib/db/models/User";

const authSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
if (!authSecret || authSecret.includes("generate-a-random-secret-here")) {
  throw new Error(
    "Missing auth secret. Set NEXTAUTH_SECRET (or AUTH_SECRET) in .env.local to a long random value."
  );
}

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

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authSecret,
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

      // Only hit the DB when we have an email and we haven't already attached a DB user id.
      if (email && !token.userId) {
        try {
          await connectDB();
          const dbUser =
            (await User.findOne({ email }).lean()) ??
            (await User.create({
              name: String(name ?? "User"),
              email,
              image: String(image ?? ""),
              role: "user",
              onboarded: false,
            }));

          token.userId = String(dbUser._id);
          token.role = dbUser.role ?? token.role;
          token.onboarded =
            typeof dbUser.onboarded === "boolean" ? dbUser.onboarded : token.onboarded;
          token.targetExam = dbUser.targetExam ?? token.targetExam;
        } catch (error) {
          console.error("Auth DB sync failed (continuing sign-in):", error);
          token.userId = token.userId ?? String(token.sub ?? "");
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
