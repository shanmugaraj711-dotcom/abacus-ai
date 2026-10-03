// Centralized commercial & entitlement tier definitions for Abacus Buddy.
// Single source of truth consumed by server (worker.js) and client (app.js, games.js, payments.js).

export const ALL_GAMES = [
  "race",
  "mystery",
  "match",
  "flash",
  "speed",
  "friend",
  "ladder"
];

export const TIERS = {
  free: {
    id: "free",
    productId: "abacus-buddy",
    name: "Free",
    offerTitle: "Free Practice",
    description: "Level 1 and 1 bead game",
    pricePaise: 0,
    durationDays: null,
    maxLevel: 1,
    maxLesson: 6,
    games: ["race"],
    freePlay: false,
  },
  starter: {
    id: "starter",
    productId: "abacus-buddy",
    name: "Abacus Buddy Starter",
    offerTitle: "Abacus Buddy Starter",
    description: "30 days access to Levels 1–3 and 3 bead games",
    pricePaise: 9900,
    durationDays: 30,
    maxLevel: 3,
    maxLesson: 7,
    games: ["race", "mystery", "match"],
    freePlay: true,
  },
  lifetime: {
    id: "lifetime",
    productId: "abacus-buddy",
    name: "Abacus Buddy Lifetime",
    offerTitle: "Unlock Levels 4–15",
    description: "Lifetime unlock for all levels and all bead games",
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

export function isGameAllowedForTier(gameId, tierConfig) {
  if (!tierConfig || !tierConfig.games) return false;
  return tierConfig.games.includes(gameId);
}

export function isLessonAllowedForTier(lessonId, tierConfig) {
  if (!tierConfig || typeof tierConfig.maxLesson !== 'number') return false;
  return lessonId >= 1 && lessonId <= tierConfig.maxLesson;
}

export function isFreePlayAllowedForTier(tierConfig) {
  return !!(tierConfig && tierConfig.freePlay);
}
