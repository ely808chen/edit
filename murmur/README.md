# murmur

**Type anything. Watch a thousand tiny minds decide.**

Murmur is a cozy miniature town of 1,000 tiny citizens rendered as a living diorama in the browser. The player types any event ("free ramen in the park", "rumor: the old bridge is haunted", "公園で無料ラーメン") and every citizen decides what to do. News ripples outward in visible waves as citizens tell their neighbors.

It showcases **Jev**, TypeSafe AI's decision model: many fast, cheap judgments at once, with calibrated probabilities that are meaningful enough to sample from. Jev never writes text here. Every citizen's choice is a probability distribution over 12 actions, and each citizen samples from it.

Mock mode makes the whole game fully playable with no API key.

---

## Quick start

```bash
cd murmur
npm install
npm run dev          # http://localhost:5173, mock mode, no key needed
```

`npm run dev` serves the real Pages Functions from `functions/` inside the Vite dev server with in-memory KV, so preview, analyze, decide, share, and replay all work locally.

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server plus the API, mock provider by default |
| `npm run build` | Typecheck, production build to `dist/`, then the bundle integrity check |
| `npm run pages:dev` | Build, then run the real Cloudflare Workers runtime with `wrangler pages dev` |
| `npm test` | Vitest: engine determinism and replays, API handlers, challenges, feel tests (mock) |
| `npm run eval` | Feel tests against any provider, with per-archetype distributions |
| `npm run check:bundle` | Fails if the client bundle contains a key, provider URL, or question template |

## How it works

```
Browser                                         Cloudflare Pages Functions
┌───────────────────────────────────────┐       ┌────────────────────────────────────────┐
│ engine/  deterministic 10 Hz sim       │       │ /api/preview   blocked, category,      │
│          routines, flow fields, waves, │ ids & │                place, severity, leans  │
│          spreading, replays            │ enums │ /api/analyze   the event's analysis     │
│ render/  PixiJS diorama, emotes,       │ ────▶ │ /api/decide    NDJSON, one line per     │
│          threads, weather, lighting    │       │                context as batches land  │
│ ui/      React overlay                 │ ◀──── │ /api/share, /api/replay/:id  (KV)       │
│ api/     NDJSON stream reader          │ NDJSON│ _lib/ questions, providers, moderation, │
└───────────────────────────────────────┘       │       rate limits, budget, cache        │
                                                └────────────────────────────────────────┘
```

1. **Release.** The browser calls `/api/analyze` (or reuses the last preview if the text is unchanged). Blocked events stop here with a friendly message.
2. **Wave 0.** Citizens within the severity radius (or everyone, for broadcasts) become aware. Each is mapped to a context key: archetype, how they heard, who told them, distance bucket, mood, and current activity. Unique keys become questions; citizens sharing a key share the answer.
3. **Decide.** `/api/decide` receives only ids and enums. The server builds every question from fixed templates in `shared/templates.ts`, batches them (closest to the event first), and streams results back as NDJSON.
4. **Sample and spread.** Each citizen samples an action from the sharpened distribution (power 1.3). Spreading actions draw a glowing thread to listeners, who become the next wave 600 ms later, up to 6 waves.
5. **Replay.** Every non-deterministic input (events with their tick and analysis, each sampled decision with its tick) is logged. A shared link re-runs the simulation with those inputs and never calls Jev.

The browser never sends question text and the API key lives only in server environment variables, so the backend can't be used as a free general-purpose Jev API.

### Project structure

```
murmur/
  app/src/engine    town map, citizens, schedules, flow fields, waves, dedupe, sampling, replay
  app/src/render    Pixi setup, procedural textures, camera, emotes, threads, weather, lighting
  app/src/ui        CommandBar, CityPulse, CitizenCard, Challenges, ShareDialog, Onboarding, Settings, DebugOverlay
  app/src/api       client for preview, analyze, decide (NDJSON), share
  app/src/audio     Web Audio synth (no audio files)
  app/src/i18n      en.ts, ja.ts
  app/src/game      controller, store, challenges
  functions/api     preview.ts, analyze.ts, decide.ts, share.ts, replay/[id].ts
  functions/_lib    providers (mock, TypeSafe, OpenRouter, Vercel), moderation, limits, budget, cache
  shared            actions, archetypes, places, templates (server only), headlines, mock brain, types
  eval              feel-tests.ts
  tests             Vitest suites
```

## Providers

The adapter is picked by the `PROVIDER` environment variable. All providers return the same neutral shape, so switching never changes the client.

