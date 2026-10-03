// Centralized commercial & entitlement tier definitions for Abacus Buddy.
// Single source of truth for tier configs and access rules.

export const ALL_GAMES = [
  "race",
  "mystery",
  "match",
  "flash",
  "speed",
  "friend",
  "ladder"
];

export const STARTER_GAMES = [
  "race",
  "mystery",
  "match",
  "flash"
];

export const TIERS = {
  free: {
    id: "free",
    productId: "abacus-buddy",
    name: "Free",
    offerTitle: "Free Practice",
    description: "Level 1, Lesson 1, and 1 bead game",
    pricePaise: 0,
    durationDays: null,
    maxLevel: 1,
    maxLesson: 1,
    games: ["race"],
    freePlay: false,
  },
  starter: {
    id: "starter",
    productId: "abacus-buddy",
    name: "Abacus Buddy Starter",
    offerTitle: "Abacus Buddy Starter",
    description: "30 days access to Levels 1–6, Lessons 1–6, 4 bead games, and Free Play",
    pricePaise: 9900,
    durationDays: 30,
    maxLevel: 6,
    maxLesson: 6,
    games: STARTER_GAMES,
    freePlay: true,
  },
  lifetime: {
    id: "lifetime",
    productId: "abacus-buddy",
    name: "Abacus Buddy Lifetime",
    offerTitle: "Abacus Buddy Lifetime",
    description: "Lifetime unlock for all levels, all lessons, all bead games, and Free Play",
    pricePaise: 49900,
    durationDays: null,
    maxLevel: 15,
    maxLesson: 11,
    games: ALL_GAMES,
    freePlay: true,
  }
};

export const DEFAULT_TIER = "free";

export function getTierConfig(tierId) {
  if (!tierId || !TIERS[tierId]) return TIERS[DEFAULT_TIER];
  return TIERS[tierId];
}

export function isLevelAllowedForTier(levelId, tierConfig) {
  if (!tierConfig || typeof tierConfig.maxLevel !== 'number') return false;
  return levelId >= 1 && levelId <= tierConfig.maxLevel;
}
export const levelAllowed = isLevelAllowedForTier;

export function isGameAllowedForTier(gameId, tierConfig) {
  if (!tierConfig || !tierConfig.games) return false;
  return tierConfig.games.includes(gameId);
}
export const gameAllowed = isGameAllowedForTier;

export function isLessonAllowedForTier(lessonId, tierConfig) {
  if (!tierConfig || typeof tierConfig.maxLesson !== 'number') return false;
  return lessonId >= 1 && lessonId <= tierConfig.maxLesson;
}
export const lessonAllowed = isLessonAllowedForTier;

export function isFreePlayAllowedForTier(tierConfig) {
  return !!(tierConfig && tierConfig.freePlay);
}
export const freePlayAllowed = isFreePlayAllowedForTier;
