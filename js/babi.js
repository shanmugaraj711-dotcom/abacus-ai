// Babi, the wooden-bead buddy. Inline SVG so it works offline and in any host.
const MOUTH = {
  happy: 'M62 98 Q80 116 98 98',
  talk: 'M68 98 Q80 112 92 98 Q80 104 68 98Z',
  think: 'M70 102 Q80 98 90 102',
  wow: 'M80 104 m-7 0 a7 8 0 1 0 14 0 a7 8 0 1 0 -14 0',
};
export function babi(mood = 'happy', cls = '') {
  const cheer = mood === 'cheer';
  const eyes = mood === 'cheer' || mood === 'happy'
    ? '<path d="M55 80 Q62 71 69 80 M91 80 Q98 71 105 80" fill="none" stroke="#2B1B10" stroke-width="5" stroke-linecap="round"/>'
    : '<circle cx="62" cy="79" r="7" fill="#2B1B10"/><circle cx="98" cy="79" r="7" fill="#2B1B10"/><circle cx="64.5" cy="76.5" r="2.2" fill="#fff"/><circle cx="100.5" cy="76.5" r="2.2" fill="#fff"/>';
  const arms = cheer
    ? '<path d="M36 84 Q18 62 16 42 M124 84 Q142 62 144 42" fill="none" stroke="#2B1B10" stroke-width="6" stroke-linecap="round"/><circle cx="16" cy="38" r="6" fill="#FFC53D"/><circle cx="144" cy="38" r="6" fill="#FF6B4A"/>'
    : mood === 'think'
      ? '<path d="M34 94 Q18 104 24 120 M126 92 Q146 82 128 64" fill="none" stroke="#2B1B10" stroke-width="6" stroke-linecap="round"/>'
      : '<path d="M34 94 Q18 104 24 120 M126 94 Q142 104 136 120" fill="none" stroke="#2B1B10" stroke-width="6" stroke-linecap="round"/>';
  const d = MOUTH[mood === 'cheer' ? 'happy' : mood] || MOUTH.happy;
  return `<svg class="babi ${mood} ${cls}" viewBox="0 0 160 160" aria-hidden="true">
    <defs><radialGradient id="bw" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#F3C47C"/><stop offset=".55" stop-color="#D08D3F"/><stop offset="1" stop-color="#8C5226"/></radialGradient></defs>
    <rect x="76" y="6" width="8" height="150" rx="4" fill="#6B3F1D"/>
    <g class="babi-body">
      ${arms}
      <path d="M80 36 C128 36 134 70 134 86 C134 104 124 132 80 132 C36 132 26 104 26 86 C26 70 32 36 80 36Z" fill="url(#bw)" stroke="#6B3F1D" stroke-width="4"/>
      <ellipse cx="50" cy="98" rx="9" ry="6" fill="#FF8F7A" opacity=".55"/><ellipse cx="110" cy="98" rx="9" ry="6" fill="#FF8F7A" opacity=".55"/>
      ${eyes}
      <path d="${d}" fill="${mood === 'talk' || mood === 'wow' ? '#7A2E1E' : 'none'}" stroke="#2B1B10" stroke-width="5" stroke-linecap="round"/>
    </g>
  </svg>`;
}
