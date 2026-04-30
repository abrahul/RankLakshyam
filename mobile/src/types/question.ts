export interface QuestionOption {
  key: string;
  en: string;
  ml: string;
}

export interface Question {
  _id: string;
  text: { en: string; ml: string };
  options: QuestionOption[];
  topicId: string;
  difficulty: number;
  correctOption?: string;
  explanation?: { en: string; ml: string };
}

export interface AttemptResult {
  isCorrect: boolean;
  correctOption: string;
  explanation: { en: string; ml: string };
  isComplete: boolean;
  skipped?: boolean;
  progress: {
    current: number;
    total: number;
    correctCount: number;
    wrongCount: number;
    skippedCount: number;
    attemptedCount: number;
  };
  xp?: {
    totalXP: number;
    baseXP: number;
    correctBonus: number;
    speedBonus: number;
    perfectBonus: number;
    streakBonus: number;
  };
  streak?: { currentStreak: number; longestStreak: number };
  gamification?: {
    newBadges?: Array<{ id: string; name: string; icon: string; rarity: string }>;
    milestone?: { title: string; badgeIcon: string; bonusXP: number; celebration: string };
    rankUp?: { from: any; to: any };
  };
}
