/**
 * js/events.js
 * Lightweight, privacy-conscious funnel event tracking layer for Abacus Buddy.
 *
 * Funnel Events:
 *   - landing_view
 *   - challenge_start
 *   - challenge_complete
 *   - signup
 *   - checkout_start
 *   - payment_success
 *
 * Privacy & Security Guarantees:
 *   - Uses pseudonymous visitorId from store.js (no fingerprinting, IP, or location)
 *   - Attaches canonical Firebase UID only when user is authenticated
 *   - Never sends secrets, passwords, or payment card details
 *   - In-memory & sessionStorage event history for client observability & regression testing
 *   - Network calls fail completely silently without impacting UX
 */

import { getVisitorId } from './store.js';

export const FUNNEL_EVENTS = Object.freeze({
  LANDING_VIEW: 'landing_view',
  CHALLENGE_START: 'challenge_start',
  CHALLENGE_COMPLETE: 'challenge_complete',
  SIGNUP: 'signup',
  CHECKOUT_START: 'checkout_start',
  PAYMENT_SUCCESS: 'payment_success',
});

const STORAGE_KEY = 'abacus-funnel-events';
const inMemoryEvents = [];

/**
 * Returns read-only copy of recent funnel events recorded in this session.
 * @returns {Array<Object>}
 */
export function getRecentFunnelEvents() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [...inMemoryEvents];
}

/**
 * Clear in-memory and session funnel events (useful in tests).
 */
export function clearFunnelEvents() {
  inMemoryEvents.length = 0;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Records a privacy-conscious funnel event.
 *
 * @param {string} eventName
 * @param {Object} [meta={}]
 * @returns {Object} The recorded event object
 */
export function trackFunnelEvent(eventName, meta = {}) {
  const allowed = Object.values(FUNNEL_EVENTS);
  if (!allowed.includes(eventName)) {
    console.warn(`[Funnel] Unrecognized event name: "${eventName}"`);
  }

  const visitorId = getVisitorId();
  let uid = null;
  if (typeof window !== 'undefined') {
    if (window.__mockUser?.uid) uid = window.__mockUser.uid;
    else if (window._abacusAuthUid) uid = window._abacusAuthUid;
  }

  const safeMeta = {};
  if (meta && typeof meta === 'object') {
    for (const [k, v] of Object.entries(meta)) {
      // Exclude sensitive keys (passwords, auth tokens, secrets)
      if (/password|secret|credential|token|private_key/i.test(k)) continue;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        safeMeta[k] = v;
      }
    }
  }

  const eventPayload = {
    event: eventName,
    visitorId,
    uid: uid ? String(uid) : null,
    timestamp: new Date().toISOString(),
    meta: safeMeta,
  };

  inMemoryEvents.push(eventPayload);
  if (typeof window !== 'undefined') {
    window.__funnelEvents = inMemoryEvents;
  }

  try {
    const list = getRecentFunnelEvents();
    list.push(eventPayload);
    // Keep max 50 events in session
    const trimmed = list.slice(-50);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}

  // Non-blocking network ping (fail-silent)
  try {
    if (typeof fetch === 'function' && typeof location !== 'undefined' && location.protocol.startsWith('http')) {
      fetch('/api/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          ...(uid ? { uid: String(uid) } : {}),
          lastEvent: eventName,
        }),
      }).catch(() => {});
    }
  } catch {}

  return eventPayload;
}
