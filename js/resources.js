/**
 * js/resources.js
 * SEO Foundation and Parent Resource Content Architecture.
 *
 * Provides a clean, extensible registry and schema generator for parent-facing
 * educational guides and resource pages.
 *
 * Prepares reusable structures for:
 *   - /abacus-practice-for-kids
 *   - /abacus-practice-at-home
 *   - /mental-math-for-kids
 *   - /mental-math-games-for-kids
 *   - /abacus-worksheets
 *   - /abacus-speed-test
 *   - /mental-math-test
 *   - /10-minute-math-practice
 *   - /abacus-for-beginners
 */

export const RESOURCE_REGISTRY = Object.freeze([
  {
    slug: 'abacus-practice-for-kids',
    title: 'Abacus Practice for Kids — Fun Daily Calculations',
    description: 'Practical, step-by-step guidance for introducing children aged 5–10 to bead calculation and mental math routines.',
    category: 'Guides',
    readingTimeMinutes: 4,
    targetAudience: 'Parents of children aged 5–10',
    primaryCta: 'Try the Free Challenge',
    primaryCtaHref: '#/challenge',
  },
  {
    slug: 'abacus-practice-at-home',
    title: 'How to Build an Abacus Practice Routine at Home',
    description: 'Easy strategies to establish a calm 10-minute daily abacus routine at home without frustration or pressure.',
    category: 'Routines',
    readingTimeMinutes: 5,
    targetAudience: 'Parents & Home Educators',
    primaryCta: 'Start Free Practice',
    primaryCtaHref: '#/challenge',
  },
  {
    slug: 'mental-math-for-kids',
    title: 'Mental Math for Kids: From Physical Beads to Visual Mind Math',
    description: 'How children transition from sliding physical beads to projecting mental beads for rapid, confident arithmetic.',
    category: 'Methodology',
    readingTimeMinutes: 5,
    targetAudience: 'Parents & Teachers',
    primaryCta: 'Try Mental Math Challenge',
    primaryCtaHref: '#/challenge',
  },
  {
    slug: 'mental-math-games-for-kids',
    title: 'Top Mental Math Games That Make Calculation Enjoyable',
    description: 'Discover how game mechanics like bead racing and memory matching transform calculation drills into active play.',
    category: 'Games',
    readingTimeMinutes: 4,
    targetAudience: 'Parents of kids 5–10',
    primaryCta: 'Explore Bead Games',
    primaryCtaHref: '#/starter',
  },
  {
    slug: 'abacus-worksheets',
    title: 'Free Printable Abacus Practice Worksheets for Beginners',
    description: 'Curated bead representation exercises and single-digit addition sheets for supplementary offline practice.',
    category: 'Worksheets',
    readingTimeMinutes: 3,
    targetAudience: 'Parents & Educators',
    primaryCta: 'Try Interactive Challenge',
    primaryCtaHref: '#/challenge',
  },
  {
    slug: 'abacus-speed-test',
    title: 'Abacus Speed Test — Check Calculation Fluency',
    description: 'Interactive speed benchmarking for young learners to measure accuracy and bead manipulation agility.',
    category: 'Assessments',
    readingTimeMinutes: 2,
    targetAudience: 'Kids 5–10 & Parents',
    primaryCta: 'Take the Test',
    primaryCtaHref: '#/challenge',
  },
  {
    slug: 'mental-math-test',
    title: 'Kids Mental Math Benchmark Test (10 Questions)',
    description: 'A friendly 10-question evaluation assessing bead visualization and calculation confidence.',
    category: 'Assessments',
    readingTimeMinutes: 3,
    targetAudience: 'Parents',
    primaryCta: 'Start 10-Question Test',
    primaryCtaHref: '#/challenge',
  },
  {
    slug: '10-minute-math-practice',
    title: 'Why 10 Minutes of Daily Math Practice Beats Weekend Cramming',
    description: 'The cognitive benefits of short, consistent daily practice in developing long-term mathematical intuition.',
    category: 'Habits',
    readingTimeMinutes: 4,
    targetAudience: 'Parents',
    primaryCta: 'Build the Habit Today',
    primaryCtaHref: '#/challenge',
  },
  {
    slug: 'abacus-for-beginners',
    title: 'Abacus for Beginners: A Parent\'s Complete Starter Guide',
    description: 'Learn the basic components of the soroban abacus: the beam, upper deck, lower deck, and bead values.',
    category: 'Beginners',
    readingTimeMinutes: 6,
    targetAudience: 'Beginner Parents & Kids',
    primaryCta: 'Start with Level 1 Free',
    primaryCtaHref: '#/challenge',
  },
]);

/**
 * Find resource metadata by slug.
 * @param {string} slug
 * @returns {Object|null}
 */
export function getResourceBySlug(slug) {
  const clean = String(slug || '').replace(/^\/+/, '').replace(/\/+$/, '');
  return RESOURCE_REGISTRY.find(r => r.slug === clean) || null;
}

/**
 * Generates JSON-LD schema for SEO structured data.
 * @param {Object} resource
 * @returns {Object}
 */
export function generateResourceSchema(resource) {
  if (!resource) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: resource.title,
    description: resource.description,
    audience: {
      '@type': 'Audience',
      audienceType: resource.targetAudience,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Abacus Buddy',
      logo: 'https://abacus-ai.pages.dev/icons/icon-192.png',
    },
  };
}
