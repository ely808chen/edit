import { ACTION_KEYS, type ActionKey, type ActionProbs, type Analysis, type GroupId, type Mood, type PlaceId, type Source, type TellerGroup, type Weather } from '../../../shared/types';
import { ACTIONS, type EmoteId } from '../../../shared/actions';
import { ARCHETYPES, GROUPS, type AccessoryId, type Archetype } from '../../../shared/archetypes';
import { hrand } from '../../../shared/hash';
import { bestNeighbor, FieldCache, UNREACHABLE } from './pathing';
import { resolveSchedule } from './schedules';
import { MAP_H, MAP_W, getTownMap, idx, type House, type TownMap } from './townMap';
import { NAMES, type NamePair } from './names';

export const TICK_HZ = 10;
export const TICK_MS = 1000 / TICK_HZ;
export const MINUTES_PER_TICK = 0.1;
export const WAVE_INTERVAL_TICKS = 6;
export const THREAD_TICKS = 5;
export const EVENT_LIFETIME_TICKS = 900;
export const WEATHER_TICKS = 600;
export const MOOD_TICKS = 100;
export const MAX_ACTIVE_EVENTS = 3;
export const MAX_WAVES = 6;
export const WHISPER_MAX_WAVES = 12;
export const SPREAD_RADIUS = 8;
export const SEVERITY_RADIUS = { trivial: 6, notable: 12, big_deal: 20, city_wide: 32 } as const;

const WALK = 0.16;
const SEP_R = 0.36;

export interface WorldConfig {
  seed: number;
  citizenCount: number;
  startMinute: number;
  /** Clear the beach challenge: this many citizens start on the beach and stay there. */
  beachCrowd?: number;
}

export interface Awareness {
  source: Source;
  tellerId: number;
  tellerGroup: TellerGroup;
  wave: number;
  tick: number;
  decided: boolean;
  action: ActionKey | null;
}

export interface DecisionRecord {
  eventIdx: number;
  action: ActionKey;
  probs: ActionProbs;
  wave: number;
  source: Source;
  tellerId: number;
  tellerGroup: TellerGroup;
  latencyMs: number;
  mock: boolean;
  cached: boolean;
  tick: number;
}

export interface Reaction {
  eventIdx: number;
  action: ActionKey;
  start: number;
  tx: number;
  ty: number;
  tile: number;
  phase: number;
  ax: number;
  ay: number;
  dir: number;
}

export interface Citizen {
  id: number;
  name: NamePair;
  archetype: Archetype;
  group: GroupId;
  home: House;
  color: number;
  accessory: AccessoryId;
  speed: number;
  x: number;
  y: number;
  px: number;
  py: number;
  facing: 1 | -1;
  moving: boolean;
  running: boolean;
  inside: boolean;
  routineKey: string;
  routinePlace: PlaceId | 'home';
  tx: number;
  ty: number;
  tTile: number;
  enter: boolean;
  arrived: boolean;
  idleUntil: number;
  override: { place: PlaceId; untilMinute: number } | null;
  reaction: Reaction | null;
  mood: Mood;
  moodUntil: number;
  aware: Map<number, Awareness>;
  pending: number;
  last: DecisionRecord | null;
  emote: EmoteId | null;
  emoteTick: number;
  lookX: number;
  lookY: number;
}

export interface SimEvent {
  idx: number;
  text: string;
  analysis: Analysis;
  releaseTick: number;
  expireTick: number;
  ox: number;
  oy: number;
  radius: number;
  wave: number;
  lastWaveTick: number;
  newly: number[];
  maxWaves: number;
  whisperTarget: number | null;
  telling: Set<number>;
  aware: number;
  decided: number;
  pending: number;
  counts: Record<ActionKey, number>;
  towardCount: number;
  active: boolean;
  lastActivityTick: number;
}

export interface Thread {
  eventIdx: number;
  from: number;
  to: number;
  start: number;
  end: number;
  online: boolean;
}

export interface EventInput {
  type: 'event';
  tick: number;
  eventIdx: number;
  text: string;
  analysis: Analysis;
  whisperTarget: number | null;
}

export interface DecisionInput {
  type: 'decision';
  tick: number;
  eventIdx: number;
  citizenId: number;
  action: ActionKey;
  probsRef: number;
  latencyMs: number;
  mock: boolean;
  cached: boolean;
}

export type Input = EventInput | DecisionInput;

export interface WaveRequest {
  eventIdx: number;
  wave: number;
  citizenIds: number[];
}

const RAMEN_QUEUE: Array<{ x: number; y: number }> = (() => {
  const out: Array<{ x: number; y: number }> = [];
  for (let k = 0; k < 6; k++) out.push({ x: 40.5, y: 8.5 + k * 0.52 });
  for (let k = 0; k < 30; k++) out.push({ x: 39.9 - k * 0.52, y: 11.35 });
  for (let k = 0; k < 30; k++) out.push({ x: 39.6 - k * 0.52, y: 11.85 });
  return out;
})();

function weightedArchetype(u: number): Archetype {
  let total = 0;
  for (const a of ARCHETYPES) total += a.weight;
  let r = u * total;
  for (const a of ARCHETYPES) {
    r -= a.weight;
    if (r < 0) return a;
  }
  return ARCHETYPES[ARCHETYPES.length - 1];
}

function emptyCounts(): Record<ActionKey, number> {
  return Object.fromEntries(ACTION_KEYS.map((k) => [k, 0])) as Record<ActionKey, number>;
}

