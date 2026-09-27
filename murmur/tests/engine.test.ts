import { describe, expect, it } from 'vitest';
import { World } from '../app/src/engine/world';
import { getTownMap, MAP_W, MAP_H } from '../app/src/engine/townMap';
import { mockAnalysis } from '../shared/mock';
import { normalizeProbs } from '../shared/actions';

function snapshot(w: World) {
  return w.citizens.map((c) => `${c.x.toFixed(6)},${c.y.toFixed(6)},${c.inside ? 1 : 0}`).join(';');
}

describe('town map', () => {
  it('has the right size and houses', () => {
    const m = getTownMap();
    expect(m.tiles.length).toBe(MAP_H);
    expect(m.tiles.every((r) => r.length === MAP_W)).toBe(true);
    expect(m.houses.length).toBeGreaterThanOrEqual(190);
  });
});

describe('world', () => {
  it('is deterministic for the same seed', () => {
    const a = new World({ seed: 42, citizenCount: 300, startMinute: 690 });
    const b = new World({ seed: 42, citizenCount: 300, startMinute: 690 });
    for (let i = 0; i < 300; i++) {
      a.step();
      b.step();
    }
    expect(snapshot(a)).toBe(snapshot(b));
  });

  it('replays events and decisions identically', () => {
    const live = new World({ seed: 7, citizenCount: 400, startMinute: 690 });
    for (let i = 0; i < 50; i++) live.step();
    const analysis = mockAnalysis('free ramen in the park');
    const eventIdx = live.queueEvent('free ramen in the park', analysis);
    const p = live.registerProbs(normalizeProbs({ rush_toward: 0.5, spread_word: 0.3, film_it: 0.2 }));
    for (let i = 0; i < 200; i++) {
      live.step();
      for (const req of live.waveRequests.splice(0)) {
        for (const id of req.citizenIds) {
          const action = (['rush_toward', 'spread_word', 'film_it'] as const)[id % 3];
          live.queueDecision({ eventIdx: req.eventIdx, citizenId: id, action, probsRef: p, latencyMs: 100, mock: true, cached: false });
        }
      }
    }
    expect(eventIdx).toBe(0);
    expect(live.events[0].aware).toBeGreaterThan(10);
    const replay = new World({ seed: 7, citizenCount: 400, startMinute: 690 });
    replay.loadReplay(live.log, live.probTable);
    for (let i = 0; i < 250; i++) replay.step();
    expect(snapshot(replay)).toBe(snapshot(live));
    expect(replay.events[0].aware).toBe(live.events[0].aware);
  });

  it('runs 1000 citizens fast enough', () => {
    const w = new World({ seed: 1, citizenCount: 1000, startMinute: 690 });
    const t0 = performance.now();
    for (let i = 0; i < 200; i++) w.step();
    const per = (performance.now() - t0) / 200;
    expect(per).toBeLessThan(8);
  });
});