| `PROVIDER` | Endpoint | Key variable | Default model |
|---|---|---|---|
| `mock` (default) | none, local simulation | none | none |
| `typesafe` | `https://api.typesafe.ai/v1/systemone` | `JEV_API_KEY` | `jev-latest` |
| `openrouter` | `https://openrouter.ai/api/alpha/decisions` (Decisions API, not chat/completions) | `OPENROUTER_API_KEY` | `typesafe/jev-1.13` |
| `vercel` | `https://ai-gateway.vercel.sh/typesafe/v1/systemone` | `VERCEL_AI_GATEWAY_KEY` | `typesafe-ai/jev` |

If a real provider is selected but its key is missing, the server serves mock results and reports `x-murmur-provider: mock`.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PROVIDER` | `mock` | `mock`, `typesafe`, `openrouter`, or `vercel` |
| `JEV_API_KEY` | | TypeSafe API key (secret) |
| `OPENROUTER_API_KEY` | | OpenRouter key (secret) |
| `VERCEL_AI_GATEWAY_KEY` | | Vercel AI Gateway key (secret) |
| `JEV_MODEL` | per provider | Override the model name |
| `QUESTIONS_PER_REQUEST` | `32` | Questions per Jev request (about 13k tokens at 32) |
| `MAX_IN_FLIGHT` | `6` | Concurrent Jev requests per decide call |
| `DAILY_QUESTION_BUDGET` | `200000` | Real questions per day before falling back to mock |
| `KILL_SWITCH` | `false` | `true` serves mock results everywhere, with the fallback banner |
| `ALLOWED_ORIGIN` | `*` | Comma-separated origins allowed by CORS |

KV namespaces: `CACHE` (analysis and decision cache, daily budget counter) and `REPLAYS` (shared replays, 90-day TTL).

For local development with a real key, copy `.dev.vars.example` to `.dev.vars` and fill it in. Both `npm run dev` and `npm run pages:dev` read it.

## Deploy to Cloudflare Pages

1. Create two KV namespaces:
   ```bash
   npx wrangler kv namespace create CACHE
   npx wrangler kv namespace create REPLAYS
   ```
   Put their ids in `wrangler.toml`.
2. Create a Pages project pointing at this repository with root directory `murmur`, build command `npm run build`, and output directory `dist`.
3. In the project settings, bind the `CACHE` and `REPLAYS` namespaces, set `PROVIDER` and `ALLOWED_ORIGIN`, and add the provider key as an encrypted secret:
   ```bash
   npx wrangler pages secret put JEV_API_KEY
   ```
4. Deploy (`npx wrangler pages deploy dist`, or push to the connected branch).

`app/public/_redirects` rewrites `/r/:id` to the app, which loads the replay.

## Costs

Jev bills input tokens only ($0.042 per million at the time of writing). One decision question is about 400 tokens, and the shared state is sent once per batch of 32.

| Action | Questions | Approximate cost |
|---|---|---|
| Preview while typing | 14 | $0.0002 |
| Analyze on release | 5 or 6 | $0.0001 |
| One event, default mode (dedupe) | 150 to 400 | $0.003 to $0.007 |
| One event, full city mode | up to 1,500 (cap) | about $0.03 |
| Daily budget, 200,000 questions | | about $3.50 per day at most |

Server-side caching (24 hours for decisions, keyed by event, place, category, weather, time of day, and context) and the browser's session cache make repeated events nearly free.

## Limits and safety

- Rate limits per IP: analyze 20 per 5 minutes, preview 90 per minute, decide 6,000 questions per minute, and at most 1,500 questions per event. Limits live in isolate memory; add a Cloudflare rate limiting rule for hard guarantees.
- A short blocklist (English and Japanese) runs before any provider call, then Jev's own `blocked` question. Blocked events never reach decide, and shared replays are re-checked.
- Decide payloads over 256 KB and replays over 2 MB are rejected. Every context field is validated against enums.
- Per-request timeout 1.5 s with one retry, then that batch is simulated and marked mock. The citizen card then says "Simulated locally".
- Logs contain counts, latencies, cache hits, and provider errors only. Event text is never logged, and is stored only inside replays a player chooses to share.

## Feel tests

`npm run eval` runs the eight feel tests from the spec end to end: the real engine simulates the town, the provider analyzes the event and makes every decision, and the script checks the outcome and prints per-archetype distributions.

```bash
npm run eval                                        # mock
PROVIDER=typesafe JEV_API_KEY=... npm run eval      # real Jev
```

The mock brain (`shared/mock.ts`) passes all eight. `npm test` also proves that each of the six challenges is winnable in mock mode.

## Performance budgets

- JavaScript: about 260 KB gzipped (budget 600 KB), checked on every build.
- Simulation: about 1.5 ms per tick for 1,000 citizens on a laptop.
- If the frame rate stays under 45 for 3 seconds, the town drops to 600 citizens and Settings says so.

See [DECISIONS.md](./DECISIONS.md) for the judgment calls behind all of this.
