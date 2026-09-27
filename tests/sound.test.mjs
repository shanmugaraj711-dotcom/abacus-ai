import assert from 'node:assert/strict';
import { tamilNumberWord, englishNumberWord } from '../js/sound.js';

const cases = new Map([
  [0, 'பூஜ்ஜியம்'],
  [1, 'ஒன்று'],
  [10, 'பத்து'],
  [21, 'இருபத்தி ஒன்று'],
  [30, 'முப்பது'],
  [99, 'தொண்ணூற்றி ஒன்பது'],
  [100, 'நூறு'],
  [101, 'நூற்று ஒன்று'],
  [110, 'நூற்று பத்து'],
  [125, 'நூற்று இருபத்தி ஐந்து'],
  [200, 'இருநூறு'],
  [201, 'இருநூற்று ஒன்று'],
  [300, 'முந்நூறு'],
  [400, 'நானூறு'],
  [500, 'ஐந்நூறு'],
  [600, 'அறுநூறு'],
  [700, 'எழுநூறு'],
  [800, 'எண்ணூறு'],
  [900, 'தொள்ளாயிரம்'],
  [901, 'தொள்ளாயிரத்து ஒன்று'],
  [999, 'தொள்ளாயிரத்து தொண்ணூற்றி ஒன்பது'],
]);

for (const [n, expected] of cases) {
  assert.equal(tamilNumberWord(n), expected, `Tamil number mismatch for ${n}`);
}

// The old implementation spoke 100/200 digit-by-digit. These must now be words.
assert.notEqual(tamilNumberWord(100), 'ஒன்று பூஜ்ஜியம் பூஜ்ஜியம்');
assert.notEqual(tamilNumberWord(200), 'இரண்டு பூஜ்ஜியம் பூஜ்ஜியம்');

console.log(`Tamil number speech tests passed: ${cases.size}/${cases.size}`);

// ── English number speech tests ─────────────────────────────────────────────
const englishCases = new Map([
  [0, 'zero'],
  [1, 'one'],
  [9, 'nine'],
  [10, 'ten'],
  [11, 'eleven'],
  [19, 'nineteen'],
  [20, 'twenty'],
  [21, 'twenty one'],
  [30, 'thirty'],
  [42, 'forty two'],
  [99, 'ninety nine'],
  [100, 'one hundred'],
  [101, 'one hundred one'],
  [110, 'one hundred ten'],
  [125, 'one hundred twenty five'],
  [200, 'two hundred'],
  [201, 'two hundred one'],
  [999, 'nine hundred ninety nine'],
]);

for (const [n, expected] of englishCases) {
  assert.equal(englishNumberWord(n), expected, `English number mismatch for ${n}`);
}

assert.notEqual(englishNumberWord(100), 'one zero zero');
assert.notEqual(englishNumberWord(200), 'two zero zero');

console.log(`English number speech tests passed: ${englishCases.size}/${englishCases.size}`);
