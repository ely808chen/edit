import type { ActionKey, ActionProbs, DecideContext, DistanceBucket } from '../../../shared/types';
import { sampleAction } from '../../../shared/actions';
import { hrand } from '../../../shared/hash';
import type { Citizen, SimEvent, World } from './world';

export function distanceBucket(d: number): DistanceBucket {
  if (d <= 5) return 'here';
  if (d <= 16) return 'near';
  return 'far';
}

export interface WaveContexts {
  otherEvents: string[];
  contexts: DecideContext[];
  /** context key -> citizen ids sharing it, closest first. */
  members: Map<string, number[]>;
}

/**
 * Map every citizen in a wave to a context key. In default mode citizens that share a key
 * share one question; full city mode asks one question per citizen.
 */
export function buildWaveContexts(world: World, ev: SimEvent, citizenIds: number[], fullCity: boolean): WaveContexts {
  const others = world.events.filter((e) => e && e.active && e.idx !== ev.idx);
  const otherEvents = others.map((e) => e.text);
  const otherIndex = new Map(others.map((e, i) => [e.idx, i]));
  const members = new Map<string, number[]>();
  const contexts: DecideContext[] = [];
  for (const id of citizenIds) {
    const c = world.citizens[id];
    const aw = c.aware.get(ev.idx);
    if (!aw) continue;
    const d = world.distanceTo(c, ev);
    const bucket = distanceBucket(d);
    const activity = activityOf(c, otherIndex);
    let key = `${c.archetype.id}|${aw.source}|${aw.tellerGroup}|${bucket}|${c.mood}|${activity}`;
    if (fullCity) key += `|c${c.id}|${Math.round(d)}`;
    let list = members.get(key);
    if (!list) {
      list = [];
      members.set(key, list);
      const ctx: DecideContext = {
        key,
        archetypeId: c.archetype.id,
        source: aw.source,
        tellerGroup: aw.tellerGroup,
        distance: bucket,
        mood: c.mood,
        activity,
      };
      if (fullCity) ctx.distanceTiles = Math.round(d);
      contexts.push(ctx);
    }
    list.push(id);
  }
  return { otherEvents, contexts, members };
}

function activityOf(c: Citizen, otherIndex: Map<number, number>): string {
  const r = c.reaction;
  if (!r || r.action === 'ignore') return 'routine';
  const k = otherIndex.get(r.eventIdx);
  if (k === undefined) return 'routine';
  return `${r.action}:${k}`;
}

export { decideCacheKey } from '../../../shared/cacheKeys';

export function sampleFor(world: World, eventIdx: number, citizenId: number, probs: ActionProbs): ActionKey {
  return sampleAction(probs, hrand(world.seed, eventIdx, citizenId, 7));
}
