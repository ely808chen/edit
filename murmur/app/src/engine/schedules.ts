import { PLACE_IDS, type PlaceId } from '../../../shared/types';
import { hrand } from '../../../shared/hash';

/**
 * A schedule target:
 * - 'home': go home and stay inside
 * - a place id: go there (inside if the place has an interior)
 * - `${place}:out`: go to the place but linger outdoors (commuters, recess, café tables)
 * - an array: pick one per citizen per day
 * - 'roam': wander to a different place every 45 simulated minutes
 */
export type Target = 'home' | 'roam' | PlaceId | `${PlaceId}:out` | Array<PlaceId | `${PlaceId}:out` | 'home'>;

export interface ScheduleEntry {
  h: number;
  t: Target;
}

export const SCHEDULES: Record<string, ScheduleEntry[]> = {
  kid: [{ h: 0, t: 'home' }, { h: 7.6, t: 'school' }, { h: 11.9, t: 'school:out' }, { h: 13, t: 'school' }, { h: 15, t: ['park', 'shopping', 'beach', 'park'] }, { h: 17.3, t: 'home' }],
  student: [{ h: 0, t: 'home' }, { h: 7.8, t: 'school' }, { h: 12, t: 'school:out' }, { h: 13, t: 'school' }, { h: 15.2, t: ['cafe:out', 'shopping', 'home'] }, { h: 18, t: 'home' }],
  teen: [{ h: 0, t: 'home' }, { h: 7.9, t: 'school' }, { h: 11.9, t: 'school:out' }, { h: 13, t: 'school' }, { h: 15, t: ['shopping', 'park', 'beach', 'station:out'] }, { h: 17, t: ['shopping', 'park', 'bridge'] }, { h: 19.2, t: 'home' }],
  uni: [{ h: 0, t: 'home' }, { h: 9.3, t: 'cafe' }, { h: 10.5, t: 'school' }, { h: 11.8, t: ['shopping', 'cafe:out', 'park'] }, { h: 13, t: 'school' }, { h: 16, t: ['shopping', 'cafe:out', 'park'] }, { h: 19.5, t: 'home' }],
  office: [{ h: 0, t: 'home' }, { h: 7.8, t: 'station:out' }, { h: 8.4, t: 'office' }, { h: 11.6, t: ['ramen', 'cafe:out', 'shopping', 'park', 'office', 'cafe:out'] }, { h: 12.9, t: 'office' }, { h: 18.8, t: 'station:out' }, { h: 19.4, t: ['home', 'home', 'ramen'] }, { h: 20.5, t: 'home' }],
  sales: [{ h: 0, t: 'home' }, { h: 8, t: 'station:out' }, { h: 8.5, t: 'office' }, { h: 10.5, t: 'shopping' }, { h: 11.7, t: ['ramen', 'cafe:out', 'shopping'] }, { h: 13.5, t: 'shopping' }, { h: 15, t: 'office' }, { h: 18.5, t: ['ramen', 'shopping'] }, { h: 20, t: 'home' }],
  construction: [{ h: 0, t: 'home' }, { h: 7, t: 'station:out' }, { h: 7.5, t: 'roam' }, { h: 11.7, t: ['ramen', 'park', 'shopping'] }, { h: 13, t: 'roam' }, { h: 17, t: 'home' }],
  delivery: [{ h: 0, t: 'home' }, { h: 9, t: 'roam' }, { h: 21, t: 'home' }],
  nurse: [{ h: 0, t: 'hospital' }, { h: 7.5, t: 'home' }, { h: 19.2, t: ['ramen', 'shopping'] }, { h: 20, t: 'hospital' }],
  clerk: [{ h: 0, t: 'shopping' }, { h: 8, t: 'home' }, { h: 15.5, t: 'shopping' }],
  police: [{ h: 0, t: 'home' }, { h: 8, t: 'roam' }, { h: 16, t: 'station:out' }, { h: 18, t: 'roam' }, { h: 22, t: 'home' }],
  taxi: [{ h: 0, t: 'station:out' }, { h: 3, t: 'home' }, { h: 11, t: 'station:out' }, { h: 12.1, t: 'ramen' }, { h: 13, t: 'station:out' }, { h: 16, t: 'roam' }, { h: 20, t: 'station:out' }],
  retiree: [{ h: 0, t: 'home' }, { h: 6.5, t: 'park' }, { h: 9, t: 'shrine' }, { h: 11, t: ['cafe:out', 'park'] }, { h: 12.5, t: 'shopping' }, { h: 15, t: 'park' }, { h: 17, t: 'home' }],
  grandma: [{ h: 0, t: 'home' }, { h: 7, t: 'shrine' }, { h: 9, t: 'shopping' }, { h: 11.5, t: ['cafe:out', 'park', 'home'] }, { h: 13, t: 'home' }, { h: 15, t: 'park' }, { h: 16.5, t: 'home' }],
  fisher: [{ h: 0, t: 'home' }, { h: 4.5, t: 'beach' }, { h: 11, t: 'bridge' }, { h: 12, t: 'ramen' }, { h: 13, t: 'beach' }, { h: 17, t: 'home' }],
  chef: [{ h: 0, t: 'home' }, { h: 9, t: 'ramen' }, { h: 23, t: 'home' }],
  cafe_owner: [{ h: 0, t: 'home' }, { h: 7, t: 'cafe:out' }, { h: 19, t: 'home' }],
  foodie: [{ h: 0, t: 'home' }, { h: 9, t: 'shopping' }, { h: 11.4, t: 'ramen' }, { h: 13, t: ['shopping', 'cafe:out', 'park'] }, { h: 17, t: 'ramen' }, { h: 19, t: 'home' }],
  baker: [{ h: 0, t: 'home' }, { h: 4, t: 'shopping' }, { h: 13, t: 'home' }],
  creative: [{ h: 0, t: 'home' }, { h: 10, t: ['cafe:out', 'park', 'station:out'] }, { h: 11.8, t: ['ramen', 'park', 'cafe:out'] }, { h: 13, t: ['park', 'beach', 'shopping'] }, { h: 16, t: ['bridge', 'beach', 'park'] }, { h: 19, t: ['shopping', 'station:out'] }, { h: 22, t: 'home' }],
  jogger: [{ h: 0, t: 'home' }, { h: 6, t: 'beach' }, { h: 7, t: 'park' }, { h: 8.5, t: 'home' }, { h: 11.8, t: ['cafe:out', 'park'] }, { h: 13, t: 'home' }, { h: 17.5, t: 'park' }, { h: 18.5, t: 'beach' }, { h: 19.5, t: 'home' }],
  dogwalker: [{ h: 0, t: 'home' }, { h: 7, t: 'park' }, { h: 9, t: 'home' }, { h: 11, t: ['park', 'beach'] }, { h: 13, t: 'home' }, { h: 16, t: ['park', 'bridge', 'beach'] }, { h: 18.5, t: 'home' }],
  cyclist: [{ h: 0, t: 'home' }, { h: 8, t: 'roam' }, { h: 11.9, t: ['cafe:out', 'ramen'] }, { h: 13, t: 'roam' }, { h: 18, t: 'home' }],
  gardener: [{ h: 0, t: 'home' }, { h: 7, t: 'park' }, { h: 11, t: 'shrine' }, { h: 12, t: ['cafe:out', 'park'] }, { h: 13, t: 'park' }, { h: 17, t: 'home' }],
  roamer: [{ h: 0, t: 'home' }, { h: 10, t: 'roam' }, { h: 21, t: 'bridge' }, { h: 23, t: 'home' }],
  thrill: [{ h: 0, t: 'home' }, { h: 10, t: 'roam' }, { h: 14, t: ['beach', 'stadium:out'] }, { h: 18, t: 'roam' }, { h: 23, t: 'home' }],
  catlover: [{ h: 0, t: 'home' }, { h: 9, t: ['park', 'shrine'] }, { h: 12, t: ['cafe:out', 'park'] }, { h: 14, t: ['shopping', 'shrine', 'park'] }, { h: 18, t: 'home' }],
  tourist: [{ h: 0, t: 'home' }, { h: 9, t: 'station:out' }, { h: 10, t: 'shrine' }, { h: 11.5, t: ['ramen', 'shopping'] }, { h: 13, t: ['beach', 'park', 'bridge'] }, { h: 16, t: ['shopping', 'stadium:out'] }, { h: 19, t: 'ramen' }, { h: 20.5, t: 'home' }],
};