export class World {
  readonly config: WorldConfig;
  readonly seed: number;
  readonly map: TownMap;
  readonly fields = new FieldCache();
  tick = 0;
  citizens: Citizen[] = [];
  events: SimEvent[] = [];
  threads: Thread[] = [];
  probTable: ActionProbs[] = [];
  log: Input[] = [];
  waveRequests: WaveRequest[] = [];
  /** Emote pops that happened during the last step, for audio. */
  popsThisStep: ActionKey[] = [];
  nextEventIdx = 0;
  private inbox: Input[] = [];
  private scheduled: Map<number, Input[]> | null = null;
  private grid: Int32Array;
  private gridNext: Int32Array;
  private readonly GW = Math.ceil(MAP_W / 2);
  private readonly GH = Math.ceil(MAP_H / 2);
  private eventTileCache = new Map<number, Uint16Array>();

  constructor(config: WorldConfig) {
    this.config = config;
    this.seed = config.seed >>> 0;
    this.map = getTownMap();
    this.grid = new Int32Array(this.GW * this.GH).fill(-1);
    this.gridNext = new Int32Array(config.citizenCount).fill(-1);
    this.createCitizens();
    this.rebuildGrid();
  }

  get minute(): number {
    return this.config.startMinute + this.tick * MINUTES_PER_TICK;
  }

  get activeEvents(): SimEvent[] {
    return this.events.filter((e) => e.active);
  }

  get weather(): Weather {
    let w: Weather = 'none';
    for (const e of this.events) {
      if (e.analysis.weather !== 'none' && this.tick - e.releaseTick < WEATHER_TICKS) w = e.analysis.weather;
    }
    return w;
  }

  weatherAge(): number {
    let age = Infinity;
    for (const e of this.events) {
      if (e.analysis.weather !== 'none' && this.tick - e.releaseTick < WEATHER_TICKS) age = this.tick - e.releaseTick;
    }
    return age;
  }

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------

  private createCitizens() {
    const { houses } = this.map;
    const order = houses.map((h, i) => ({ h, k: hrand(this.seed, i, 101) })).sort((a, b) => a.k - b.k).map((o) => o.h);
    const n = this.config.citizenCount;
    for (let i = 0; i < n; i++) {
      const arch = i < ARCHETYPES.length ? ARCHETYPES[(i * 7 + (this.seed % 32)) % ARCHETYPES.length] : weightedArchetype(hrand(this.seed, i, 11));
      const group = GROUPS[arch.group];
      const home = order[i % order.length];
      const c: Citizen = {
        id: i,
        name: NAMES[Math.floor(hrand(this.seed, i, 13) * NAMES.length)],
        archetype: arch,
        group: arch.group,
        home,
        color: group.colors[Math.floor(hrand(this.seed, i, 17) * group.colors.length)],
        accessory: group.accessory,
        speed: 0.85 + 0.3 * hrand(this.seed, i, 19),
        x: home.door.x + 0.5,
        y: home.door.y + 0.5,
        px: 0,
        py: 0,
        facing: hrand(this.seed, i, 23) < 0.5 ? 1 : -1,
        moving: false,
        running: false,
        inside: true,
        routineKey: '',
        routinePlace: 'home',
        tx: 0,
        ty: 0,
        tTile: -1,
        enter: true,
        arrived: true,
        idleUntil: 0,
        override: null,
        reaction: null,
        mood: 'calm',
        moodUntil: 0,
        aware: new Map(),
        pending: 0,
        last: null,
        emote: null,
        emoteTick: -1000,
        lookX: 0,
        lookY: 0,
      };
      this.citizens.push(c);
    }
    if (this.config.beachCrowd) {
      const ranked = this.citizens.map((c) => ({ c, k: hrand(this.seed, c.id, 29) })).sort((a, b) => a.k - b.k);
      for (let i = 0; i < Math.min(this.config.beachCrowd, ranked.length); i++) {
        ranked[i].c.override = { place: 'beach', untilMinute: this.config.startMinute + 180 };
      }
    }
    for (const c of this.citizens) this.placeInitially(c);
  }

  private placeInitially(c: Citizen) {
    this.planRoutine(c, true);
    const u = hrand(this.seed, c.id, 31);
    if (c.enter) {
      c.x = c.tx;
      c.y = c.ty;
      c.inside = true;
      c.arrived = true;
    } else if (u < 0.2 && !c.override) {
      // Some citizens start mid-journey so the town is moving from the first frame.
      const roads = this.map.places.park.gatherTiles;
      const t = roads[Math.floor(hrand(this.seed, c.id, 37) * roads.length)];
      c.x = t.x + 0.5;
      c.y = t.y + 0.5;
      c.inside = false;
      c.arrived = false;
      this.startMidJourney(c);
    } else {
      c.x = c.tx;
      c.y = c.ty;
      c.inside = false;
      c.arrived = true;
      c.idleUntil = Math.floor(hrand(this.seed, c.id, 41) * 60);
    }
    c.px = c.x;
    c.py = c.y;
  }

