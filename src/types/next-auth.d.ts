import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      role?: string;
      onboarded?: boolean;
      targetExam?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: string;
    onboarded?: boolean;
    targetExam?: string;
    dbSyncedAt?: number;
  }
}