export interface Resolved {
  place: PlaceId | 'home';
  out: boolean;
  /** Changes whenever the citizen should pick a new destination. */
  key: string;
}

const ROAM_PLACES: PlaceId[] = PLACE_IDS.filter((p) => p !== 'hospital' && p !== 'office' && p !== 'school');

function parse(t: string): { place: PlaceId | 'home'; out: boolean } {
  if (t === 'home') return { place: 'home', out: false };
  const [p, mod] = t.split(':');
  return { place: p as PlaceId, out: mod === 'out' };
}

/** Resolve where a citizen wants to be at a given simulated minute. */
export function resolveSchedule(scheduleId: string, citizenId: number, minute: number): Resolved {
  const sched = SCHEDULES[scheduleId] ?? SCHEDULES.retiree;
  const day = Math.floor(minute / 1440);
  // Stagger departures so the whole town doesn't move on the same tick.
  const offset = Math.floor(hrand(citizenId, 77) * 40) - 10;
  const hour = (((minute - offset) % 1440) + 1440) % 1440 / 60;
  let entryIdx = 0;
  for (let i = 0; i < sched.length; i++) if (sched[i].h <= hour) entryIdx = i;
  const entry = sched[entryIdx];
  const t = entry.t;
  if (t === 'roam') {
    const slot = Math.floor((minute - offset) / 45);
    const p = ROAM_PLACES[Math.floor(hrand(citizenId, slot, 3) * ROAM_PLACES.length)];
    return { place: p, out: true, key: `r${slot}` };
  }
  if (Array.isArray(t)) {
    const pick = t[Math.floor(hrand(citizenId, day, entryIdx, 5) * t.length)];
    return { ...parse(pick), key: `${day}:${entryIdx}` };
  }
  return { ...parse(t), key: `${day}:${entryIdx}` };
}
