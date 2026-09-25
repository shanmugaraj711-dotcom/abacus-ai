# Abacus Buddy 🧮

Learn the soroban abacus with **Babi**. Works offline, no accounts, no ads. Built for children aged 5–10, with a Master difficulty that challenges grown-ups too.

---

## 1. What a child can do

| Area | What happens |
|---|---|
| **Learn** | 11 short lessons (2–3 minutes each): parts of the abacus → 1–4 → the 5 bead → 6–9 → the tens rod → easy adding and take away → Little Friends (make 5) → Big Friends (make 10). Each lesson mixes *watch Babi*, *build it*, *read it* and *solve it*. |
| **Practise** | 12 levels, 8 sums each, answered by moving beads (no typing). Wrong answer → gentle message → clue → Babi shows the exact finger moves → try again. 1–3 stars; 1 star opens the next level. |
| **Play** | 7 games, each with **Kid / Star / Master** difficulty (see below). |
| **Tests** | A timed test after each level passed, plus Grand Exam, Mental Maths Exam and a Competition round. A pass earns a printable certificate. |
| **Free Play** | Move any bead on 2 or 3 rods; Babi says the number. |
| **Stickers** | 12 stickers earned for lessons, stars, games, tests and playing on different days. |
| **Grown-ups corner** | Behind a simple maths question: lessons done, current level, first-try accuracy, minutes practised, 7-day activity, accuracy per trick, exam results, recent mix-ups, a practical tip, settings and reset. |
| **Owner console** | Your private screen for switching features on and off (section 4). |

A child who already knows abacus takes a 6-sum **Quick Check** at the start and skips ahead to the right level.

### The 7 games

| Game | Skill it trains |
|---|---|
| 🏁 **Bead Race** | Speed. 60 seconds; a sum counts the moment the beads are right. |
| 🔍 **Mystery Number** | Reading beads as numbers. |
| 🃏 **Bead Match** | Memory, matching numbers to bead pictures. |
| ⚡ **Flash Maths** | Mental maths (anzan) — numbers flash, add them in your head. |
| 👀 **Blink Beads** | The abacus appears for a moment; what was the number? |
| 🤝 **Friend Dash** | Complements: complete 5, 10 or 100 against the clock. |
| 🪜 **Bead Ladder** | Endless climb, 3 lives, harder every 3 rungs. |

### Tests, exams, certificates

- **Level test** — 20 questions, 5 minutes, pass 80% (all changeable in the owner console).
- **Grand Exam** — 30 questions across everything passed, 8 minutes, pass 75%. Opens after 4 levels.
- **Mental Maths Exam** — no abacus on screen. Opens after 2 levels.
- **Competition** — 25-question speed round against your own best. Opens after 3 levels.
- Test rules differ from practice on purpose: a clock, one answer per question, **no hints and no retries**.
- A pass produces a certificate with the child's name, score, date and your centre's name. The print box offers "Save as PDF".

---

## 2. Run it and put it online

```bash
# run locally
python3 -m http.server 8080     # then open http://localhost:8080

# tests
node tests/engine.test.mjs      # the maths, every sum 0–99 (no extra software needed)
node tests/full-playthrough.mjs # robot plays lessons, levels, games (needs: npm i playwright, server on :8765)
node tests/new-features.mjs     # games, tests, exams, certificates, owner console
```

**To publish:** upload the whole folder to any static host (Cloudflare Pages, Vercel, Netlify, GitHub Pages). No server, no database, no build step.

**Offline:** after the first visit over `https://`, the app saves itself on the phone and then works with no internet — lessons, practice, games and saved progress. Children can add it to their home screen. It does not work offline when opened as a file from a computer; it needs a real web address.

---

## 3. Languages

- English or Tamil, chosen at the start and changeable in settings.
- Babi's lessons, hints, bead instructions and cheers follow the choice. Buttons and titles stay in English.
- **Every word Babi says is in one file: `js/i18n.js`**, English and Tamil side by side. The screen text and the spoken line come from the same entry, so they can never disagree. Anyone can edit the wording there without touching code.
- If a phone has no Tamil voice installed, Tamil is shown but not spoken. The settings screen says so.

---

## 4. Switching features on and off (owner console)

1. Open `/owner.html` in your browser — for example `https://yoursite.com/owner.html`.
2. Sign in with your owner Google account. Access is restricted to the single owner Firebase UID configured in `OWNER_UID` on the server — there are no PINs and no second admins. The owner console is completely separate on `/owner.html` and is not exposed in the child app.
3. Switch on or off: lessons, practice, play, free play, stickers, tests, exams, certificates, Tamil, and each of the 7 games. Also set test length, pass marks, the app name and your centre name for certificates.
4. Changes can be tested locally or pushed to everyone: tap **Push to remote config** to update all devices live via the Cloudflare Worker, or tap **Copy config.json** to update `config.json` for redeployment.