  private startMidJourney(c: Citizen) {
    const walk = this.map.walkable;
    for (let k = 0; k < 20; k++) {
      const x = Math.floor(hrand(this.seed, c.id, 43, k) * MAP_W);
      const y = Math.floor(hrand(this.seed, c.id, 47, k) * MAP_H);
      if (walk[idx(x, y)] && this.fields.get(c.tTile)[idx(x, y)] !== UNREACHABLE) {
        c.x = x + 0.5;
        c.y = y + 0.5;
        return;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Inputs
  // ---------------------------------------------------------------------------

  registerProbs(p: ActionProbs): number {
    this.probTable.push(p);
    return this.probTable.length - 1;
  }

  queueEvent(text: string, analysis: Analysis, whisperTarget: number | null = null): number {
    const eventIdx = this.nextEventIdx++;
    this.inbox.push({ type: 'event', tick: -1, eventIdx, text, analysis, whisperTarget });
    return eventIdx;
  }

  queueDecision(d: Omit<DecisionInput, 'type' | 'tick'>) {
    this.inbox.push({ type: 'decision', tick: -1, ...d });
  }

  /** Replay mode: inputs are injected at their recorded ticks instead of the inbox. */
  loadReplay(inputs: Input[], probTable: ActionProbs[]) {
    this.scheduled = new Map();
    this.probTable = probTable.slice();
    for (const inp of inputs) {
      const list = this.scheduled.get(inp.tick) ?? [];
      list.push(inp);
      this.scheduled.set(inp.tick, list);
      if (inp.type === 'event') this.nextEventIdx = Math.max(this.nextEventIdx, inp.eventIdx + 1);
    }
  }

  get isReplay(): boolean {
    return this.scheduled !== null;
  }

  // ---------------------------------------------------------------------------
  // Step
  // ---------------------------------------------------------------------------

  step() {
    this.tick++;
    this.popsThisStep.length = 0;
    const t = this.tick;
    let inputs: Input[];
    if (this.scheduled) {
      inputs = this.scheduled.get(t) ?? [];
    } else {
      inputs = this.inbox;
      this.inbox = [];
      for (const inp of inputs) inp.tick = t;
      this.log.push(...inputs);
    }
    const evs = inputs.filter((i): i is EventInput => i.type === 'event').sort((a, b) => a.eventIdx - b.eventIdx);
    const decs = inputs
      .filter((i): i is DecisionInput => i.type === 'decision')
      .sort((a, b) => a.eventIdx - b.eventIdx || a.citizenId - b.citizenId);
    for (const e of evs) this.releaseEvent(e);
    for (const d of decs) this.applyDecision(d);

    this.processThreads();
    this.dispatchWaves();
    this.expireEvents();

    for (const c of this.citizens) {
      c.px = c.x;
      c.py = c.y;
      if (c.moodUntil && t >= c.moodUntil) {
        c.mood = 'calm';
        c.moodUntil = 0;
      }
      this.updateCitizen(c);
    }
    this.separate();
    this.rebuildGrid();
  }

  // ---------------------------------------------------------------------------
  // Events and awareness
  // ---------------------------------------------------------------------------

  private releaseEvent(inp: EventInput) {
    const place = this.map.places[inp.analysis.place];
    const whisper = inp.whisperTarget !== null && inp.whisperTarget >= 0 && inp.whisperTarget < this.citizens.length;
    const ev: SimEvent = {
      idx: inp.eventIdx,
      text: inp.text,
      analysis: inp.analysis,
      releaseTick: this.tick,
      expireTick: this.tick + EVENT_LIFETIME_TICKS,
      ox: place.center.x,
      oy: place.center.y,
      radius: SEVERITY_RADIUS[inp.analysis.severity],
      wave: -1,
      lastWaveTick: -1000,
      newly: [],
      maxWaves: whisper ? WHISPER_MAX_WAVES : MAX_WAVES,
      whisperTarget: whisper ? inp.whisperTarget : null,
      telling: new Set(),
      aware: 0,
      decided: 0,
      pending: 0,
      counts: emptyCounts(),
      towardCount: 0,
      active: true,
      lastActivityTick: this.tick,
    };
    this.events[ev.idx] = ev;
    const active = this.events.filter((e) => e && e.active && e !== ev).sort((a, b) => a.releaseTick - b.releaseTick || a.idx - b.idx);
    while (active.length >= MAX_ACTIVE_EVENTS) this.endEvent(active.shift()!);

    if (whisper) {
      this.makeAware(this.citizens[inp.whisperTarget!], ev, 'heard', -1, 'stranger');
    } else if (inp.analysis.broadcast) {
      for (const c of this.citizens) this.makeAware(c, ev, 'announcement', -1, 'none');
    } else {
      const r2 = ev.radius * ev.radius;
      for (const c of this.citizens) {
        const dx = c.x - ev.ox;
        const dy = c.y - ev.oy;
        if (dx * dx + dy * dy <= r2) this.makeAware(c, ev, 'saw', -1, 'none');
      }
    }
    this.dispatchWave(ev);
  }

  private makeAware(c: Citizen, ev: SimEvent, source: Source, tellerId: number, tellerGroup: TellerGroup) {
    if (c.aware.has(ev.idx)) return;
    c.aware.set(ev.idx, { source, tellerId, tellerGroup, wave: -1, tick: this.tick, decided: false, action: null });
    ev.aware++;
    ev.newly.push(c.id);
    ev.lastActivityTick = this.tick;
    c.lookX = ev.ox;
    c.lookY = ev.oy;
  }

  private dispatchWaves() {
    for (const ev of this.events) {
      if (!ev || !ev.active || ev.newly.length === 0) continue;
      if (this.tick - ev.lastWaveTick < WAVE_INTERVAL_TICKS) continue;
      if (ev.wave >= ev.maxWaves - 1) continue;
      this.dispatchWave(ev);
    }
  }

  private dispatchWave(ev: SimEvent) {
    if (ev.newly.length === 0) return;
    ev.wave++;
    ev.lastWaveTick = this.tick;
    const ids = ev.newly.slice();
    ev.newly = [];
    const d2 = (id: number) => {
      const c = this.citizens[id];
      return (c.x - ev.ox) ** 2 + (c.y - ev.oy) ** 2;
    };
    ids.sort((a, b) => d2(a) - d2(b) || a - b);
    for (const id of ids) {
      const aw = this.citizens[id].aware.get(ev.idx)!;
      aw.wave = ev.wave;
      this.citizens[id].pending++;
      ev.pending++;
    }
    this.waveRequests.push({ eventIdx: ev.idx, wave: ev.wave, citizenIds: ids });
  }

  private processThreads() {
    if (this.threads.length === 0) return;
    const keep: Thread[] = [];
    for (const th of this.threads) {
      if (th.end <= this.tick) {
        const ev = this.events[th.eventIdx];
        ev.telling.delete(th.to);
        if (ev.active) {
          const teller = this.citizens[th.from];
          this.makeAware(this.citizens[th.to], ev, th.online ? 'online' : 'heard', th.from, teller.group);
        }
        if (this.tick - th.end < 8) keep.push(th);
      } else {
        keep.push(th);
      }
    }
    this.threads = keep;
  }

  private expireEvents() {
    for (const ev of this.events) {
      if (ev && ev.active && this.tick >= ev.expireTick) this.endEvent(ev);
    }
  }

  private endEvent(ev: SimEvent) {
    ev.active = false;
    ev.newly = [];
    for (const c of this.citizens) {
      if (c.reaction && c.reaction.eventIdx === ev.idx) {
        c.reaction = null;
        c.routineKey = '';
      }
      const aw = c.aware.get(ev.idx);
      if (aw && !aw.decided && aw.wave >= 0) {
        c.pending = Math.max(0, c.pending - 1);
        aw.decided = true;
      }
    }
    ev.pending = 0;
  }

  private applyDecision(d: DecisionInput) {
    const c = this.citizens[d.citizenId];
    const ev = this.events[d.eventIdx];
    if (!c || !ev) return;
    let aw = c.aware.get(ev.idx);
    if (!aw) {
      aw = { source: 'heard', tellerId: -1, tellerGroup: 'stranger', wave: ev.wave, tick: this.tick, decided: false, action: null };
      c.aware.set(ev.idx, aw);
      ev.aware++;
    }
    if (aw.decided && aw.action) return;
    const wasPending = !aw.decided;
    aw.decided = true;
    aw.action = d.action;
    if (wasPending) {
      c.pending = Math.max(0, c.pending - 1);
      ev.pending = Math.max(0, ev.pending - 1);
    }
    ev.decided++;
    ev.counts[d.action]++;
    ev.lastActivityTick = this.tick;
    c.last = {
      eventIdx: ev.idx,
      action: d.action,
      probs: this.probTable[d.probsRef] ?? this.probTable[0],
      wave: aw.wave,
      source: aw.source,
      tellerId: aw.tellerId,
      tellerGroup: aw.tellerGroup,
      latencyMs: d.latencyMs,
      mock: d.mock,
      cached: d.cached,
      tick: this.tick,
    };
    if (!ev.active) return;

    const meta = ACTIONS[d.action];
    this.setEmote(c, meta.emote);
    this.popsThisStep.push(d.action);
    if (d.action === 'flee' || d.action === 'panic' || d.action === 'complain') {
      c.mood = 'on_edge';
      c.moodUntil = this.tick + MOOD_TICKS;
    } else if (d.action === 'celebrate') {
      c.mood = 'cheerful';
      c.moodUntil = this.tick + MOOD_TICKS;
    }

    const keepCurrent = d.action === 'ignore' && c.reaction && c.reaction.eventIdx !== ev.idx && this.events[c.reaction.eventIdx]?.active;
    if (!keepCurrent) this.startReaction(c, ev, d.action);

    if (meta.spreads && aw.wave < ev.maxWaves - 1) this.spread(c, ev, meta.spreads);
  }

  private setEmote(c: Citizen, e: EmoteId) {
    c.emote = e;
    c.emoteTick = this.tick;
  }

  private spread(c: Citizen, ev: SimEvent, spec: NonNullable<(typeof ACTIONS)[ActionKey]['spreads']>) {
    if (spec.mode === 'online') {
      for (let k = 0; k < 24; k++) {
        const j = Math.floor(hrand(this.seed, this.tick, c.id * 31 + k, 19) * this.citizens.length);
        const o = this.citizens[j];
        if (o.id !== c.id && !o.aware.has(ev.idx) && !ev.telling.has(o.id)) {
          this.addThread(ev, c, o, true);
          return;
        }
      }
      return;
    }
    const n = spec.min + Math.floor(hrand(this.seed, this.tick, c.id, 17) * (spec.max - spec.min + 1));
    const found = this.nearestUnaware(c, ev, n, SPREAD_RADIUS);
    for (const o of found) this.addThread(ev, c, o, false);
  }

  private addThread(ev: SimEvent, from: Citizen, to: Citizen, online: boolean) {
    ev.telling.add(to.id);
    this.threads.push({ eventIdx: ev.idx, from: from.id, to: to.id, start: this.tick, end: this.tick + THREAD_TICKS, online });
  }

  private nearestUnaware(c: Citizen, ev: SimEvent, n: number, radius: number): Citizen[] {
    const out: Array<{ o: Citizen; d: number }> = [];
    const cx = Math.floor(c.x / 2);
    const cy = Math.floor(c.y / 2);
    const cr = Math.ceil(radius / 2);
    const r2 = radius * radius;
    for (let gy = Math.max(0, cy - cr); gy <= Math.min(this.GH - 1, cy + cr); gy++) {
      for (let gx = Math.max(0, cx - cr); gx <= Math.min(this.GW - 1, cx + cr); gx++) {
        for (let j = this.grid[gy * this.GW + gx]; j !== -1; j = this.gridNext[j]) {
          const o = this.citizens[j];
          if (o.id === c.id || o.inside || o.aware.has(ev.idx) || ev.telling.has(o.id)) continue;
          const d = (o.x - c.x) ** 2 + (o.y - c.y) ** 2;
          if (d <= r2) out.push({ o, d });
        }
      }
    }
    out.sort((a, b) => a.d - b.d || a.o.id - b.o.id);
    return out.slice(0, n).map((e) => e.o);
  }

  // ---------------------------------------------------------------------------
  // Reactions
  // ---------------------------------------------------------------------------

  private startReaction(c: Citizen, ev: SimEvent, action: ActionKey) {
    const meta = ACTIONS[action];
    const r: Reaction = { eventIdx: ev.idx, action, start: this.tick, tx: c.x, ty: c.y, tile: -1, phase: 0, ax: c.x, ay: c.y, dir: hrand(this.seed, c.id, ev.idx) < 0.5 ? 1 : -1 };
    const place = this.map.places[ev.analysis.place];
    switch (meta.movement) {
      case 'toward':
      case 'toward_brisk':
      case 'toward_run': {
        ev.towardCount++;
        // Crowds stop at the edge of a danger zone, like onlookers at police tape.
        const tiles = ev.analysis.category === 'danger' ? this.cordonTiles(ev) : place.gatherTiles;
        const span = Math.min(tiles.length, 6 + Math.floor(ev.towardCount / 3.2));
        const t = tiles[Math.floor(hrand(this.seed, c.id, ev.idx, 53) * span)];
        r.tx = t.x + 0.2 + 0.6 * hrand(this.seed, c.id, 59);
        r.ty = t.y + 0.2 + 0.6 * hrand(this.seed, c.id, 61);
        r.tile = idx(t.x, t.y);
        break;
      }
      case 'circle': {
        if (ev.analysis.category === 'danger') {
          const tiles = this.cordonTiles(ev);
          const t = tiles[Math.floor(hrand(this.seed, c.id, ev.idx, 57) * Math.min(tiles.length, 40))];
          r.tx = t.x + 0.5;
          r.ty = t.y + 0.5;
          r.tile = idx(t.x, t.y);
          r.phase = 2;
          break;
        }
        const dx = c.x - ev.ox;
        const dy = c.y - ev.oy;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        let tx = ev.ox + (dx / d) * 3;
        let ty = ev.oy + (dy / d) * 3;
        let ti = this.walkableTileNear(tx, ty);
        if (ti < 0) {
          const t = place.gatherTiles[Math.min(place.gatherTiles.length - 1, 8 + Math.floor(hrand(this.seed, c.id, 67) * 20))];
          ti = idx(t.x, t.y);
          tx = t.x + 0.5;
          ty = t.y + 0.5;
        }
        r.tx = tx;
        r.ty = ty;
        r.tile = ti;
        break;
      }
      case 'home':
        r.tx = c.home.door.x + 0.5;
        r.ty = c.home.door.y + 0.5;
        r.tile = idx(c.home.door.x, c.home.door.y);
        break;
      case 'stay':
      case 'jitter': {
        if (c.inside) this.exitBuilding(c);
        r.ax = c.x;
        r.ay = c.y;
        const out = this.retreatTile(c);
        if (out >= 0) {
          r.tile = out;
          r.tx = (out % MAP_W) + 0.5;
          r.ty = Math.floor(out / MAP_W) + 0.5;
          r.phase = 0;
        } else {
          r.phase = 1;
        }
        break;
      }
      case 'away':
        if (c.inside) this.exitBuilding(c);
        break;
      case 'routine':
        break;
    }
    if (meta.movement === 'toward' || meta.movement === 'toward_brisk' || meta.movement === 'toward_run' || meta.movement === 'circle') {
      if (c.inside) this.exitBuilding(c);
    }
    c.reaction = meta.movement === 'routine' ? null : r;
    c.lookX = ev.ox;
    c.lookY = ev.oy;
  }

  private cordonCache = new Map<number, Array<{ x: number; y: number }>>();

  /** Walkable tiles just outside a danger event's place, nearest to the event first. */
  private cordonTiles(ev: SimEvent) {
    let list = this.cordonCache.get(ev.idx);
    if (!list) {
      const place = this.map.places[ev.analysis.place];
      list = place.gatherTiles.filter((t) => !this.nearMask(place.placeMask, t.x, t.y, 1));
      if (list.length < 10) list = place.gatherTiles;
      this.cordonCache.set(ev.idx, list);
    }
    return list;
  }

  private nearMask(mask: Uint8Array, x: number, y: number, r: number): boolean {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < MAP_W && ny < MAP_H && mask[idx(nx, ny)]) return true;
      }
    }
    return false;
  }

