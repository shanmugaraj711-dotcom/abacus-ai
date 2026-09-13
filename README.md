# Abacus AI 🧮🤖

Offline-first Abacus Adventure for kids aged 6–8.

## V1 scope
- 15-level abacus curriculum
- Levels 1–6 playable/free in the child UI
- Levels 7–15 included in the engine and shown locked
- Direct bead interaction
- Rule-based direct / small-friend / big-friend problem generation
- Local progress persistence
- PWA manifest + service worker for offline use after first load
- PWA icons at 192x192 and 512x512
- No backend, payments, live AI, Oracle, n8n, APK or Play Store integration

## Technique verification decision (V1)
V1 validates the **outcome** (the final abacus value) and records the expected curriculum rule. It does not attempt to infer the exact physical technique used by the child from the final bead position.

This is an intentional V1 simplification: technique verification would require tracking the sequence of bead movements and defining valid movement patterns for direct, small-friend, and big-friend methods. We should test whether outcome-based drills are sufficient with the 5–6 trial families before adding that complexity. If technique teaching becomes a real validation issue, add movement-sequence validation in a later V1.x pass without adding AI.

## Run locally
Use any static HTTP server. For example:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/`.

## PWA/device test
On Android Chrome:
1. Open the hosted app.
2. Install/Add to Home Screen when offered.
3. Start a few challenges and confirm progress changes are saved.
4. Turn on Airplane mode.
5. Close and reopen the installed app.
6. Confirm the app still loads and the saved progress remains.

## Tests
Serve the folder over HTTP and open `/tests/test.html`; results appear in the browser console.

## V1 validation gate
Before moving to v1.5, validate repeat use with 5–6 known families, get explicit payment interest from 2–3 parents, and observe 1–2 kids using the app live.
