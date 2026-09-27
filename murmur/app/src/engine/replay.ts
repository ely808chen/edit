import { ACTION_KEYS, type ActionProbs, type Analysis, type Lang } from '../../../shared/types';
import { ACTION_INDEX, normalizeProbs } from '../../../shared/actions';
import type { DecisionInput, EventInput, Input, World, WorldConfig } from './world';

/**
 * A replay is everything that was not deterministic in a session: the world config, the
 * events with their analysis and release tick, and every sampled decision with its tick.
 * Re-running the simulation with these inputs reproduces the moment without calling Jev.
 */
export interface ReplayPayload {
  v: 1;
  config: WorldConfig;
  lang: Lang;
  events: Array<{ tick: number; eventIdx: number; text: string; analysis: Analysis; whisperTarget: number | null }>;
  /** [tick, eventIdx, citizenId, actionIndex, probsRef, latencyMs, flags(1 mock, 2 cached)] */
  decisions: Array<[number, number, number, number, number, number, number]>;
  probs: number[][];
  fromTick: number;
  endTick: number;
  headline: { line: string; subline: string | null } | null;
  challenge: string | null;
}

export function buildReplay(world: World, lang: Lang, headline: ReplayPayload['headline'], challenge: string | null): ReplayPayload {
  const events: ReplayPayload['events'] = [];
  const decisions: ReplayPayload['decisions'] = [];
  const used = new Map<number, number>();
  const probs: number[][] = [];
  for (const inp of world.log) {
    if (inp.type === 'event') {
      const { probs: _drop, ...analysis } = inp.analysis;
      void _drop;
      events.push({ tick: inp.tick, eventIdx: inp.eventIdx, text: inp.text, analysis, whisperTarget: inp.whisperTarget });
    } else {
      let ref = used.get(inp.probsRef);
      if (ref === undefined) {
        ref = probs.length;
        used.set(inp.probsRef, ref);
        const p = world.probTable[inp.probsRef];
        probs.push(ACTION_KEYS.map((k) => Math.round((p?.[k] ?? 0) * 1000) / 1000));
      }
      decisions.push([inp.tick, inp.eventIdx, inp.citizenId, ACTION_INDEX[inp.action], ref, Math.round(inp.latencyMs), (inp.mock ? 1 : 0) | (inp.cached ? 2 : 0)]);
    }
  }
  const firstTick = events.length ? events[0].tick : world.tick;
  return {
    v: 1,
    config: world.config,
    lang,
    events,
    decisions,
    probs,
    fromTick: Math.max(0, firstTick - 40),
    endTick: world.tick,
    headline,
    challenge,
  };
}

export function replayInputs(p: ReplayPayload): { inputs: Input[]; probTable: ActionProbs[] } {
  const probTable = p.probs.map((row) => normalizeProbs(Object.fromEntries(ACTION_KEYS.map((k, i) => [k, row[i] ?? 0]))));
  const inputs: Input[] = [];
  for (const e of p.events) {
    const ev: EventInput = { type: 'event', tick: e.tick, eventIdx: e.eventIdx, text: e.text, analysis: e.analysis, whisperTarget: e.whisperTarget };
    inputs.push(ev);
  }
  for (const d of p.decisions) {
    const di: DecisionInput = {
      type: 'decision',
      tick: d[0],
      eventIdx: d[1],
      citizenId: d[2],
      action: ACTION_KEYS[d[3]],
      probsRef: d[4],
      latencyMs: d[5],
      mock: (d[6] & 1) === 1,
      cached: (d[6] & 2) === 2,
    };
    inputs.push(di);
  }
  return { inputs, probTable };
}

export function isReplayPayload(x: unknown): x is ReplayPayload {
  const p = x as ReplayPayload;
  return !!p && p.v === 1 && typeof p.config?.seed === 'number' && Array.isArray(p.events) && Array.isArray(p.decisions) && Array.isArray(p.probs);
}
