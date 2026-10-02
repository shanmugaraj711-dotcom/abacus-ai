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
    games: ["race"],
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
    games: ["race", "mystery", "match"],
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
    games: ALL_GAMES,
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
