// ─── Rank Ladder ──────────────────────────────────────────────────────────────

export interface Rank {
  level: number;
  id: string;
  title: { en: string; ml: string };
  icon: string;
  xpRequired: number;
  color: string;
}

export const RANKS: Rank[] = [
  { level: 1,  id: "beginner",  title: { en: "Beginner",   ml: "തുടക്കക്കാരൻ" }, icon: "🌱", xpRequired: 0,      color: "#94a3b8" },
  { level: 2,  id: "learner",   title: { en: "Learner",    ml: "പഠിതാവ്"     }, icon: "📘", xpRequired: 500,    color: "#60a5fa" },
  { level: 3,  id: "scholar",   title: { en: "Scholar",    ml: "വിദ്യാർത്ഥി"  }, icon: "📖", xpRequired: 1500,   color: "#34d399" },
  { level: 4,  id: "bronze",    title: { en: "Bronze",     ml: "വെങ്കലം"     }, icon: "🥉", xpRequired: 3500,   color: "#cd7f32" },
  { level: 5,  id: "silver",    title: { en: "Silver",     ml: "വെള്ളി"      }, icon: "🥈", xpRequired: 6500,   color: "#c0c0c0" },
  { level: 6,  id: "gold",      title: { en: "Gold",       ml: "സ്വർണ്ണം"    }, icon: "🥇", xpRequired: 12000,  color: "#fbbf24" },
  { level: 7,  id: "platinum",  title: { en: "Platinum",   ml: "പ്ലാറ്റിനം"  }, icon: "💎", xpRequired: 20000,  color: "#818cf8" },
  { level: 8,  id: "diamond",   title: { en: "Diamond",    ml: "വജ്രം"       }, icon: "👑", xpRequired: 35000,  color: "#22d3ee" },
  { level: 9,  id: "master",    title: { en: "Master",     ml: "മാസ്റ്റർ"    }, icon: "🏆", xpRequired: 60000,  color: "#f472b6" },
  { level: 10, id: "psc_ready", title: { en: "PSC Ready",  ml: "PSC റെഡി"    }, icon: "🎓", xpRequired: 100000, color: "#a855f7" },
];

export function getRank(xp: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].xpRequired) return RANKS[i];
  }
  return RANKS[0];
}

export function getNextRank(xp: number): Rank | null {
  const current = getRank(xp);
  const nextIdx = RANKS.findIndex((r) => r.level === current.level) + 1;
  return nextIdx < RANKS.length ? RANKS[nextIdx] : null;
}

export function getRankProgress(xp: number): { current: Rank; next: Rank | null; progress: number; xpToNext: number } {
  const current = getRank(xp);
  const next = getNextRank(xp);
  if (!next) return { current, next: null, progress: 100, xpToNext: 0 };

  const xpInLevel = xp - current.xpRequired;
  const xpForLevel = next.xpRequired - current.xpRequired;
  const progress = Math.round((xpInLevel / xpForLevel) * 100);

  return { current, next, progress, xpToNext: next.xpRequired - xp };
}

// ─── Badge Definitions ────────────────────────────────────────────────────────

export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "streak" | "learning" | "topic" | "leaderboard" | "special";
  rarity: BadgeRarity;
}

