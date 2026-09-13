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
- No backend, payments, live AI, Oracle, n8n, APK or Play Store integration

## Run locally
Use any static HTTP server. For example:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/`.

## Tests
Serve the folder over HTTP and open `/tests/test.html`; results appear in the browser console.

## V1 validation gate
Before moving to v1.5, validate repeat use with 5–6 known families, get explicit payment interest from 2–3 parents, and observe 1–2 kids using the app live.
