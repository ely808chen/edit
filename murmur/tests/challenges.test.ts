import { describe, expect, it } from 'vitest';
import { World } from '../app/src/engine/world';
import { buildWaveContexts, sampleFor } from '../app/src/engine/decisions';
import { CHALLENGE_BY_ID, measure, newRun, type ChallengeId } from '../app/src/game/challenges';
import { mockAnalysis, mockDecideContext } from '../shared/mock';

/** Drives a challenge headlessly with the mock brain, the way the browser would. */
function play(id: ChallengeId, events: Array<{ at: number; text: string; whisper?: 'first-outdoor' }>, maxTicks: number, citizenCount = 1000) {
  const def = CHALLENGE_BY_ID[id];
  const world = new World({ seed: 99, citizenCount, startMinute: def.startMinute, beachCrowd: def.beachCrowd });
  const run = newRun(id, 0);
  if (def.scripted) run.scriptedEventIdx = world.queueEvent(def.scripted, mockAnalysis(def.scripted));
  let best = 0;
  let done = false;
  let doneAt = -1;
  for (let t = 1; t <= maxTicks && !done; t++) {
    for (const e of events) {
      if (e.at !== t) continue;
      let target: number | null = null;
      if (e.whisper) {
        // A savvy player whispers to the town gossip, somewhere busy.
        const c = world.citizens
          .filter((c) => !c.inside && world.map.places.park.placeMask[Math.floor(c.y) * 64 + Math.floor(c.x)])
          .sort((a, b) => (a.archetype.id === 'nosy_retiree' ? -1 : 0) - (b.archetype.id === 'nosy_retiree' ? -1 : 0) || a.id - b.id)[0];
        target = c.id;
        run.whispersUsed++;
      } else run.eventsUsed++;
      world.queueEvent(e.text, mockAnalysis(e.text), target);
    }
    world.step();
    for (const req of world.waveRequests.splice(0)) {
      const ev = world.events[req.eventIdx];
      const wc = buildWaveContexts(world, ev, req.citizenIds, false);
      for (const ctx of wc.contexts) {
        const probs = mockDecideContext(ctx, { text: ev.text, category: ev.analysis.category }, { minute: world.minute, weather: world.weather });
        const ref = world.registerProbs(probs);
        for (const cid of wc.members.get(ctx.key)!) world.queueDecision({ eventIdx: ev.idx, citizenId: cid, action: sampleFor(world, ev.idx, cid, probs), probsRef: ref, latencyMs: 0, mock: true, cached: false });
      }
    }
    const p = measure(run, world);
    best = Math.max(best, p.value);
    if (p.done) {
      done = true;
      doneAt = t;
    }
  }
  return { done, doneAt, best };
}

describe('challenges are winnable in mock mode', () => {
  it('Ramen rush', () => {
    const r = play('ramen', [{ at: 5, text: 'free ramen for everyone at the ramen stall!!' }], 900);
    expect(r.done).toBe(true);
  });

  it('Calm the town', () => {
    const r = play('calm', [{ at: 40, text: 'all clear everyone: the giant crab is just a friendly mascot handing out free snacks' }], 600);
    expect(r.done).toBe(true);
  });

  it('Clear the beach', () => {
    const r = play(
      'beach',
      [
        { at: 5, text: 'tsunami warning: everyone must evacuate the beach now!' },
        { at: 150, text: 'free ramen at the ramen stall! everyone leave the beach now' },
      ],
      600,
    );
    expect(r.done).toBe(true);
  });

  it('Whisper network', () => {
    const r = play('whisper', [{ at: 5, text: "secret: the baker and the mayor are dating, don't tell anyone", whisper: 'first-outdoor' }], 900);
    expect(r.done).toBe(true);
  });

  it('Night owls', () => {
    const r = play('night', [{ at: 5, text: 'huge free midnight concert in Central Park with free ramen for everyone!!!' }], 900);
    expect(r.done).toBe(true);
  });

  it('The great shrug', () => {
    const r = play('shrug', [{ at: 5, text: 'the town council publishes the new recycling schedule' }], 400);
    expect(r.done).toBe(true);
  });
});
