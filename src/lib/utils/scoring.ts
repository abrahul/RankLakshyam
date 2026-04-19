/** XP Calculation for quiz completions */

interface XPInput {
  correctCount: number;
  totalQuestions: number;
  avgTimeSec: number;
  currentStreak: number;
  sessionType: string;
}

interface XPResult {
  baseXP: number;
  correctBonus: number;
  speedBonus: number;
  perfectBonus: number;
  streakBonus: number;
  totalXP: number;
}

export function calculateXP(input: XPInput): XPResult {
  const { correctCount, totalQuestions, avgTimeSec, currentStreak, sessionType } = input;

  // Base XP for completing a session
  const baseXP = sessionType === "daily" ? 50 : 30;

  // Per correct answer
  const correctBonus = correctCount * 5;

  // Speed bonus (< 15 sec per correct answer)
  const speedBonus = avgTimeSec < 15 ? correctCount * 3 : 0;

  // Perfect score bonus
  const perfectBonus = correctCount === totalQuestions ? 50 : 0;

  // Streak milestones
  let streakBonus = 0;
  if (currentStreak === 7) streakBonus = 100;
  else if (currentStreak === 30) streakBonus = 500;
  else if (currentStreak === 100) streakBonus = 2000;
  else if (currentStreak === 365) streakBonus = 10000;

  const totalXP = baseXP + correctBonus + speedBonus + perfectBonus + streakBonus;

  return { baseXP, correctBonus, speedBonus, perfectBonus, streakBonus, totalXP };
}

/** Get today's date string in IST */
export function getTodayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** Get yesterday's date string in IST */
export function getYesterdayIST(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** Get a date N days ago in IST */
export function daysAgoIST(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Round a number to N decimal places */
export function round(num: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

/** Shuffle an array in place (Fisher-Yates) */
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
