import { ACTION_KEYS, CATEGORY_KEYS, GROUP_IDS, PLACE_IDS, WEATHER_KEYS } from '../../shared/types';
import type { Category, DecideContext, DecideRequest, PlaceId, Weather } from '../../shared/types';
import { ARCHETYPE_BY_ID } from '../../shared/archetypes';
import { HttpError } from './http';

export const MAX_TEXT = 140;
export const MAX_CONTEXTS = 1500;

const SOURCES = new Set(['saw', 'heard', 'online', 'announcement']);
const TELLERS = new Set<string>([...GROUP_IDS, 'stranger', 'none']);
const DISTANCES = new Set(['here', 'near', 'far']);
const MOODS = new Set(['calm', 'on_edge', 'cheerful']);

export function cleanText(v: unknown): string {
  if (typeof v !== 'string') throw new HttpError(400, 'text must be a string');
  const t = v.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) throw new HttpError(400, 'text is empty');
  return t.slice(0, MAX_TEXT);
}

export function cleanMinute(v: unknown, fallback = 690): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return ((Math.floor(n) % 1440) + 1440) % 1440;
}

export function cleanWeather(v: unknown): Weather {
  return typeof v === 'string' && (WEATHER_KEYS as readonly string[]).includes(v) ? (v as Weather) : 'none';
}

export function cleanPlace(v: unknown): PlaceId | null {
  return typeof v === 'string' && (PLACE_IDS as readonly string[]).includes(v) ? (v as PlaceId) : null;
}

function cleanCategory(v: unknown): Category {
  if (typeof v === 'string' && (CATEGORY_KEYS as readonly string[]).includes(v)) return v as Category;
  throw new HttpError(400, 'invalid category');
}

function cleanActivity(v: unknown, otherCount: number): string {
  if (v === 'routine') return 'routine';
  if (typeof v !== 'string') throw new HttpError(400, 'invalid activity');
  const [action, idx] = v.split(':');
  const i = Number(idx);
  if (!(ACTION_KEYS as readonly string[]).includes(action) || !Number.isInteger(i) || i < 0 || i >= otherCount) throw new HttpError(400, 'invalid activity');
  return `${action}:${i}`;
}

/** Validates a decide request. Only ids and enums are accepted; no free text except event texts. */
export function parseDecide(body: unknown): DecideRequest {
  const b = body as Partial<DecideRequest>;
  if (!b || typeof b !== 'object' || !b.event || !b.world || !Array.isArray(b.contexts)) throw new HttpError(400, 'invalid request');
  if (b.contexts.length === 0) throw new HttpError(400, 'no contexts');
  if (b.contexts.length > MAX_CONTEXTS) throw new HttpError(413, 'too many contexts');
  const place = cleanPlace(b.event.place);
  if (!place) throw new HttpError(400, 'invalid place');
  const otherRaw = Array.isArray(b.world.otherEvents) ? b.world.otherEvents.slice(0, 2) : [];
  const otherEvents = otherRaw.map(cleanText);
  const seen = new Set<string>();
  const contexts: DecideContext[] = b.contexts.map((c) => {
    const ctx = c as DecideContext;
    if (!ctx || typeof ctx.key !== 'string' || ctx.key.length > 160) throw new HttpError(400, 'invalid key');
    if (seen.has(ctx.key)) throw new HttpError(400, 'duplicate key');
    seen.add(ctx.key);
    if (!ARCHETYPE_BY_ID[ctx.archetypeId]) throw new HttpError(400, 'invalid archetype');
    if (!SOURCES.has(ctx.source) || !TELLERS.has(ctx.tellerGroup) || !DISTANCES.has(ctx.distance) || !MOODS.has(ctx.mood)) throw new HttpError(400, 'invalid context');
    const out: DecideContext = {
      key: ctx.key,
      archetypeId: ctx.archetypeId,
      source: ctx.source,
      tellerGroup: ctx.tellerGroup,
      distance: ctx.distance,
      mood: ctx.mood,
      activity: cleanActivity(ctx.activity, otherEvents.length),
    };
    if (ctx.distanceTiles !== undefined) {
      const d = Number(ctx.distanceTiles);
      if (!Number.isFinite(d) || d < 0 || d > 100) throw new HttpError(400, 'invalid distance');
      out.distanceTiles = Math.round(d);
    }
    return out;
  });
  return {
    event: { text: cleanText(b.event.text), place, category: cleanCategory(b.event.category) },
    world: { minute: cleanMinute(b.world.minute), weather: cleanWeather(b.world.weather), otherEvents },
    contexts,
  };
}
