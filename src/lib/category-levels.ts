export const LEGACY_LEVEL_KEYS = ["10th_level", "plus2_level", "degree_level", "other_exams"] as const;
export type LegacyLevelKey = (typeof LEGACY_LEVEL_KEYS)[number];

type CategoryLike = {
  slug?: string | null;
  name?: { en?: string | null; ml?: string | null } | null;
};

const LEGACY_LEVEL_ALIASES: Record<LegacyLevelKey, string[]> = {
  "10th_level": ["10th_level", "10th level", "sslc", "10th"],
  "plus2_level": ["plus2_level", "plus 2 level", "12th_level", "12th level", "plus two", "plus2"],
  "degree_level": ["degree_level", "degree level", "degree"],
  "other_exams": ["other_exams", "other exams", "others", "other"],
};

export function normalizeCategoryKey(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function isLegacyLevelKey(value: unknown): value is LegacyLevelKey {
  return typeof value === "string" && (LEGACY_LEVEL_KEYS as readonly string[]).includes(value);
}

export function categoryMatchesInput(category: CategoryLike | null | undefined, input: unknown) {
  const needle = normalizeCategoryKey(input);
  if (!needle) return false;

  return [category?.slug, category?.name?.en, category?.name?.ml]
    .map((value) => normalizeCategoryKey(value))
    .some((value) => value === needle);
}

export function categoryMatchesLegacyLevel(category: CategoryLike | null | undefined, level: LegacyLevelKey) {
  return LEGACY_LEVEL_ALIASES[level].some((alias) => categoryMatchesInput(category, alias));
}
