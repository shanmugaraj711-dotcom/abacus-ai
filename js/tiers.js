/**
 * js/tiers.js
 * Centralized commercial tier definitions and access predicates for Abacus Buddy.
 *
 * Tiers:
 *   - Free: Practice Level 1 only, Learn Lessons 1–6, Game: race (1 game), Free Play locked
 *   - Starter: ₹99, 30 days, Practice Levels 1–3, Learn Lessons 1–7, Games: race, mystery, match (3 games), Free Play unlocked
 *   - Lifetime: ₹499, lifetime, Practice Levels 1–15, Learn Lessons 1–11, all 7 games, Free Play unlocked
 */

export const TIERS = Object.freeze({
  FREE: 'free',
  STARTER: 'starter',
  LIFETIME: 'lifetime',
});

export const ALL_GAMES = Object.freeze([
  'race',
  'mystery',
  'match',
  'flash',
  'speedRead',
  'friendDash',
  'ladder',
]);

export const TIER_CONFIG = Object.freeze({
  free: Object.freeze({
    id: 'free',
    name: 'Free',
    price: 0,
    pricePaise: 0,
    maxLevel: 1,
    maxLesson: 6,
    games: Object.freeze(['race']),
    freePlay: false,
    durationDays: null,
  }),
  starter: Object.freeze({
    id: 'starter',
    name: 'Starter',
    price: 99,
    pricePaise: 9900,
    maxLevel: 3,
    maxLesson: 7,
    games: Object.freeze(['race', 'mystery', 'match']),
    freePlay: true,
    durationDays: 30,
  }),
  lifetime: Object.freeze({
    id: 'lifetime',
    name: 'Lifetime',
    nameFull: 'Lifetime Family Plan',
    price: 499,
    pricePaise: 49900,
    maxLevel: 15,
    maxLesson: 11,
    games: ALL_GAMES,
    freePlay: true,
    durationDays: null,
  }),
});

/**
 * Resolves entitlement data into an active tier configuration.
 * Handles backward compatibility for existing paying customers who have paid=true
 * without an explicit tier field.
 *
 * @param {Object|null} entitlement
 * @returns {typeof TIER_CONFIG['free'|'starter'|'lifetime']}
 */
export function resolveTier(entitlement) {
  if (!entitlement || entitlement.paid !== true) {
    return TIER_CONFIG.free;
  }

  const tierId = String(entitlement.tier || '').toLowerCase();

  if (tierId === TIERS.STARTER) {
    if (entitlement.expiresAt) {
      const expTime = new Date(entitlement.expiresAt).getTime();
      if (!Number.isNaN(expTime) && Date.now() > expTime) {
        return TIER_CONFIG.free; // Expired starter tier drops back to free
      }
    }
    return TIER_CONFIG.starter;
  }

  // Any paid entitlement that is not starter is lifetime (including legacy product: "abacus-buddy")
  return TIER_CONFIG.lifetime;
}

/**
 * Predicate to check if a specific practice level can be accessed.
 * @param {number|string} level
 * @param {string|Object} [tierOrEntitlement]
 * @returns {boolean}
 */
export function canAccessLevel(level, tierOrEntitlement) {
  const n = Number(level);
  if (!Number.isFinite(n) || n < 1) return false;
  const tier = typeof tierOrEntitlement === 'object' && tierOrEntitlement !== null
    ? (tierOrEntitlement.maxLevel !== undefined ? tierOrEntitlement : resolveTier(tierOrEntitlement))
    : (TIER_CONFIG[tierOrEntitlement] || TIER_CONFIG.free);
  return n <= tier.maxLevel;
}

/**
 * Predicate to check if a specific lesson can be accessed.
 * @param {number|string} lessonId
 * @param {string|Object} [tierOrEntitlement]
 * @returns {boolean}
 */
export function canAccessLesson(lessonId, tierOrEntitlement) {
  const n = Number(lessonId);
  if (!Number.isFinite(n) || n < 1) return false;
  const tier = typeof tierOrEntitlement === 'object' && tierOrEntitlement !== null
    ? (tierOrEntitlement.maxLesson !== undefined ? tierOrEntitlement : resolveTier(tierOrEntitlement))
    : (TIER_CONFIG[tierOrEntitlement] || TIER_CONFIG.free);
  return n <= tier.maxLesson;
}

/**
 * Predicate to check if a specific game can be accessed.
 * @param {string} gameId
 * @param {string|Object} [tierOrEntitlement]
 * @returns {boolean}
 */
export function canAccessGame(gameId, tierOrEntitlement) {
  if (!gameId) return false;
  const tier = typeof tierOrEntitlement === 'object' && tierOrEntitlement !== null
    ? (tierOrEntitlement.games !== undefined ? tierOrEntitlement : resolveTier(tierOrEntitlement))
    : (TIER_CONFIG[tierOrEntitlement] || TIER_CONFIG.free);
  return tier.games.includes(String(gameId));
}

/**
 * Predicate to check if Free Play is unlocked.
 * @param {string|Object} [tierOrEntitlement]
 * @returns {boolean}
 */
export function canAccessFreePlay(tierOrEntitlement) {
  const tier = typeof tierOrEntitlement === 'object' && tierOrEntitlement !== null
    ? (tierOrEntitlement.freePlay !== undefined ? tierOrEntitlement : resolveTier(tierOrEntitlement))
    : (TIER_CONFIG[tierOrEntitlement] || TIER_CONFIG.free);
  return tier.freePlay === true;
}

/**
 * Helper to get game limit count for a tier.
 * @param {string|Object} [tierOrEntitlement]
 * @returns {number}
 */
export function getGameLimit(tierOrEntitlement) {
  const tier = typeof tierOrEntitlement === 'object' && tierOrEntitlement !== null
    ? (tierOrEntitlement.games !== undefined ? tierOrEntitlement : resolveTier(tierOrEntitlement))
    : (TIER_CONFIG[tierOrEntitlement] || TIER_CONFIG.free);
  return tier.games.length;
}
