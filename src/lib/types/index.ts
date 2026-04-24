export type ExamType = "10th Level" | "12th Level" | "Degree" | "Others";
export type Language = "en" | "ml" | "both";
export type SessionType = "daily" | "topic" | "pyq" | "custom" | "weak_area";
export type SessionStatus = "in_progress" | "completed" | "abandoned";
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type OptionKey = "A" | "B" | "C" | "D";

export interface BilingualText {
  en: string;
  ml: string;
}

export interface QuestionOption {
  key: OptionKey;
  en: string;
  ml: string;
}

export interface TopicAccuracy {
  attempted: number;
  correct: number;
  accuracy: number;
}

export interface UserStats {
  totalAttempted: number;
  totalCorrect: number;
  accuracy: number;
  avgTimePerQuestion: number;
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  topicAccuracy: Record<string, TopicAccuracy>;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  image?: string;
  score: number;
  streak?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    statusCode: number;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface DailyResult {
  score: number;
  total: number;
  accuracy: number;
  avgTime: number;
  xpEarned: number;
  streak: number;
  rank?: number;
  topicBreakdown: Array<{
    topicId: string;
    topicName: string;
    correct: number;
    total: number;
  }>;
}