export const BADGES: BadgeDef[] = [
  // 🔥 Streak badges
  { id: "first_step",       name: "First Step",       description: "Start your first streak",             icon: "👣", category: "streak", rarity: "common" },
  { id: "week_warrior",     name: "Week Warrior",     description: "7-day streak",                        icon: "⚔️", category: "streak", rarity: "common" },
  { id: "fortnight_fighter",name: "Fortnight Fighter", description: "14-day streak",                      icon: "🛡️", category: "streak", rarity: "uncommon" },
  { id: "habit_master",     name: "Habit Master",     description: "21-day streak — habit formed!",       icon: "🧠", category: "streak", rarity: "uncommon" },
  { id: "monthly_champion", name: "Monthly Champion", description: "30-day streak",                       icon: "🏆", category: "streak", rarity: "rare" },
  { id: "legend",           name: "Legend",            description: "50-day streak",                       icon: "💎", category: "streak", rarity: "epic" },
  { id: "century_crown",    name: "Century Crown",    description: "100-day streak",                      icon: "👑", category: "streak", rarity: "legendary" },

  // 📚 Learning badges
  { id: "first_blood",      name: "First Blood",      description: "Answer your first question correctly", icon: "🩸", category: "learning", rarity: "common" },
  { id: "half_century",     name: "Half Century",     description: "Attempt 50 questions",                icon: "5️⃣", category: "learning", rarity: "common" },
  { id: "century_maker",    name: "Century Maker",    description: "100 correct answers",                 icon: "💯", category: "learning", rarity: "uncommon" },
  { id: "five_hundred",     name: "500 Club",         description: "500 correct answers",                 icon: "🎯", category: "learning", rarity: "rare" },
  { id: "thousand_strong",  name: "Thousand Strong",  description: "1,000 correct answers",               icon: "🏋️", category: "learning", rarity: "epic" },
  { id: "speed_demon",      name: "Speed Demon",      description: "Average <8s per question in a daily", icon: "⚡", category: "learning", rarity: "rare" },
  { id: "perfectionist",    name: "Perfectionist",    description: "Score 20/20 on a daily challenge",    icon: "✨", category: "learning", rarity: "rare" },
  { id: "triple_perfect",   name: "Triple Perfect",   description: "20/20 three days in a row",           icon: "🌟", category: "learning", rarity: "legendary" },

  // 📖 Topic mastery badges
  { id: "history_guru",     name: "History Guru",     description: "80%+ accuracy, 100+ questions in History",        icon: "📖", category: "topic", rarity: "rare" },
  { id: "geography_expert", name: "Geography Expert", description: "80%+ accuracy, 100+ questions in Geography",     icon: "🌍", category: "topic", rarity: "rare" },
  { id: "polity_pro",       name: "Polity Pro",       description: "80%+ accuracy, 100+ questions in Polity",        icon: "⚖️", category: "topic", rarity: "rare" },
  { id: "science_whiz",     name: "Science Whiz",     description: "80%+ accuracy, 100+ questions in Science",       icon: "🔬", category: "topic", rarity: "rare" },
  { id: "current_affairs_hawk", name: "CA Hawk",      description: "80%+ accuracy, 100+ questions in Current Affairs", icon: "📰", category: "topic", rarity: "rare" },
  { id: "language_champion",name: "Language Champion", description: "80%+ accuracy, 100+ questions in Language",     icon: "✍️", category: "topic", rarity: "rare" },
  { id: "logic_master",     name: "Logic Master",     description: "80%+ accuracy, 100+ questions in Reasoning",     icon: "🧠", category: "topic", rarity: "rare" },
  { id: "gk_king",          name: "GK King",          description: "80%+ accuracy, 100+ questions in GK",            icon: "💡", category: "topic", rarity: "rare" },

  // 🏆 Leaderboard badges
  { id: "podium_finish",    name: "Podium Finish",    description: "Top 3 in daily leaderboard",          icon: "🥉", category: "leaderboard", rarity: "uncommon" },
  { id: "daily_champion",   name: "Daily Champion",   description: "#1 in daily leaderboard",             icon: "🥇", category: "leaderboard", rarity: "rare" },

  // 🎯 Special badges
  { id: "early_bird",       name: "Early Bird",       description: "Complete daily challenge before 8 AM", icon: "🌅", category: "special", rarity: "common" },
  { id: "night_owl",        name: "Night Owl",        description: "Complete daily challenge after 10 PM",icon: "🦉", category: "special", rarity: "common" },
  { id: "comeback_kid",     name: "Comeback Kid",     description: "Recover a lost streak",               icon: "🔄", category: "special", rarity: "uncommon" },
  { id: "all_rounder",      name: "All-Rounder",      description: "Attempt 50+ questions in every topic",icon: "🎯", category: "special", rarity: "rare" },
  { id: "malayalam_scholar",name: "Malayalam Scholar", description: "Complete 100 questions in Malayalam mode", icon: "🏛️", category: "special", rarity: "uncommon" },
];

export function getBadgeDef(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id);
}

export function getBadgesByCategory(category: BadgeDef["category"]): BadgeDef[] {
  return BADGES.filter((b) => b.category === category);
}

