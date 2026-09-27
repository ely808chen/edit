import type { World } from '../engine/world';
import { SEVERITIES } from '../../../shared/types';

export type ChallengeId = 'ramen' | 'calm' | 'beach' | 'whisper' | 'night' | 'shrug';

export interface ChallengeRun {
  id: ChallengeId;
  startTick: number;
  eventsUsed: number;
  whispersUsed: number;
  shrugAttempts: number;
  shrugBest: number;
  checkedEvents: Set<number>;
  scriptedEventIdx: number | null;
  status: 'running' | 'success' | 'failed';
  failReason: 'time' | 'events' | null;
  stars: number;
  elapsedS: number;
  notice: 'notNotable' | null;
}

export interface ChallengeDef {
  id: ChallengeId;
  startMinute: number;
  beachCrowd?: number;
  maxEvents: number | null;
  timeLimitS: number | null;
  whispersOnly?: boolean;
  scripted?: string;
}

export const CHALLENGES: ChallengeDef[] = [
  { id: 'ramen', startMinute: 15 * 60 + 30, maxEvents: 2, timeLimitS: 90 },
  { id: 'calm', startMinute: 13 * 60, maxEvents: 3, timeLimitS: 60, scripted: 'a giant crab was spotted on the beach' },
  { id: 'beach', startMinute: 15 * 60, beachCrowd: 120, maxEvents: 2, timeLimitS: 60 },
  { id: 'whisper', startMinute: 12 * 60 + 10, maxEvents: null, timeLimitS: null, whispersOnly: true },
  { id: 'night', startMinute: 2 * 60, maxEvents: 2, timeLimitS: null },
  { id: 'shrug', startMinute: 12 * 60 + 10, maxEvents: null, timeLimitS: null },
];

export const CHALLENGE_BY_ID = Object.fromEntries(CHALLENGES.map((c) => [c.id, c])) as Record<ChallengeId, ChallengeDef>;

const UPSET = new Set(['panic', 'flee', 'complain']);

export interface Progress {
  /** 0 to 1 for the meter. */
  value: number;
  /** Numbers for the progress label. */
  n: number;
  p: number;
  done: boolean;
}

export function newRun(id: ChallengeId, startTick: number): ChallengeRun {
  return {
    id,
    startTick,
    eventsUsed: 0,
    whispersUsed: 0,
    shrugAttempts: 0,
    shrugBest: 0,
    checkedEvents: new Set(),
    scriptedEventIdx: null,
    status: 'running',
    failReason: null,
    stars: 0,
    elapsedS: 0,
    notice: null,
  };
}

export function measure(run: ChallengeRun, world: World): Progress {
  const def = CHALLENGE_BY_ID[run.id];
  switch (run.id) {
    case 'ramen': {
      const c = world.map.places.ramen.center;
      const n = world.countNear(c.x, c.y, 5);
      return { value: Math.min(1, n / 250), n, p: 0, done: n >= 250 };
    }
    case 'calm': {
      let aware = 0;
      let upset = 0;
      for (const c of world.citizens) {
        let knows = false;
        for (const idx of c.aware.keys()) if (world.events[idx]?.active) knows = true;
        if (!knows) continue;
        aware++;
        const a = world.currentAction(c);
        if (a && UPSET.has(a)) upset++;
      }
      const p = aware ? (upset / aware) * 100 : 0;
      const played = run.eventsUsed > 0;
      return { value: aware ? Math.max(0, Math.min(1, 1 - (p - 5) / 60)) : 0, n: upset, p: Math.round(p), done: played && aware > 0 && p < 5 && world.tick - run.startTick > 20 };
    }
    case 'beach': {
      const n = world.countInPlace('beach');
      return { value: Math.max(0, 1 - n / (def.beachCrowd ?? 120)), n, p: 0, done: n === 0 };
    }
    case 'whisper': {
      const ev = world.events.find((e) => e && e.whisperTarget !== null);
      const n = ev ? ev.aware : 0;
      return { value: Math.min(1, n / 400), n, p: 0, done: n >= 400 };
    }
    case 'night': {
      const n = world.countInPlace('park');
      return { value: Math.min(1, n / 100), n, p: 0, done: n >= 100 };
    }
    case 'shrug': {
      for (const ev of world.events) {
        if (!ev || ev.idx === run.scriptedEventIdx || run.checkedEvents.has(ev.idx)) continue;
        if (!world.isSettled(ev) && ev.active) continue;
        run.checkedEvents.add(ev.idx);
        if (SEVERITIES.indexOf(ev.analysis.severity) < 1) {
          run.notice = 'notNotable';
          continue;
        }
        run.notice = null;
        run.shrugAttempts++;
        if (ev.decided >= 12) {
          const share = ev.counts.ignore / ev.decided;
          run.shrugBest = Math.max(run.shrugBest, share);
        }
      }
      return { value: Math.min(1, run.shrugBest / 0.9), n: 0, p: Math.round(run.shrugBest * 100), done: run.shrugBest >= 0.9 };
    }
  }
}

export function starsFor(run: ChallengeRun): number {
  const def = CHALLENGE_BY_ID[run.id];
  let stars = 1;
  if (run.id === 'whisper') {
    if (run.elapsedS <= 30) stars++;
    if (run.elapsedS <= 18) stars++;
    return stars;
  }
  if (run.id === 'shrug') {
    if (run.shrugAttempts <= 3) stars++;
    if (run.shrugAttempts <= 1) stars++;
    return stars;
  }
  if (run.eventsUsed <= 1) stars++;
  const limit = def.timeLimitS ?? 60;
  if (run.elapsedS <= limit * 0.5) stars++;
  return Math.min(3, stars);
}

export function loadBestStars(): Partial<Record<ChallengeId, number>> {
  try {
    return JSON.parse(localStorage.getItem('murmur.stars') ?? '{}') as Partial<Record<ChallengeId, number>>;
  } catch {
    return {};
  }
}

export function saveBestStars(id: ChallengeId, stars: number) {
  const best = loadBestStars();
  if ((best[id] ?? 0) < stars) {
    best[id] = stars;
    try {
      localStorage.setItem('murmur.stars', JSON.stringify(best));
    } catch {
      // ignore
    }
  }
}
