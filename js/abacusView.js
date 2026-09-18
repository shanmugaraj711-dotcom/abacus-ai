// The interactive soroban. Built once, then updated in place (no re-render on every tap = smooth on cheap phones).
import { makeAbacus, valueOf, setValue, tapLower, tapUpper, digitOf } from './engine.js';
import { sfx } from './sound.js';

const PLACE = ['ones', 'tens', 'hundreds'];

export function createAbacus(host, { rods = 2, value = 0, interactive = true, readout = true, digits = true, onChange = null, size = '' } = {}) {
  const ab = makeAbacus(rods, value);
  let locked = !interactive;
  const root = document.createElement('div');
  root.className = `abacus rods-${rods} ${digits ? '' : 'nodigits'} ${size}`;
  root.innerHTML = `
    ${readout ? `<div class="ab-readout" aria-live="polite"><span>Abacus says</span><b data-total>0</b></div>` : ''}
    <div class="ab-frame" role="group" aria-label="Abacus">
      <div class="ab-rods">
        ${Array.from({ length: rods }, (_, k) => {
          const i = rods - 1 - k; // draw tens on the left
          return `<div class="ab-rod" data-rod="${i}">
            ${digits ? `<div class="ab-digit" data-digit>0</div>` : ''}
            <div class="ab-stick"></div>
            <div class="ab-upper">
              <button type="button" class="bead upper" data-rod="${i}" data-upper aria-label="${PLACE[i]} five bead"></button>
            </div>
            <div class="ab-beam"><i></i></div>
            <div class="ab-lower">
              ${[0, 1, 2, 3].map(b => `<button type="button" class="bead lower" style="--i:${b}" data-rod="${i}" data-bead="${b}" aria-label="${PLACE[i]} bead ${b + 1}"></button>`).join('')}
            </div>
            <div class="ab-label">${PLACE[i]}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  host.replaceChildren(root);

  const rodEls = [...root.querySelectorAll('.ab-rod')].reduce((m, el) => (m[+el.dataset.rod] = el, m), {});
  const totalEl = root.querySelector('[data-total]');

  function paint() {
    ab.rods.forEach((rod, i) => {
      const el = rodEls[i];
      el.querySelector('[data-upper]').classList.toggle('on', rod.upper);
      el.querySelectorAll('[data-bead]').forEach(b => {
        const idx = +b.dataset.bead;
        b.classList.toggle('on', idx < rod.lower);
      });
      const dg = el.querySelector('[data-digit]'); if (dg) dg.textContent = digitOf(rod);
    });
    if (totalEl) totalEl.textContent = valueOf(ab);
  }

  function apply(bead, dir) {
    const r = +bead.dataset.rod, rod = ab.rods[r], before = digitOf(rod);
    if (bead.hasAttribute('data-upper')) {
      if (dir === 0) tapUpper(ab, r); else rod.upper = dir > 0; // swipe down = bring 5 bead to the bar
    } else {
      const i = +bead.dataset.bead;
      if (dir === 0) tapLower(ab, r, i);
      else if (dir < 0) rod.lower = Math.max(rod.lower, i + 1); // swipe up = push beads to the bar
      else rod.lower = Math.min(rod.lower, i);                  // swipe down = pull beads away
    }
    if (digitOf(rod) === before) return;
    sfx.bead(); paint(); onChange?.(valueOf(ab));
  }
  // Tap a bead to toggle it, or swipe it up/down like a real abacus.
  let start = null;
  root.addEventListener('pointerdown', e => {
    const bead = e.target.closest('.bead');
    if (!bead || locked || (e.pointerType === 'mouse' && e.button !== 0)) return;
    start = { bead, y: e.clientY, id: e.pointerId };
    try { bead.setPointerCapture(e.pointerId); } catch {}
  });
  root.addEventListener('pointerup', e => {
    if (!start || e.pointerId !== start.id) return;
    const { bead, y } = start; start = null;
    if (locked) return;
    const dy = e.clientY - y;
    apply(bead, Math.abs(dy) < 14 ? 0 : Math.sign(dy));
  });
  root.addEventListener('pointercancel', () => { start = null; });
  // Keyboard (Enter/Space on a focused bead) still works.
  root.addEventListener('click', e => { const bead = e.target.closest('.bead'); if (bead && e.detail === 0 && !locked) apply(bead, 0); });

  paint();

  return {
    el: root,
    get value() { return valueOf(ab); },
    set(v) { setValue(ab, v); paint(); },
    lock(on = true) { locked = on; root.classList.toggle('locked', on); },
    highlight(rodIndex) { Object.entries(rodEls).forEach(([i, el]) => el.classList.toggle('glow', rodIndex != null && +i === rodIndex)); },
    showParts(on) { root.classList.toggle('parts', on); },
    shake() { root.classList.remove('shake'); void root.offsetWidth; root.classList.add('shake'); },
    celebrate() { root.classList.remove('yay'); void root.offsetWidth; root.classList.add('yay'); },
  };
}

// Small read-only picture of a number (used on game cards).
export function miniAbacus(value, rods = 2) {
  const ab = makeAbacus(rods, value);
  return `<span class="mini" aria-label="beads showing ${value}">${ab.rods.slice().reverse().map(r =>
    `<span class="mini-rod"><i class="${r.upper ? 'on' : ''}"></i><em></em>${[0, 1, 2, 3].map(k => `<i class="${k < r.lower ? 'on' : ''}"></i>`).join('')}</span>`).join('')}</span>`;
}
