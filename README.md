# Abacus Buddy 🧮 (Abacus AI for Kids — v3 rebuild)

Learn the soroban abacus with **Babi**. Offline PWA, no accounts, no ads, for kids 5–10.

## What a child can do
- **Learn** – 11 short lessons (2–3 min each): parts of the abacus → 1–4 → the 5 bead → 6–9 → tens rod → easy adding / take away → Little Friends (make 5) → Big Friends (make 10). Every lesson mixes *watch Babi*, *build it*, *read it* and *solve it*.
- **Practise** – 12 levels, 8 sums each, built with beads (no typing). Wrong answer → gentle message → clue → Babi demonstrates the exact finger moves, then the child tries again. 1–3 stars; 1 star opens the next level.
- **Play** – Bead Race (60 s, auto-checks when beads are right), Mystery Number (read the beads), Bead Match (memory).
- **Free Play** – move any bead, Babi says the number (2 or 3 rods).
- **Beads** – tap a bead, or swipe it up/down like a real abacus.
- **Sticker Book** – 12 stickers earned for lessons, stars, games and playing on different days.
- **Grown-ups corner** (maths gate) – lessons, level, first-try accuracy, minutes, 7-day activity, accuracy per trick, recent mix-ups, a practical tip, settings, reset.
- Kids who already know abacus take a 6-sum **Quick Check** and skip ahead.

## Run
```bash
python3 -m http.server 8080   # then open http://localhost:8080
node tests/engine.test.mjs    # engine tests (maths for every sum 0–99)
# Full robot playthrough (needs: npm i playwright, server running on :8765)
node tests/full-playthrough.mjs
```

## Files (7 modules instead of ~60 patch files)
| File | Job |
|---|---|
| `js/engine.js` | Pure maths: abacus state, real soroban move planner (direct / Little Friends / Big Friends), level problem pools, stars |
| `js/abacusView.js` | Interactive abacus, updated in place (fast on cheap phones) |
| `js/lessons.js` | Lesson content |
| `js/app.js` | Screens + hash router (Android back button works) |
| `js/store.js` | One saved object, safe reads/writes, migrates old profile name |
| `js/sound.js` | WebAudio effects + Babi voice (English, Tamil cheers) |
| `js/babi.js` | Babi mascot SVG |
| `sw.js` | Offline support (network-first) |

## Main problems fixed from the old version
- ~60 overlapping "fix"/"phase"/"QA" scripts fighting over the same screens (`masterBeadFix`, `masterBeadFixV2`, `interactionFix`, `learnNextLessonFix`…) → replaced by one clear app.
- Service worker was **cache-first** with hand-bumped versions → kids stayed stuck on old buggy builds. Now network-first with offline fallback.
- Back buttons used `location.reload()` → real navigation via URL hash; timers and Babi's speech stop when leaving a screen (the race timer used to keep running).
- Engine rule bugs: e.g. `5 − 5` was labelled "small friend"; levels could silently fall back to fixed problems. Now every sum is classified by simulating actual bead moves, and levels pick from complete, tested pools with no repeats.
- "I know abacus" skipped loading the rest of the app; now it runs a real placement check.
- Hints were generic text; now hints are the exact next finger move and Babi can animate the whole solution.
- Full-screen re-render on every bead tap → beads animate in place.
- Parent area and child area mixed; now a gated grown-ups corner.

## Testing done (v3.1)
A robot played the **whole app** at phone (320px, 390px) and tablet (820px) sizes: all 11 lessons, all 12 levels (including wrong answers → clue → Babi demo), Bead Race, Mystery Number, Bead Match, Free Play, Sticker Book, grown-ups corner and reset — no JavaScript errors, no sideways scrolling, progress saved correctly.
Also tested: "I know abacus" quick check, phones with storage blocked (private mode), and a **real offline run** (internet off → app reloads with progress and lessons work).
Still worth doing: 5 minutes on a real low-cost Android phone and an iPhone, and watching 1–2 kids use it.
