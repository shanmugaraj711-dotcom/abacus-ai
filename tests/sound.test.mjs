import assert from 'node:assert/strict';
import { tamilNumberWord } from '../js/sound.js';

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
