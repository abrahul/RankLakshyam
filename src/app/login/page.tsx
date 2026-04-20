"use client";

import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function LoginPageInner() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-primary-600/20 blur-[100px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-accent-500/15 blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/3 left-1/2 w-60 h-60 rounded-full bg-primary-400/10 blur-[80px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary mb-6 animate-pulse-glow">
            <span className="text-4xl">🏆</span>
          </div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] tracking-tight text-white mb-2">
            RankLakshyam
          </h1>
          <p className="text-surface-200 text-lg">
            Kerala PSC Preparation System
          </p>
          <p className="text-surface-200/60 text-sm mt-1">
            കേരള PSC പരിശീലന സംവിധാനം
          </p>
        </div>

        {error ? (
          <div className="glass-card p-4 mb-6 border border-red-500/20">
            <p className="text-sm text-red-200 font-medium mb-1">Sign-in failed</p>
            <p className="text-xs text-surface-200/70">
              {error === "AccessDenied"
                ? "We couldn't finish signing you in. If this keeps happening, double-check your MongoDB (MONGODB_URI) credentials and restart the dev server."
                : `Error: ${error}`}
            </p>
          </div>
        ) : null}

        {/* Features preview */}
        <div className="glass-card p-5 mb-8">
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "📝", label: "Daily 20 Questions" },
              { icon: "📊", label: "Performance Tracking" },
              { icon: "🔥", label: "Streak System" },
              { icon: "🏆", label: "Leaderboards" },
            ].map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-2 p-2 rounded-lg bg-white/5"
              >
                <span className="text-lg">{feature.icon}</span>
                <span className="text-xs text-surface-200 font-medium">
                  {feature.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sign in button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          id="google-sign-in-btn"
          className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-white text-surface-900 font-semibold text-base transition-all hover:bg-surface-100 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/20"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-surface-300 border-t-surface-800 rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          {isLoading ? "Signing in..." : "Continue with Google"}
        </button>

        <p className="text-center text-xs text-surface-200/40 mt-6">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh flex items-center justify-center px-6">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </main>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
