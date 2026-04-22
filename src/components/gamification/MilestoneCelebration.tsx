"use client";

import { useEffect, useRef } from "react";

interface MilestoneCelebrationProps {
  type: "toast" | "confetti" | "fullscreen";
  title: string;
  badgeIcon?: string;
  bonusXP?: number;
  onDismiss?: () => void;
  onClose?: () => void; // alias
}

export default function MilestoneCelebration({
  type,
  title,
  badgeIcon,
  bonusXP,
  onDismiss,
  onClose,
}: MilestoneCelebrationProps) {
  const dismiss = onDismiss ?? onClose ?? (() => {});

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Auto-dismiss toast after 3s
  useEffect(() => {
    if (type === "toast") {
      const timer = setTimeout(dismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [type, dismiss]);

  // Confetti animation
  useEffect(() => {
    if (type !== "confetti" && type !== "fullscreen") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces: {
      x: number; y: number; r: number; d: number;
      color: string; tilt: number; tiltAngle: number; tiltAngleInc: number;
    }[] = [];

    const colors = ["#6366f1", "#818cf8", "#a5b4fc", "#f472b6", "#fbbf24", "#34d399", "#22d3ee"];
    const count = 120;

    for (let i = 0; i < count; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 8 + 4,
        d: Math.random() * count,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngle: 0,
        tiltAngleInc: Math.random() * 0.07 + 0.05,
      });
    }

    let angle = 0;
    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += 0.01;

      pieces.forEach((p) => {
        p.tiltAngle += p.tiltAngleInc;
        p.y += (Math.cos(angle + p.d) + 2) * 1.5;
        p.x += Math.sin(angle) * 0.8;
        p.tilt = Math.sin(p.tiltAngle) * 12;

        ctx.beginPath();
        ctx.lineWidth = p.r / 2;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
        ctx.stroke();
      });

      animId = requestAnimationFrame(draw);
    };

    draw();
    const stopTimer = setTimeout(() => cancelAnimationFrame(animId), 4000);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(stopTimer);
    };
  }, [type]);

  if (type === "toast") {
    return (
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-slide-up"
        style={{ maxWidth: "340px", width: "calc(100% - 32px)" }}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{
            background: "rgba(99, 102, 241, 0.95)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 32px rgba(99, 102, 241, 0.4)",
          }}
        >
          <span className="text-2xl">{badgeIcon || "🎉"}</span>
          <p className="text-sm font-semibold text-white flex-1">{title}</p>
          {bonusXP ? (
            <span className="text-xs font-bold text-white/80">+{bonusXP} XP</span>
          ) : null}
        </div>
      </div>
    );
  }

  // confetti + fullscreen modal
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Dark backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(2, 6, 23, 0.85)", backdropFilter: "blur(4px)" }}
        onClick={dismiss}
      />

      {/* Modal */}
      <div
        className="relative z-10 text-center px-8 py-10 rounded-3xl animate-slide-up"
        style={{
          background: "rgba(15, 23, 42, 0.95)",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          boxShadow: "0 24px 64px rgba(99, 102, 241, 0.3)",
          maxWidth: "320px",
          width: "90%",
        }}
      >
        {/* Badge icon with glow */}
        <div className="relative inline-block mb-4">
          <span
            className="text-6xl block"
            style={{
              filter: "drop-shadow(0 0 20px rgba(251, 191, 36, 0.6))",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            {badgeIcon || "🏆"}
          </span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2 font-[family-name:var(--font-display)]">
          {title}
        </h2>

        {bonusXP ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{ background: "rgba(99, 102, 241, 0.2)", border: "1px solid rgba(99, 102, 241, 0.4)" }}>
            <span className="text-sm font-bold text-primary-300">⚡ +{bonusXP} Bonus XP</span>
          </div>
        ) : <div className="mb-6" />}

        <button
          onClick={dismiss}
          className="w-full py-3 rounded-2xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-all"
        >
          Awesome! 🎉
        </button>
      </div>
    </div>
  );
}
