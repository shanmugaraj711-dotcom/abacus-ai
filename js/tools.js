/**
 * js/tools.js
 * Free Tool Architecture and Extension Points.
 *
 * Defines the public tool registry for parent/student free utilities:
 *   - mental-math-challenge (Active: 10-question mental-math evaluation)
 *   - abacus-speed-test (Extension Point)
 *   - daily-10-minute-practice (Extension Point)
 *   - worksheet-generator (Extension Point)
 *   - kids-calculation-test (Extension Point)
 *   - practice-level-finder (Extension Point)
 */

export const FREE_TOOLS = Object.freeze([
  {
    id: 'mental-math-challenge',
    title: 'Free Mental Math Challenge',
    badge: '10 Questions',
    description: 'A 10-question benchmark to assess calculation speed, bead visualization readiness, and numerical confidence.',
    status: 'active',
    route: '#/challenge',
    primaryCta: 'Start Challenge',
  },
  {
    id: 'abacus-speed-test',
    title: 'Abacus Speed Test',
    badge: '60 Seconds',
    description: 'Quick 60-second bead manipulation speed check to evaluate finger agility and counting fluency.',
    status: 'planned',
    route: '#/challenge',
    primaryCta: 'Coming Soon',
  },
  {
    id: 'daily-10-minute-practice',
    title: 'Daily 10-Minute Practice Plan',
    badge: 'Daily Habit',
    description: 'Structured 10-minute workout combining bead counting, direct addition, and visual mental arithmetic.',
    status: 'planned',
    route: '#/starter',
    primaryCta: 'Explore Routine',
  },
  {
    id: 'worksheet-generator',
    title: 'Worksheet Generator',
    badge: 'Printable PDF',
    description: 'Customizable abacus worksheets for offline handwriting and visual bead practice.',
    status: 'planned',
    route: '#/starter',
    primaryCta: 'Coming Soon',
  },
  {
    id: 'kids-calculation-test',
    title: 'Kids Calculation Diagnostic',
    badge: 'Diagnostic',
    description: 'Pinpoints specific arithmetic friction points (direct addition, 5-complements, or 10-complements).',
    status: 'planned',
    route: '#/challenge',
    primaryCta: 'Coming Soon',
  },
  {
    id: 'practice-level-finder',
    title: 'Practice Level Finder',
    badge: 'Skill Match',
    description: 'Determines the ideal starting level (1 to 15) based on current grade and calculation comfort.',
    status: 'planned',
    route: '#/starter',
    primaryCta: 'Coming Soon',
  },
]);

/**
 * Returns all active free tools.
 * @returns {Array<Object>}
 */
export function getActiveTools() {
  return FREE_TOOLS.filter(t => t.status === 'active');
}

/**
 * Returns a tool definition by ID.
 * @param {string} toolId
 * @returns {Object|null}
 */
export function getToolById(toolId) {
  return FREE_TOOLS.find(t => t.id === toolId) || null;
}