export const RARITY_COLORS: Record<BadgeRarity, string> = {
  common: "#94a3b8",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

// ─── Streak Milestones ────────────────────────────────────────────────────────

export interface StreakMilestone {
  days: number;
  title: string;
  badgeId: string;
  bonusXP: number;
  celebration: "toast" | "confetti" | "fullscreen";
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3,   title: "Great start! 🎉",                  badgeId: "",                 bonusXP: 0,   celebration: "toast" },
  { days: 7,   title: "1 Week Warrior!",                   badgeId: "week_warrior",     bonusXP: 50,  celebration: "confetti" },
  { days: 14,  title: "Two Weeks Strong! 💪",              badgeId: "fortnight_fighter", bonusXP: 100, celebration: "confetti" },
  { days: 21,  title: "21-Day Habit Formed! 🧠",           badgeId: "habit_master",     bonusXP: 150, celebration: "confetti" },
  { days: 30,  title: "One Month Champion! 🏆",            badgeId: "monthly_champion", bonusXP: 200, celebration: "fullscreen" },
  { days: 50,  title: "50-Day Legend! 💎",                  badgeId: "legend",           bonusXP: 300, celebration: "fullscreen" },
  { days: 100, title: "CENTURY! 👑 Top 0.1% of users",     badgeId: "century_crown",    bonusXP: 500, celebration: "fullscreen" },
];

export function getStreakMilestone(days: number): StreakMilestone | undefined {
  return STREAK_MILESTONES.find((m) => m.days === days);
}

// ─── Badge Checker ────────────────────────────────────────────────────────────

export interface BadgeCheckContext {
  totalAttempted: number;
  totalCorrect: number;
  currentStreak: number;
  todayScore?: number;
  avgTimeSec?: number;
  consecutivePerfects?: number;
  topicAccuracy?: Map<string, { attempted: number; correct: number; accuracy: number }>;
  completionHour?: number; // 0-23
  isRecovery?: boolean;
  existingBadges: string[];
}

const TOPIC_BADGE_MAP: Record<string, string> = {
  history: "history_guru",
  geography: "geography_expert",
  polity: "polity_pro",
  science: "science_whiz",
  current_affairs: "current_affairs_hawk",
  language: "language_champion",
  reasoning: "logic_master",
  gk: "gk_king",
};

export function checkNewBadges(ctx: BadgeCheckContext): string[] {
  const newBadges: string[] = [];
  const has = (id: string) => ctx.existingBadges.includes(id);
  const earn = (id: string) => { if (!has(id)) newBadges.push(id); };

  // Streak badges
  if (ctx.currentStreak >= 1)   earn("first_step");
  if (ctx.currentStreak >= 7)   earn("week_warrior");
  if (ctx.currentStreak >= 14)  earn("fortnight_fighter");
  if (ctx.currentStreak >= 21)  earn("habit_master");
  if (ctx.currentStreak >= 30)  earn("monthly_champion");
  if (ctx.currentStreak >= 50)  earn("legend");
  if (ctx.currentStreak >= 100) earn("century_crown");

  // Learning badges
  if (ctx.totalCorrect >= 1)    earn("first_blood");
  if (ctx.totalAttempted >= 50) earn("half_century");
  if (ctx.totalCorrect >= 100)  earn("century_maker");
  if (ctx.totalCorrect >= 500)  earn("five_hundred");
  if (ctx.totalCorrect >= 1000) earn("thousand_strong");

  // Perfect score
  if (ctx.todayScore === 20) earn("perfectionist");
  if ((ctx.consecutivePerfects ?? 0) >= 3) earn("triple_perfect");

  // Speed demon
  if (ctx.todayScore === 20 && (ctx.avgTimeSec ?? 99) < 8) earn("speed_demon");

  // Time-based
  if (ctx.completionHour !== undefined) {
    if (ctx.completionHour < 8) earn("early_bird");
    if (ctx.completionHour >= 22) earn("night_owl");
  }

  // Recovery
  if (ctx.isRecovery) earn("comeback_kid");

  // Topic mastery
  if (ctx.topicAccuracy) {
    for (const [topicId, stats] of ctx.topicAccuracy.entries()) {
      const badgeId = TOPIC_BADGE_MAP[topicId];
      if (badgeId && stats.attempted >= 100 && stats.accuracy >= 80) {
        earn(badgeId);
      }
    }

    // All-rounder
    const allTopics = Object.keys(TOPIC_BADGE_MAP);
    const allHave50 = allTopics.every((t) => {
      const s = ctx.topicAccuracy!.get(t);
      return s && s.attempted >= 50;
    });
    if (allHave50) earn("all_rounder");
  }

  return newBadges;
}