  /** Where to step to if the citizen is standing inside the place of any active danger event. */
  private retreatTile(c: Citizen): number {
    for (const e of this.events) {
      if (!e || !e.active || e.analysis.category !== 'danger') continue;
      const t = this.tileOutside(c, this.map.places[e.analysis.place].placeMask, e);
      if (t >= 0) return t;
    }
    return -1;
  }

  /** Nearest walkable tile outside a place and at least 4 tiles from the event, if the citizen is inside it. */
  private tileOutside(c: Citizen, mask: Uint8Array, ev: SimEvent): number {
    const cx = Math.floor(c.x);
    const cy = Math.floor(c.y);
    if (!mask[idx(cx, cy)]) return -1;
    let best = -1;
    let bestD = Infinity;
    for (let dy = -12; dy <= 12; dy++) {
      for (let dx = -12; dx <= 12; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
        const i = idx(x, y);
        if (!this.map.walkable[i] || this.nearMask(mask, x, y, 2)) continue;
        if ((x + 0.5 - ev.ox) ** 2 + (y + 0.5 - ev.oy) ** 2 < 16) continue;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
    }
    return best;
  }

  private walkableTileNear(x: number, y: number): number {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    for (let r = 0; r <= 2; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = tx + dx;
          const ny = ty + dy;
          if (nx >= 0 && ny >= 0 && nx < MAP_W && ny < MAP_H && this.map.walkable[idx(nx, ny)]) return idx(nx, ny);
        }
      }
    }
    return -1;
  }

  private exitBuilding(c: Citizen) {
    c.inside = false;
    c.arrived = false;
  }

  private eventField(ev: SimEvent): Uint16Array {
    let f = this.eventTileCache.get(ev.idx);
    if (!f) {
      const ti = this.walkableTileNear(ev.ox, ev.oy);
      f = this.fields.get(ti >= 0 ? ti : idx(Math.floor(ev.ox), Math.floor(ev.oy)));
      this.eventTileCache.set(ev.idx, f);
    }
    return f;
  }

  // ---------------------------------------------------------------------------
  // Citizen update
  // ---------------------------------------------------------------------------

  private updateCitizen(c: Citizen) {
    c.moving = false;
    c.running = false;
    const r = c.reaction;
    if (r) {
      this.updateReaction(c, r);
    } else {
      this.updateRoutine(c);
    }
    if (c.reaction && this.tick - c.emoteTick > 70 + (c.id % 50) && c.reaction.action !== 'ignore') {
      this.setEmote(c, ACTIONS[c.reaction.action].emote);
    }
  }

  private updateReaction(c: Citizen, r: Reaction) {
    const ev = this.events[r.eventIdx];
    const meta = ACTIONS[r.action];
    const age = this.tick - r.start;
    switch (meta.movement) {
      case 'toward':
      case 'toward_brisk':
      case 'toward_run': {
        const sp = WALK * c.speed * (meta.movement === 'toward_run' ? 2.2 : meta.movement === 'toward_brisk' ? 1.5 : 1);
        if (!c.arrived) {
          if (this.moveToward(c, r.tx, r.ty, r.tile, sp)) {
            c.arrived = true;
            c.idleUntil = this.tick + 40 + Math.floor(hrand(this.seed, c.id, this.tick) * 60);
          }
          c.running = meta.movement === 'toward_run';
        } else {
          this.faceToward(c, ev.ox);
          if (this.tick >= c.idleUntil) {
            // Shuffle a little within the crowd.
            r.tx = Math.floor(r.tx) + 0.2 + 0.6 * hrand(this.seed, c.id, this.tick, 71);
            r.ty = Math.floor(r.ty) + 0.2 + 0.6 * hrand(this.seed, c.id, this.tick, 73);
            c.arrived = false;
          }
        }
        break;
      }
      case 'circle': {
        const sp = WALK * c.speed;
        if (r.phase === 2) {
          if (!c.arrived && this.moveToward(c, r.tx, r.ty, r.tile, sp)) c.arrived = true;
          this.faceToward(c, ev.ox);
          break;
        }
        if (r.phase === 0) {
          if (this.moveToward(c, r.tx, r.ty, r.tile, sp)) r.phase = 1;
        } else {
          const dx = c.x - ev.ox;
          const dy = c.y - ev.oy;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = dx / d;
          const ny = dy / d;
          const s = sp * 0.35;
          const radial = (3 - d) * 0.08;
          const mx = -ny * s * r.dir + nx * radial;
          const my = nx * s * r.dir + ny * radial;
          if (!this.tryMove(c, mx, my)) r.dir = -r.dir as 1 | -1;
          this.faceToward(c, ev.ox);
        }
        break;
      }
      case 'home': {
        if (c.inside) break;
        const nearDoor = Math.abs(c.x - r.tx) < 0.75 && Math.abs(c.y - r.ty) < 0.75;
        if (nearDoor || this.moveToward(c, r.tx, r.ty, r.tile, WALK * c.speed * 1.2)) {
          c.inside = true;
          c.x = r.tx;
          c.y = r.ty;
        }
        break;
      }
      case 'stay': {
        if (r.phase === 0) {
          if (this.moveToward(c, r.tx, r.ty, r.tile, WALK * c.speed * 1.5)) {
            r.phase = 1;
            r.ax = c.x;
            r.ay = c.y;
          }
          c.running = true;
          break;
        }
        if (r.action === 'celebrate' || r.action === 'complain' || r.action === 'film_it') this.faceToward(c, ev.ox);
        break;
      }
      case 'away': {
        if (age >= 40) {
          // After the first dash, fleeing citizens make for the safety of home.
          if (c.inside) break;
          const hx = c.home.door.x + 0.5;
          const hy = c.home.door.y + 0.5;
          const near = Math.abs(c.x - hx) < 0.75 && Math.abs(c.y - hy) < 0.75;
          if (near || this.moveToward(c, hx, hy, idx(c.home.door.x, c.home.door.y), WALK * c.speed * 1.6)) {
            c.inside = true;
            c.x = hx;
            c.y = hy;
          }
          c.running = true;
          break;
        }
        {
          const f = this.eventField(ev);
          const cx = Math.floor(c.x);
          const cy = Math.floor(c.y);
          const here = f[idx(cx, cy)];
          if (here !== UNREACHABLE && here > 230) break;
          const n = bestNeighbor(f, cx, cy, true);
          if (n >= 0) {
            const tx = (n % MAP_W) + 0.5;
            const ty = Math.floor(n / MAP_W) + 0.5;
            this.stepTo(c, tx, ty, WALK * c.speed * 2.2);
            c.running = true;
          }
        }
        break;
      }
      case 'jitter': {
        if (r.phase === 0) {
          if (this.moveToward(c, r.tx, r.ty, r.tile, WALK * c.speed * 1.8)) {
            r.phase = 1;
            r.ax = c.x;
            r.ay = c.y;
          }
          c.running = true;
          break;
        }
        const sp = WALK * c.speed * 1.3;
        const slot = Math.floor(this.tick / 4);
        let ang = hrand(this.seed, c.id, slot, 79);
        const dx = c.x - r.ax;
        const dy = c.y - r.ay;
        let mx: number;
        let my: number;
        if (dx * dx + dy * dy > 2.25) {
          const d = Math.sqrt(dx * dx + dy * dy);
          mx = (-dx / d) * sp;
          my = (-dy / d) * sp;
        } else {
          // Axis-aligned zigzag avoids trig, keeping replays bit-identical across engines.
          ang = Math.floor(ang * 8);
          const dirs = [[1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7], [0, -1], [0.7, -0.7]];
          mx = dirs[ang][0] * sp;
          my = dirs[ang][1] * sp;
        }
        this.tryMove(c, mx, my);
        c.running = true;
        break;
      }
      case 'routine':
        this.updateRoutine(c);
        break;
    }
  }

  private faceToward(c: Citizen, x: number) {
    if (Math.abs(x - c.x) > 0.3) c.facing = x > c.x ? 1 : -1;
  }

  private updateRoutine(c: Citizen) {
    if ((this.tick + c.id) % 10 === 0 || c.routineKey === '') this.planRoutine(c, false);
    if (c.inside) return;
    if (!c.arrived) {
      const nearDoor = c.enter && Math.abs(c.x - c.tx) < 0.75 && Math.abs(c.y - c.ty) < 0.75;
      if (nearDoor || this.moveToward(c, c.tx, c.ty, c.tTile, WALK * c.speed)) {
        c.arrived = true;
        if (c.enter) {
          c.inside = true;
          c.x = c.tx;
          c.y = c.ty;
        }
        c.idleUntil = this.tick + 30 + Math.floor(hrand(this.seed, c.id, this.tick, 83) * 70);
      }
      return;
    }
    if (!c.enter && this.tick >= c.idleUntil) this.pickIdleSpot(c);
  }

  private planRoutine(c: Citizen, initial: boolean) {
    let res = resolveSchedule(c.archetype.schedule, c.id, this.minute);
    if (c.override && this.minute < c.override.untilMinute) res = { place: c.override.place, out: true, key: 'override' };
    else if (this.config.beachCrowd && res.place === 'beach') res = { ...res, place: 'park' };
    if (res.key === c.routineKey && !initial) return;
    c.routineKey = res.key;
    c.routinePlace = res.place;
    const wasInside = c.inside;
    if (res.place === 'home') {
      c.tx = c.home.door.x + 0.5;
      c.ty = c.home.door.y + 0.5;
      c.tTile = idx(c.home.door.x, c.home.door.y);
      c.enter = true;
    } else {
      const p = this.map.places[res.place];
      const linger = res.out || !p.interior || hrand(this.seed, c.id, 89) < 0.15;
      if (res.place === 'ramen') {
        // A queue snakes from the counter down toward the shopping street.
        const k = Math.floor(hrand(this.seed, c.id, Math.floor(this.minute / 30), 91) * RAMEN_QUEUE.length);
        const q = RAMEN_QUEUE[k];
        c.tx = q.x;
        c.ty = q.y;
        c.tTile = idx(Math.floor(q.x), Math.floor(q.y));
        c.enter = false;
      } else if (linger && p.areaTiles.length) {
        const t = this.idleTile(p, hrand(this.seed, c.id, this.tick, 97));
        c.tx = t.x + 0.2 + 0.6 * hrand(this.seed, c.id, 101);
        c.ty = t.y + 0.2 + 0.6 * hrand(this.seed, c.id, 103);
        c.tTile = idx(t.x, t.y);
        c.enter = false;
      } else {
        c.tx = p.entrance.x + 0.5;
        c.ty = p.entrance.y + 0.5;
        c.tTile = idx(p.entrance.x, p.entrance.y);
        c.enter = true;
      }
    }
    const atTarget = Math.abs(c.x - c.tx) < 0.2 && Math.abs(c.y - c.ty) < 0.2;
    if (wasInside && !(atTarget && c.enter)) c.inside = false;
    c.arrived = atTarget && c.enter && wasInside;
  }

  /** Big places use their own tiles; small ones spill into the surroundings so crowds don't pile up. */
  private idleTile(p: TownMap['places'][PlaceId], u: number) {
    if (p.areaTiles.length >= 44) return p.areaTiles[Math.floor(u * p.areaTiles.length)];
    return p.gatherTiles[Math.floor(u * Math.min(p.gatherTiles.length, 44))];
  }

  private pickIdleSpot(c: Citizen) {
    const place = c.routinePlace === 'home' ? null : this.map.places[c.routinePlace];
    if (place?.id === 'ramen') {
      c.idleUntil = this.tick + 60;
      return;
    }
    c.idleUntil = this.tick + 40 + Math.floor(hrand(this.seed, c.id, this.tick, 107) * 90);
    if (!place || place.areaTiles.length === 0) return;
    if (place.id === 'park' && hrand(this.seed, c.id, this.tick, 109) < 0.2) {
      const b = this.map.benches[Math.floor(hrand(this.seed, c.id, this.tick, 113) * this.map.benches.length)];
      c.tx = b.x + (hrand(this.seed, c.id, this.tick, 127) - 0.5) * 0.8;
      c.ty = b.y;
      c.tTile = idx(Math.floor(c.tx), Math.floor(c.ty));
      if (!this.map.walkable[c.tTile]) return;
      c.arrived = false;
      return;
    }
    for (let k = 0; k < 4; k++) {
      const t = this.idleTile(place, hrand(this.seed, c.id, this.tick * 7 + k, 131));
      const dx = t.x + 0.5 - c.x;
      const dy = t.y + 0.5 - c.y;
      if (dx * dx + dy * dy < 16) {
        c.tx = t.x + 0.2 + 0.6 * hrand(this.seed, c.id, this.tick, 137);
        c.ty = t.y + 0.2 + 0.6 * hrand(this.seed, c.id, this.tick, 139);
        c.tTile = idx(t.x, t.y);
        c.arrived = false;
        return;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Movement
  // ---------------------------------------------------------------------------

  /** Moves toward a target using the flow field. Returns true on arrival. */
  private moveToward(c: Citizen, tx: number, ty: number, tile: number, speed: number): boolean {
    const dx = tx - c.x;
    const dy = ty - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= speed) {
      if (this.tryMove(c, dx, dy)) {
        c.moving = dist > 0.01;
        return true;
      }
      return dist < 0.6;
    }
    const cx = Math.floor(c.x);
    const cy = Math.floor(c.y);
    const ci = idx(cx, cy);
    let ax = tx;
    let ay = ty;
    if (ci !== tile && dist > 1.4 && tile >= 0) {
      const field = this.fields.get(tile);
      const n1 = bestNeighbor(field, cx, cy);
      if (n1 >= 0) {
        const n1x = n1 % MAP_W;
        const n1y = (n1 - n1x) / MAP_W;
        const n2 = n1 === tile ? -1 : bestNeighbor(field, n1x, n1y);
        if (n2 >= 0) {
          const n2x = n2 % MAP_W;
          const n2y = (n2 - n2x) / MAP_W;
          ax = (n1x + n2x) / 2 + 0.5;
          ay = (n1y + n2y) / 2 + 0.5;
        } else {
          ax = n1x + 0.5;
          ay = n1y + 0.5;
        }
      }
    }
    this.stepTo(c, ax, ay, speed);
    return false;
  }

  private stepTo(c: Citizen, ax: number, ay: number, speed: number) {
    const dx = ax - c.x;
    const dy = ay - c.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1e-6) return;
    const s = Math.min(speed, d);
    this.tryMove(c, (dx / d) * s, (dy / d) * s);
  }

  private tryMove(c: Citizen, mx: number, my: number): boolean {
    const w = this.map.walkable;
    const ok = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
      return w[idx(Math.floor(x), Math.floor(y))] === 1;
    };
    const hereOk = ok(c.x, c.y);
    let moved = false;
    if (ok(c.x + mx, c.y + my) || !hereOk) {
      c.x += mx;
      c.y += my;
      moved = true;
    } else if (ok(c.x + mx, c.y)) {
      c.x += mx;
      moved = true;
    } else if (ok(c.x, c.y + my)) {
      c.y += my;
      moved = true;
    }
    c.x = Math.min(MAP_W - 0.05, Math.max(0.05, c.x));
    c.y = Math.min(MAP_H - 0.05, Math.max(0.05, c.y));
    if (moved) {
      if (Math.abs(mx) > 0.004) c.facing = mx > 0 ? 1 : -1;
      c.moving = mx * mx + my * my > 0.0001;
    }
    return moved;
  }

  private rebuildGrid() {
    this.grid.fill(-1);
    for (let i = this.citizens.length - 1; i >= 0; i--) {
      const c = this.citizens[i];
      const g = Math.min(this.GH - 1, Math.floor(c.y / 2)) * this.GW + Math.min(this.GW - 1, Math.floor(c.x / 2));
      this.gridNext[i] = this.grid[g];
      this.grid[g] = i;
    }
  }

  private pushX = new Float64Array(0);
  private pushY = new Float64Array(0);

  private separate() {
    const n = this.citizens.length;
    if (this.pushX.length !== n) {
      this.pushX = new Float64Array(n);
      this.pushY = new Float64Array(n);
    }
    this.pushX.fill(0);
    this.pushY.fill(0);
    this.rebuildGrid();
    const r2 = SEP_R * SEP_R;
    for (let i = 0; i < n; i++) {
      const a = this.citizens[i];
      if (a.inside) continue;
      const gx = Math.floor(a.x / 2);
      const gy = Math.floor(a.y / 2);
      for (let yy = Math.max(0, gy - 1); yy <= Math.min(this.GH - 1, gy + 1); yy++) {
        for (let xx = Math.max(0, gx - 1); xx <= Math.min(this.GW - 1, gx + 1); xx++) {
          for (let j = this.grid[yy * this.GW + xx]; j !== -1; j = this.gridNext[j]) {
            if (j <= i) continue;
            const b = this.citizens[j];
            if (b.inside) continue;
            let dx = b.x - a.x;
            let dy = (b.y - a.y) * 1.4;
            let d2 = dx * dx + dy * dy;
            if (d2 >= r2) continue;
            if (d2 < 1e-8) {
              dx = hrand(i, j, 1) - 0.5;
              dy = hrand(i, j, 2) - 0.5;
              d2 = dx * dx + dy * dy + 1e-8;
            }
            const d = Math.sqrt(d2);
            const push = ((SEP_R - d) / SEP_R) * 0.06;
            const ux = (dx / d) * push;
            const uy = (dy / d) * push;
            this.pushX[i] -= ux;
            this.pushY[i] -= uy;
            this.pushX[j] += ux;
            this.pushY[j] += uy;
          }
        }
      }
    }
    for (let i = 0; i < n; i++) {
      const px = this.pushX[i];
      const py = this.pushY[i];
      if (px === 0 && py === 0) continue;
      const c = this.citizens[i];
      const f = c.facing;
      const mv = c.moving;
      this.tryMove(c, Math.max(-0.08, Math.min(0.08, px)), Math.max(-0.08, Math.min(0.08, py)));
      c.facing = f;
      c.moving = mv;
    }
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  countNear(x: number, y: number, r: number): number {
    let n = 0;
    const r2 = r * r;
    for (const c of this.citizens) {
      if (c.inside) continue;
      if ((c.x - x) ** 2 + (c.y - y) ** 2 <= r2) n++;
    }
    return n;
  }

  countInPlace(place: PlaceId): number {
    const mask = this.map.places[place].placeMask;
    let n = 0;
    for (const c of this.citizens) {
      if (c.inside) continue;
      if (mask[idx(Math.floor(c.x), Math.floor(c.y))]) n++;
    }
    return n;
  }

  /** Current action of a citizen for any active event (latest decision wins). */
  currentAction(c: Citizen): ActionKey | null {
    if (!c.last) return null;
    const ev = this.events[c.last.eventIdx];
    if (!ev || !ev.active) return null;
    return c.last.action;
  }

  /** Is the event's ripple finished (no pending decisions, no threads, no queued waves)? */
  isSettled(ev: SimEvent): boolean {
    if (!ev.active) return true;
    if (ev.pending > 0 || ev.newly.length > 0 || ev.telling.size > 0) return false;
    return this.tick - ev.lastActivityTick > 12;
  }

  distanceTo(c: Citizen, ev: SimEvent): number {
    return Math.sqrt((c.x - ev.ox) ** 2 + (c.y - ev.oy) ** 2);
  }
}
