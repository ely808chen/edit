# Decisions

Judgment calls made while building Murmur, one line of reasoning each.

## Project layout

- Murmur lives in `murmur/` inside this repository, with its own `package.json`, because the repo root already holds an unrelated Next.js app that must keep working.
- npm (not the root's pnpm workspace) manages `murmur/`, so installing Murmur never touches the other app's lockfile.
- Vite's root is `app/`, `shared/` and `functions/` sit beside it exactly as in the spec's structure, and `dist/` is the Pages output.
- The Vite dev server mounts the real `functions/api/*` handlers with in-memory KV, so `npm run dev` is fully playable without wrangler; `npm run pages:dev` runs the true Workers runtime.

## Jev integration

- TypeSafe, OpenRouter's Decisions API, and Vercel AI Gateway's TypeSafe-compatible endpoint all accept `{ state, model, questions }` and return `{ answers }` in the same shape, so one adapter serves all three with a different URL, model, and key.
- Default models: `jev-latest` (TypeSafe), `typesafe/jev-1.13` (OpenRouter), `typesafe-ai/jev` (Vercel); `JEV_MODEL` overrides them.
- `QUESTIONS_PER_REQUEST` stays at 32: the docs list no per-request question cap, only 64k tokens per request, and 32 twelve-option questions are about 13k tokens.
- A real `PROVIDER` without its key quietly falls back to mock (and says so via `x-murmur-provider: mock`), so a misconfigured deploy still plays.
- The preview endpoint also asks broadcast and weather, so pressing Enter after a preview reuses the whole analysis and skips the analyze round trip.
- The decide request sends `world.minute` (not a free-form time string) and `world.otherEvents` (texts of other active events), so the server can build "rushing toward the free ramen" from enums and an index.
- Other-event texts are re-validated and blocklisted on the server like the main event text.
- Severity is read from the Score answer's most likely level rather than the weighted score, so "notable" means Jev thought notable was most likely.
- Weather is set only when Jev puts at least 45% on a non-none option, to avoid surprise rain.
- The server caches decide results only when they came from a real provider; mock results are never cached, so turning on a key immediately gives real answers.

## Simulation

- All simulation timing is in ticks (10 per simulated minute), so 3x speed also speeds up waves, threads, and event lifetimes; at 1x these match the spec's real-time numbers exactly.
- Randomness in the engine is stateless hashing of (seed, tick, citizen, salt) instead of one PRNG stream, so async decision arrival order can never change the outcome.
- Decisions arriving from the network are applied at the next tick and logged with that tick; replays inject them at the same tick, sorted by event then citizen, which makes playback bit-identical.
- The engine avoids `Math.sin`/`cos` (not guaranteed identical across JS engines) and uses only arithmetic and `sqrt`, which IEEE 754 fixes.
- Flow fields are lazily built per target tile with Dijkstra weighted to prefer roads; 64 x 40 makes each field about 0.3 ms.
- When a fourth event is released, the oldest active event ends early instead of refusing the new one, because refusing the player's words feels worse.
- Citizens in the final allowed wave still decide but don't spread, so nobody is ever left aware without a decision.
- Whispers get up to 12 waves instead of 6: starting from one citizen, 6 waves of 2 to 4 listeners cannot mathematically reach the Whisper network goal of 400.
- Wave 0 includes citizens who are indoors within the radius (they hear the commotion); they step outside when their action needs them visible.
- Crowds heading to an event spread over the place's nearest walkable tiles, widening as more citizens head there, so 250 can gather at the Ramen Stall without stacking.
- Ignoring a new event while reacting to an older one keeps the older reaction, since "carry on" means carry on with what you were doing.
- For danger events, people heading toward the scene stop at the edge of the event's place, like onlookers at police tape, instead of piling onto the danger.
- Citizens who stand inside an active danger zone step out of it before filming, grumbling, cheering, or panicking.
- Fleeing is a 4-second dash up the distance field, then a brisk walk home to safety, so "run away" actually empties the area.
- Ramen Stall regulars form a queue that snakes from the counter toward the shopping street instead of milling around.
- Citizens entering a building go inside once they are within 0.75 tiles of the door, so avoidance can't keep a crowd jostling at an entrance.

## Mock mode

- The mock brain lives in `shared/mock.ts` so the server's mock provider and the browser's offline fallback give identical results.
- Archetypes carry small "quirks" (regex or category boosts) on top of the trait vector, which is what makes the cat lover celebrate a cat mayor and office workers grumble about the station.
- An animal plus an official-sounding word ("a cat is elected mayor") is classified as silly rather than an announcement.
- "free" and "無料" count as intensifiers, so free food is a big deal and ripples across most of town.
- The mock recognizes a few cues a good decision model would: boring civic news ("the council publishes the recycling schedule") is notable but ignored, secrets spread like gossip, evacuation warnings send people home, and reassurance ("just a friendly mascot") calms panic. Without these, three challenges were unwinnable in mock mode.

## Product

- Headlines quote the event mid-sentence ("celebrate “a cat is elected mayor”") and use a sentence form of place names ("the Beach").
- The Clear the beach challenge redirects other citizens' routine beach visits to the park, so the 120-citizen crowd is the only thing to clear.
- The Ramen rush challenge starts at 15:30, because at lunchtime the routine crowd alone nearly meets the goal.
- Challenge limits are in simulated time, so 3x speed makes them harder, not easier to game; the speed resets to 1x when a challenge starts.
- Challenges with no time limit fail once all allowed events are used and have faded; the Whisper network fails when the whisper's ripple ends short of 400.
- Stars: one for finishing, one for using a single event, one for finishing in half the time limit. The Whisper network rewards speed, and the Great shrug rewards fewer attempts.
- Tapping the map on a place sets the ghost pin; tapping it again or tapping elsewhere clears it. Tapping a citizen always wins over tapping a place.
- On a portrait phone the director camera never pulls back further than the default framing, since the landscape town would shrink to a thin strip.
- The FPS fallback to 600 citizens only happens in free play with no active events, and starts a fresh town, because swapping citizens mid-ripple would break the replay log.
- Mock results shown in the card say "Simulated locally"; the yellow fallback banner is reserved for the budget, kill switch, or an unreachable server, matching the spec's copy.
- Clip recording (stretch goal) uses `canvas.captureStream` and MediaRecorder, preferring MP4 where the browser supports it, and only appears when both APIs exist.