A paused feature disappears completely for children — no locked icon, no mention, and its direct link stops working.

`config.json` is the only file you ever need to edit to release or pause something. If it is missing or damaged, the app falls back to its built-in defaults and keeps working.

---

## 5. What is inside

| File | Job |
|---|---|
| `index.html`, `css/app.css` | The page and all styling |
| `config.json` | Feature switches and branding for everyone |
| `js/engine.js` | The maths: abacus state, real soroban move planner (direct / Little Friends / Big Friends), level problem pools, stars |
| `js/i18n.js` | **Every word Babi says, English and Tamil — edit text here** |
| `js/lessons.js` | Lesson content |
| `js/abacusView.js` | The interactive abacus, updated in place (fast on cheap phones) |
| `js/ui.js` | Shared screen parts: page shell, Babi's bubble, timers, confetti, demo player |
| `js/app.js` | Screens and the hash router (the Android back button works) |
| `js/games.js` | All 7 games |
| `js/exams.js` | Tests, exams, competition, certificates |
| `js/admin.js` | Owner console (downloaded only when opened, so children never load it) |
| `js/config.js` | Reads `config.json` and your device's own settings |
| `js/store.js` | One saved object, safe reads and writes, migrates the old app's profile name |
| `js/sound.js` | Sound effects and Babi's voice, with repeat protection |
| `js/babi.js` | Babi the mascot (drawn in code, so it works offline) |
| `sw.js` | Offline support (fetches fresh files first, falls back to the saved copy) |
| `tools/build-single-file.py` | Optional: bundles everything into one `.html` file for demos |
| `tests/` | The three test scripts |

Nothing is sent anywhere. All progress is saved on the child's own device.

---

## 6. Problems fixed from the old version

- About 60 overlapping "fix" and "phase" scripts (`masterBeadFix`, `masterBeadFixV2`, `interactionFix`, `learnNextLessonFix`…) fought over the same screens. Replaced by the clear files above.
- The offline code always loaded the saved copy first, so children stayed on old, buggy versions. Now fresh files come first, with the saved copy as the offline fallback.
- Back buttons reloaded the whole page, and the race timer and Babi's voice kept running on other screens.
- Maths bugs: some sums were labelled with the wrong trick (for example 5 − 5 was called a "small friend" sum), and levels could silently fall back to fixed problems. Every sum is now classified by simulating the real bead moves, and every level draws from a complete, tested pool with no repeats.
- "I know abacus" skipped loading most of the app; it now runs a real placement check.
- The whole screen redrew on every bead tap; now only the bead moves.
- Hints were generic text; they are now the exact next finger move, and Babi can animate the whole solution.
- Babi's Tamil cheers and the words on screen were chosen separately, so they disagreed and often spoke over each other.
- A sum answered wrongly was counted twice, making the accuracy figures wrong.
- Progress could be lost if the app was closed at the moment it was saving.
- Swiping to scroll could move a bead by accident.
- A paused game could still be opened by its direct link.

---

## 7. Testing done

A robot plays the whole app at small phone (320px), phone (390px) and tablet (820px) sizes:

- all 11 lessons and all 12 practice levels, including wrong answers → clue → Babi's demo;
- all 7 games at all 3 difficulties;
- level test, Grand Exam, Mental Maths Exam, certificate, and the results reaching the grown-ups page;
- the owner console: non-owner accounts refused (HTTP 403), features paused and released, and paused features unreachable by link;
- the "I know abacus" quick check, phones with saving blocked (private mode), and a **real offline run** with the internet switched off.

No JavaScript errors, no sideways scrolling, progress saved correctly. The maths engine has its own test covering every sum from 0 to 99.

**Still worth doing, and I could not do it from here:** 5 minutes on a real low-cost Android phone and on an iPhone (voices differ between phones), a Tamil teacher reading `js/i18n.js` aloud, and watching 1–2 children use it.

---

## 8. Sensible next steps

1. **Monthly progress report** for parents — speed and accuracy over time. This is the strongest reason people keep paying.
2. **Several children on one phone**, each with their own progress.
3. **Daily goal and an evening reminder** — the biggest driver of daily use.
4. **Play Store listing** — parents look for apps in the store.
5. **For centres:** class codes children join without passwords, a teacher dashboard, homework, and printable worksheets.

Prices, phases and the fuller plan are in the growth-plan page shared alongside this app.
