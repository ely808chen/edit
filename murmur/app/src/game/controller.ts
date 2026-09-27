import { ACTION_KEYS, GROUP_IDS, type ActionKey, type ActionProbs, type Analysis, type GroupId, type PreviewResponse } from '../../../shared/types';
import { emptyProbs, topAction } from '../../../shared/actions';
import { GROUPS } from '../../../shared/archetypes';
import { mockDecideContext } from '../../../shared/mock';
import { buildHeadline } from '../../../shared/headlines';
import { normalizeEventText } from '../../../shared/hash';
import { clockString } from '../../../shared/time';
import * as api from '../api/client';
import { synth } from '../audio/synth';
import { buildWaveContexts, decideCacheKey, sampleFor } from '../engine/decisions';
import { buildReplay, isReplayPayload, replayInputs, type ReplayPayload } from '../engine/replay';
import { MAX_ACTIVE_EVENTS, TICK_MS, World, type WaveRequest, type WorldConfig } from '../engine/world';
import { lighting } from '../render/lighting';
import { TILE } from '../render/palette';
import { TownRenderer, type PreviewLean } from '../render/renderer';
import { CHALLENGE_BY_ID, loadBestStars, measure, newRun, saveBestStars, starsFor, type ChallengeId, type ChallengeRun } from './challenges';
import { useUI, setSettings } from './store';

const MAX_QUESTIONS_PER_EVENT = 1500;
const DEFAULT_START = 11 * 60 + 30;

interface EventStats {
  releasedAt: number;
  firstSentAt: number;
  lastAnswerAt: number;
  questions: number;
  cacheHits: number;
  latencies: number[];
}

type Mode = 'free' | 'challenge' | 'replay';

export class Game {
  renderer = new TownRenderer();
  world!: World;
  private mode: Mode = 'free';
  private acc = 0;
  private last = 0;
  private aborts = new Set<AbortController>();
  private cache = new Map<string, ActionProbs>();
  private stats = new Map<number, EventStats>();
  private inFlight = 0;
  private provider = 'unknown';
  private previewCtrl: AbortController | null = null;
  private previewTimer: number | null = null;
  private preview: { text: string; data: PreviewResponse } | null = null;
  private previewLeans: Map<GroupId, PreviewLean> | null = null;
  private challenge: ChallengeRun | null = null;
  private replay: { payload: ReplayPayload; ended: boolean } | null = null;
  private lastUi = 0;
  private lowFpsSince = 0;
  private loadedAt = 0;
  private onboardingTimers: number[] = [];
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number; t: number }>();
  private pinchDist = 0;
  private dragged = false;
  private totalCacheLookups = 0;
  private totalCacheHits = 0;
  private latencySum = 0;
  private latencyCount = 0;

  async init(parent: HTMLElement) {
    await this.renderer.init(parent);
    this.renderer.onPop = (a) => synth.pop(a);
    this.bindInput(parent);
    useUI.setState({ bestStars: loadBestStars() });
    this.loadedAt = performance.now();
    const path = location.pathname;
    const m = /^\/r\/([a-z0-9]{4,12})$/i.exec(path);
    if (m) {
      void this.startReplay(m[1]);
    } else {
      this.newWorld({ seed: this.freshSeed(), citizenCount: useUI.getState().settings.citizenCount, startMinute: DEFAULT_START });
      let onboarded = false;
      try {
        onboarded = localStorage.getItem('murmur.onboarded') === '1';
      } catch {
        onboarded = true;
      }
      if (!onboarded) this.startOnboarding();
    }
    this.last = performance.now();
    this.renderer.app.ticker.add(() => this.frame());
    window.addEventListener('resize', () => this.renderer.resize());
    window.addEventListener('beforeunload', () => this.abortAll());
  }

  private freshSeed(): number {
    return (Math.random() * 0xffffffff) >>> 0;
  }

  private newWorld(config: WorldConfig) {
    this.abortAll();
    this.world = new World(config);
    this.renderer.setWorld(this.world);
    this.stats.clear();
    this.acc = 0;
    useUI.setState({ pulse: null, selectedId: null, following: false, leaning: null, clickedPlace: null });
    this.renderer.camera.followId = null;
    this.renderer.camera.cancelDirector();
    this.renderer.camera.reset();
  }

  private abortAll() {
    for (const a of this.aborts) a.abort();
    this.aborts.clear();
    this.inFlight = 0;
    this.previewCtrl?.abort();
  }

  // ---------------------------------------------------------------------------
  // Loop
  // ---------------------------------------------------------------------------

  private frame() {
    const now = performance.now();
    const dt = Math.min(100, now - this.last);
    this.last = now;
    const ui = useUI.getState();
    const speed = this.replay ? (this.replay.ended ? 0 : 1) : ui.settings.speed;
    this.acc += dt * speed;
    let steps = 0;
    while (this.acc >= TICK_MS && steps < 8) {
      this.world.step();
      this.afterStep(now);
      this.acc -= TICK_MS;
      steps++;
    }
    if (steps === 8) this.acc = 0;
    const alpha = speed === 0 ? 1 : Math.min(1, this.acc / TICK_MS);
    this.renderer.render(this.world, alpha, now, dt, {
      reducedMotion: ui.settings.reducedMotion,
      selectedId: ui.selectedId,
      ghostPlace: ui.clickedPlace,
      preview: this.preview && !this.preview.data.blocked && this.previewLeans ? { place: ui.clickedPlace ?? this.preview.data.place, leans: this.previewLeans } : null,
    });
    const L = lighting(this.world.minute);
    synth.setNight(L.night);
    const w = this.world.weather;
    synth.setRain(w === 'downpour' ? 1 : w === 'light_rain' ? 0.5 : 0);
    if (now - this.lastUi > 180) {
      this.lastUi = now;
      this.pushUi(now);
    }
    this.watchFps(now);
  }

  private afterStep(now: number) {
    const reqs = this.world.waveRequests.splice(0);
    if (!this.world.isReplay) for (const r of reqs) this.processWave(r);
    if (this.replay && !this.replay.ended && this.world.tick >= this.replay.payload.endTick + 30) {
      this.replay.ended = true;
      useUI.setState({ replay: { state: 'ended', headline: this.replay.payload.headline } });
    }
    for (const ev of this.world.events) {
      if (ev && ev.active && ev.releaseTick === this.world.tick) this.onReleased(ev.idx, now);
    }
    if (this.challenge && this.challenge.status === 'running') this.checkChallenge();
  }

  private onReleased(eventIdx: number, now: number) {
    const ev = this.world.events[eventIdx];
    const ui = useUI.getState();
    if (ui.settings.director && !ui.settings.reducedMotion && ui.selectedId === null) {
      this.renderer.camera.direct(now, ev.ox * TILE, ev.oy * TILE, ev.analysis.broadcast ? 30 * TILE : ev.radius * TILE);
    }
    if (!this.stats.has(eventIdx)) this.stats.set(eventIdx, { releasedAt: now, firstSentAt: 0, lastAnswerAt: 0, questions: 0, cacheHits: 0, latencies: [] });
  }

  // ---------------------------------------------------------------------------
  // Decisions
  // ---------------------------------------------------------------------------

  private processWave(req: WaveRequest) {
    const world = this.world;
    const ev = world.events[req.eventIdx];
    if (!ev) return;
    const st = this.stats.get(ev.idx) ?? { releasedAt: performance.now(), firstSentAt: 0, lastAnswerAt: 0, questions: 0, cacheHits: 0, latencies: [] };
    this.stats.set(ev.idx, st);
    let full = useUI.getState().settings.fullCity;
    let wc = buildWaveContexts(world, ev, req.citizenIds, full);
    if (full && st.questions + wc.contexts.length > MAX_QUESTIONS_PER_EVENT) {
      full = false;
      wc = buildWaveContexts(world, ev, req.citizenIds, false);
    }
    const eventInfo = { text: ev.text, place: ev.analysis.place, category: ev.analysis.category };
    const worldInfo = { minute: Math.floor(world.minute) % 1440, weather: world.weather, otherEvents: wc.otherEvents };
    const apply = (key: string, probs: ActionProbs, latencyMs: number, mock: boolean, cached: boolean) => {
      if (this.world !== world) return;
      const members = wc.members.get(key);
      if (!members) return;
      const ref = world.registerProbs(probs);
      for (const id of members) {
        world.queueDecision({ eventIdx: ev.idx, citizenId: id, action: sampleFor(world, ev.idx, id, probs), probsRef: ref, latencyMs, mock, cached });
      }
    };
    const toSend = [];
    for (const ctx of wc.contexts) {
      const ck = decideCacheKey(ev.text, ev.analysis.place, ev.analysis.category, worldInfo.weather, worldInfo.minute, wc.otherEvents, ctx.key);
      this.totalCacheLookups++;
      const hit = this.cache.get(ck);
      if (hit) {
        this.totalCacheHits++;
        st.cacheHits++;
        apply(ctx.key, hit, 0, false, true);
      } else {
        toSend.push({ ctx, ck });
      }
    }
    const budget = Math.max(0, MAX_QUESTIONS_PER_EVENT - st.questions);
    const sending = toSend.slice(0, budget);
    const overflow = toSend.slice(budget);
    // Past the per-event question cap, the rest of the town decides by local simulation.
    for (const { ctx } of overflow) apply(ctx.key, mockDecideContext(ctx, eventInfo, worldInfo), 0, true, false);
    if (overflow.length) useUI.setState({ mockSeen: true });
    if (!sending.length) return;
    st.questions += sending.length;
    if (!st.firstSentAt) st.firstSentAt = performance.now();
    const ctrl = new AbortController();
    this.aborts.add(ctrl);
    this.inFlight += sending.length;
    const ckByKey = new Map(sending.map((s) => [s.ctx.key, s.ck]));
    let remaining = sending.length;
    api
      .decide({ event: eventInfo, world: worldInfo, contexts: sending.map((s) => s.ctx) }, (line) => {
        if (this.world !== world) return;
        remaining--;
        this.inFlight = Math.max(0, this.inFlight - 1);
        st.lastAnswerAt = performance.now();
        st.latencies.push(line.latencyMs);
        this.latencySum += line.latencyMs;
        this.latencyCount++;
        const ck = ckByKey.get(line.key);
        if (ck && !line.mock) this.cache.set(ck, line.probs);
        if (line.mock) useUI.setState({ mockSeen: true });
        apply(line.key, line.probs, line.latencyMs, line.mock, line.cached);
      }, ctrl.signal)
      .then((meta) => {
        this.provider = meta.provider;
        if (meta.fallback) useUI.setState({ fallback: true });
      })
      .catch(() => undefined)
      .finally(() => {
        this.inFlight = Math.max(0, this.inFlight - remaining);
        this.aborts.delete(ctrl);
      });
  }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  setCommandText(text: string) {
    useUI.setState({ commandText: text.slice(0, 140), commandMessage: null });
    this.schedulePreview(text);
  }

  private schedulePreview(text: string) {
    if (this.previewTimer) window.clearTimeout(this.previewTimer);
    const t = text.trim();
    if (t.length < 3 || this.mode === 'replay') {
      this.previewCtrl?.abort();
      this.preview = null;
      this.previewLeans = null;
      useUI.setState({ leaning: null });
      return;
    }
    this.previewTimer = window.setTimeout(() => void this.runPreview(t), 250);
  }

  private async runPreview(text: string) {
    this.previewCtrl?.abort();
    const ctrl = new AbortController();
    this.previewCtrl = ctrl;
    try {
      const r = await api.preview(text, useUI.getState().lang, Math.floor(this.world.minute) % 1440, ctrl.signal);
      if (ctrl.signal.aborted || useUI.getState().commandText.trim() !== text) return;
      if (r.data.mock) useUI.setState({ mockSeen: true });
      if (r.local || r.meta.fallback) useUI.setState({ fallback: true });
      this.provider = r.meta.provider;
      this.preview = { text, data: r.data };
      if (r.data.blocked) {
        this.previewLeans = null;
        useUI.setState({ leaning: null });
        return;
      }
      const leans = new Map<GroupId, PreviewLean>();
      const pop = new Map<GroupId, number>();
      for (const c of this.world.citizens) pop.set(c.group, (pop.get(c.group) ?? 0) + 1);
      const avg = emptyProbs();
      let total = 0;
      for (const gl of r.data.groupLeans) {
        const p = gl.probs;
        const top = topAction(p);
        const toward = p.rush_toward + p.stroll_toward + p.investigate * 0.6 + p.help_out + p.film_it * 0.3 - p.flee * 1.2 - p.head_home - p.panic * 0.5;
        leans.set(gl.group, { group: gl.group, top, confidence: p[top], toward: Math.max(-1, Math.min(1, toward)) });
        const w = pop.get(gl.group) ?? 0;
        total += w;
        for (const k of ACTION_KEYS) avg[k] += p[k] * w;
      }
      if (total) for (const k of ACTION_KEYS) avg[k] /= total;
      this.previewLeans = leans;
      useUI.setState({ leaning: avg });
    } catch {
      // aborted or failed; the town simply doesn't lean
    }
  }

  async release(rawText: string, opts: { whisperTarget?: number; scripted?: boolean } = {}): Promise<boolean> {
    const ui = useUI.getState();
    const text = rawText.trim().slice(0, 140);
    if (!text) return false;
    synth.unlock();
    if (this.mode === 'replay') {
      useUI.setState({ commandMessage: 'replayLocked' });
      return false;
    }
    const run = this.challenge;
    const def = run ? CHALLENGE_BY_ID[run.id] : null;
    if (run && !opts.scripted) {
      if (run.status !== 'running') return false;
      if (def?.whispersOnly && opts.whisperTarget === undefined) {
        useUI.setState({ commandMessage: 'whisperOnly' });
        return false;
      }
      if (def?.whispersOnly && run.whispersUsed >= 1) {
        useUI.setState({ commandMessage: 'whisperUsed' });
        return false;
      }
      if (def?.maxEvents && run.eventsUsed >= def.maxEvents) {
        useUI.setState({ commandMessage: 'outOfEvents' });
        return false;
      }
    }
    useUI.setState({ busy: true, commandMessage: null });
    let analysis: Analysis;
    try {
      const p = this.preview;
      if (p && normalizeEventText(p.text) === normalizeEventText(text) && p.data.broadcast !== undefined) {
        analysis = {
          blocked: p.data.blocked,
          category: p.data.category,
          place: p.data.place,
          severity: p.data.severity,
          broadcast: !!p.data.broadcast,
          weather: p.data.weather ?? 'none',
          mock: p.data.mock,
        };
      } else {
        const r = await api.analyze(text, ui.lang, Math.floor(this.world.minute) % 1440, this.world.weather, ui.clickedPlace);
        if (r.local || r.meta.fallback) useUI.setState({ fallback: true });
        this.provider = r.meta.provider;
        analysis = r.data;
      }
    } catch {
      useUI.setState({ busy: false, commandMessage: 'error' });
      return false;
    }
    if (analysis.mock) useUI.setState({ mockSeen: true });
    if (analysis.blocked) {
      useUI.setState({ busy: false, commandMessage: 'blocked' });
      return false;
    }
    const clicked = useUI.getState().clickedPlace;
    if (clicked && opts.whisperTarget === undefined) analysis = { ...analysis, place: clicked };
    const tooMany = this.world.activeEvents.length >= MAX_ACTIVE_EVENTS;
    const idx = this.world.queueEvent(text, analysis, opts.whisperTarget ?? null);
    if (run) {
      if (opts.scripted) run.scriptedEventIdx = idx;
      else if (opts.whisperTarget !== undefined) run.whispersUsed++;
      else run.eventsUsed++;
    }
    this.stats.set(idx, { releasedAt: performance.now(), firstSentAt: 0, lastAnswerAt: 0, questions: 0, cacheHits: 0, latencies: [] });
    if (!opts.scripted) synth.whoosh();
    this.previewCtrl?.abort();
    this.preview = null;
    this.previewLeans = null;
    useUI.setState({ busy: false, commandText: opts.whisperTarget === undefined && !opts.scripted ? '' : ui.commandText, leaning: null, clickedPlace: null, commandMessage: tooMany ? 'tooMany' : null });
    return true;
  }

  whisper(citizenId: number, text: string) {
    return this.release(text, { whisperTarget: citizenId });
  }

  // ---------------------------------------------------------------------------
  // UI snapshot
  // ---------------------------------------------------------------------------

  private pushUi(now: number) {
    const ui = useUI.getState();
    const world = this.world;
    const patch: Partial<typeof ui> = { clock: clockString(world.minute) };
    const events = world.events.filter(Boolean);
    const latest = [...events].reverse().find((e) => e.active) ?? events[events.length - 1];
    if (latest) {
      const counts = Object.fromEntries(ACTION_KEYS.map((k) => [k, 0])) as Record<ActionKey, number>;
      let aware = 0;
      let deciding = 0;
      let decidedCitizens = 0;
      for (const c of world.citizens) {
        let knows = false;
        for (const idx of c.aware.keys()) if (world.events[idx]?.active) knows = true;
        if (!knows) continue;
        aware++;
        const a = world.currentAction(c);
        if (a) {
          counts[a]++;
          decidedCitizens++;
        } else if (c.pending > 0) deciding++;
      }
      let questions = 0;
      let first = Infinity;
      let lastAt = 0;
      for (const ev of events) {
        if (!ev.active) continue;
        const st = this.stats.get(ev.idx);
        if (!st) continue;
        questions += st.questions;
        if (st.firstSentAt) first = Math.min(first, st.firstSentAt);
        lastAt = Math.max(lastAt, st.lastAnswerAt);
      }
      const seconds = first < Infinity && lastAt > first ? (lastAt - first) / 1000 : 0;
      const exemplars: Partial<Record<ActionKey, string>> = {};
      for (const c of world.citizens) {
        const aw = c.aware.get(latest.idx);
        if (aw?.action && !exemplars[aw.action]) exemplars[aw.action] = c.archetype.id;
      }
      const lst = this.stats.get(latest.idx);
      const hl = buildHeadline({
        lang: ui.lang,
        eventText: latest.text,
        place: latest.analysis.place,
        counts: latest.counts,
        aware: latest.aware,
        seconds: lst && lst.lastAnswerAt ? (lst.lastAnswerAt - lst.releasedAt) / 1000 : 1,
        exemplars,
      });
      const anyActive = events.some((e) => e.active);
      patch.pulse = {
        hasEvent: true,
        counts,
        deciding,
        aware: anyActive ? aware : latest.aware,
        decisions: questions,
        decidedCitizens,
        seconds,
        wave: Math.max(0, latest.wave) + 1,
        headline: hl?.line ?? null,
        subline: hl?.subline ?? null,
        events: events.filter((e) => e.active).map((e) => ({ idx: e.idx, text: e.text, category: e.analysis.category, active: e.active })),
        settled: world.isSettled(latest) && latest.decided > 0,
      };
    }
    if (ui.settings.debug) {
      patch.debug = {
        fps: Math.round(this.renderer.fps),
        citizens: world.citizens.length,
        pending: this.inFlight,
        latency: this.latencyCount ? Math.round(this.latencySum / this.latencyCount) : 0,
        provider: this.provider,
        cacheRate: this.totalCacheLookups ? this.totalCacheHits / this.totalCacheLookups : 0,
        tick: world.tick,
      };
    }
    if (ui.following !== (this.renderer.camera.followId !== null)) patch.following = this.renderer.camera.followId !== null;
    void now;
    useUI.setState(patch);
  }

  // ---------------------------------------------------------------------------
  // Citizen card support
  // ---------------------------------------------------------------------------

  citizenScreenPos(id: number): { x: number; y: number; visible: boolean } | null {
    const c = this.world?.citizens[id];
    if (!c) return null;
    const p = this.renderer.camera.worldToScreen(c.x * TILE, c.y * TILE);
    return { x: p.x, y: p.y, visible: !c.inside };
  }

  select(id: number | null) {
    useUI.setState({ selectedId: id });
    if (id === null && this.renderer.camera.followId !== null) this.renderer.camera.followId = null;
  }

  toggleFollow(id: number) {
    const cam = this.renderer.camera;
    if (cam.followId === id) cam.followId = null;
    else {
      cam.cancelDirector();
      cam.followId = id;
      if (cam.zoom < cam.defaultZoom * 1.4) cam.zoom = Math.min(cam.maxZoom, cam.defaultZoom * 1.6);
    }
    useUI.setState({ following: cam.followId !== null });
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private bindInput(el: HTMLElement) {
    const canvas = this.renderer.app.canvas;
    const cam = this.renderer.camera;
    canvas.addEventListener('pointerdown', (e) => {
      synth.unlock();
      canvas.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY, sx: e.offsetX, sy: e.offsetY, t: performance.now() });
      if (this.pointers.size === 1) this.dragged = false;
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        this.dragged = true;
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) {
        if (e.pointerType === 'mouse') canvas.style.cursor = this.renderer.pickCitizen(e.offsetX, e.offsetY) !== null ? 'pointer' : 'grab';
        return;
      }
      if (this.pointers.size === 1) {
        const dx = e.offsetX - p.x;
        const dy = e.offsetY - p.y;
        if (Math.hypot(e.offsetX - p.sx, e.offsetY - p.sy) > 5) this.dragged = true;
        if (this.dragged) {
          cam.pan(dx, dy);
          if (useUI.getState().following) useUI.setState({ following: false });
          canvas.style.cursor = 'grabbing';
        }
      } else if (this.pointers.size === 2) {
        const others = [...this.pointers.entries()].filter(([id]) => id !== e.pointerId).map(([, v]) => v);
        const o = others[0];
        const d = Math.hypot(e.offsetX - o.x, e.offsetY - o.y);
        if (this.pinchDist > 0) {
          const midX = (e.offsetX + o.x) / 2;
          const midY = (e.offsetY + o.y) / 2;
          cam.zoomAt(midX, midY, d / this.pinchDist);
          const pmx = (p.x + o.x) / 2;
          const pmy = (p.y + o.y) / 2;
          cam.pan(midX - pmx, midY - pmy);
        }
        this.pinchDist = d;
      }
      p.x = e.offsetX;
      p.y = e.offsetY;
    });
    const end = (e: PointerEvent) => {
      const p = this.pointers.get(e.pointerId);
      this.pointers.delete(e.pointerId);
      canvas.style.cursor = 'grab';
      if (!p || this.dragged || this.pointers.size > 0) {
        if (this.pointers.size === 0) this.dragged = false;
        return;
      }
      this.tap(e.offsetX, e.offsetY);
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', (e) => {
      this.pointers.delete(e.pointerId);
      this.dragged = false;
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
        cam.zoomAt(e.offsetX, e.offsetY, factor);
      },
      { passive: false },
    );
    void el;
  }

  private tap(x: number, y: number) {
    const id = this.renderer.pickCitizen(x, y);
    if (id !== null) {
      this.select(id);
      return;
    }
    const ui = useUI.getState();
    if (ui.selectedId !== null) {
      this.select(null);
      return;
    }
    if (this.mode === 'replay') return;
    const place = this.renderer.pickPlace(x, y);
    useUI.setState({ clickedPlace: place && place !== ui.clickedPlace ? place : null });
  }

  // ---------------------------------------------------------------------------
  // Challenges
  // ---------------------------------------------------------------------------

  startChallenge(id: ChallengeId) {
    const def = CHALLENGE_BY_ID[id];
    this.stopOnboarding(false);
    this.replay = null;
    this.mode = 'challenge';
    this.newWorld({ seed: this.freshSeed(), citizenCount: useUI.getState().settings.citizenCount, startMinute: def.startMinute, beachCrowd: def.beachCrowd });
    this.challenge = newRun(id, 0);
    setSettings({ speed: 1 });
    useUI.setState({ challengesOpen: false, replay: null, commandMessage: null, commandText: '' });
    if (def.scripted) void this.release(def.scripted, { scripted: true });
    if (id === 'beach') this.renderer.camera.glideTo(performance.now(), 30 * TILE, 33 * TILE, this.renderer.camera.defaultZoom * 1.2);
    if (id === 'ramen') this.renderer.camera.glideTo(performance.now(), 36 * TILE, 12 * TILE, this.renderer.camera.defaultZoom * 1.2);
    this.checkChallenge();
  }

  leaveChallenge() {
    this.challenge = null;
    this.mode = 'free';
    this.newWorld({ seed: this.freshSeed(), citizenCount: useUI.getState().settings.citizenCount, startMinute: DEFAULT_START });
    useUI.setState({ challenge: null });
  }

  private checkChallenge() {
    const run = this.challenge;
    if (!run) return;
    const def = CHALLENGE_BY_ID[run.id];
    const world = this.world;
    const prog = measure(run, world);
    run.elapsedS = (world.tick - run.startTick) / 10;
    const timeLeft = def.timeLimitS !== null ? Math.max(0, def.timeLimitS - run.elapsedS) : null;
    if (run.status === 'running') {
      if (prog.done) {
        run.status = 'success';
        run.stars = starsFor(run);
        saveBestStars(run.id, run.stars);
        synth.chime(true);
        useUI.setState({ bestStars: loadBestStars() });
      } else if (timeLeft !== null && timeLeft <= 0) {
        run.status = 'failed';
        run.failReason = 'time';
        synth.chime(false);
      } else {
        const outOfEvents = def.whispersOnly ? run.whispersUsed >= 1 : def.maxEvents !== null && run.eventsUsed >= def.maxEvents;
        const quiet = world.events.every((e) => !e || !e.active || (e.idx === run.scriptedEventIdx && run.id !== 'calm'));
        if (outOfEvents && quiet && run.id !== 'calm') {
          run.status = 'failed';
          run.failReason = 'events';
          synth.chime(false);
        }
      }
    }
    useUI.setState({
      challenge: {
        id: run.id,
        status: run.status,
        failReason: run.failReason,
        value: prog.value,
        n: prog.n,
        p: prog.p,
        eventsUsed: run.eventsUsed,
        maxEvents: def.maxEvents,
        whispersUsed: run.whispersUsed,
        timeLeft: timeLeft !== null ? Math.ceil(timeLeft) : null,
        stars: run.stars,
        notice: run.notice,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Sharing and replays
  // ---------------------------------------------------------------------------

  currentHeadline(): { line: string; subline: string | null } | null {
    const p = useUI.getState().pulse;
    return p?.headline ? { line: p.headline, subline: p.subline } : null;
  }

  async shareLink(): Promise<string> {
    const payload = buildReplay(this.world, useUI.getState().lang, this.currentHeadline(), this.challenge?.id ?? null);
    const id = await api.shareReplay(payload);
    return `${location.origin}/r/${id}`;
  }

  async startReplay(id: string) {
    this.mode = 'replay';
    useUI.setState({ replay: { state: 'loading', headline: null } });
    this.newWorld({ seed: 1, citizenCount: 300, startMinute: DEFAULT_START });
    try {
      const payload = await api.fetchReplay(id);
      if (!isReplayPayload(payload)) throw new Error('bad replay');
      this.playReplay(payload);
    } catch {
      useUI.setState({ replay: { state: 'missing', headline: null } });
    }
  }

  playReplay(payload: ReplayPayload) {
    this.mode = 'replay';
    this.newWorld(payload.config);
    const { inputs, probTable } = replayInputs(payload);
    this.world.loadReplay(inputs, probTable);
    // Fast-forward silently to just before the first event.
    while (this.world.tick < payload.fromTick) {
      this.world.step();
      this.world.waveRequests.length = 0;
    }
    for (const c of this.world.citizens) {
      c.px = c.x;
      c.py = c.y;
    }
    this.replay = { payload, ended: false };
    this.renderer.setWorld(this.world);
    useUI.setState({ replay: { state: 'playing', headline: payload.headline } });
  }

  exitReplay() {
    this.replay = null;
    this.mode = 'free';
    history.replaceState(null, '', '/');
    this.newWorld({ seed: this.freshSeed(), citizenCount: useUI.getState().settings.citizenCount, startMinute: DEFAULT_START });
    useUI.setState({ replay: null });
  }

  get isReplay(): boolean {
    return this.mode === 'replay';
  }

  async saveImage(): Promise<void> {
    const snap = this.renderer.snapshot();
    const hl = this.currentHeadline();
    const scale = snap.width / this.renderer.camera.viewW;
    const out = document.createElement('canvas');
    out.width = snap.width;
    out.height = snap.height;
    const ctx = out.getContext('2d')!;
    ctx.drawImage(snap, 0, 0);
    const pad = 20 * scale;
    const maxW = Math.min(out.width - pad * 2, 620 * scale);
    if (hl) {
      ctx.font = `${22 * scale}px "Dela Gothic One", sans-serif`;
      const lines = wrap(ctx, hl.line, maxW - pad * 2);
      const subFont = `700 ${14 * scale}px "M PLUS Rounded 1c", sans-serif`;
      const h = pad * 2 + lines.length * 30 * scale + (hl.subline ? 26 * scale : 0);
      const x = pad;
      const y = out.height - h - pad;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      roundRect(ctx, x, y, maxW, h, 18 * scale);
      ctx.fill();
      ctx.fillStyle = '#3A2E5C';
      ctx.font = `${22 * scale}px "Dela Gothic One", sans-serif`;
      lines.forEach((l, i) => ctx.fillText(l, x + pad, y + pad + 22 * scale + i * 30 * scale));
      if (hl.subline) {
        ctx.font = subFont;
        ctx.fillStyle = 'rgba(58,46,92,0.75)';
        ctx.fillText(hl.subline, x + pad, y + pad + lines.length * 30 * scale + 14 * scale);
      }
    }
    ctx.font = `${20 * scale}px "Dela Gothic One", sans-serif`;
    const mark = 'murmur';
    const mw = ctx.measureText(mark).width;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    roundRect(ctx, out.width - mw - pad * 2.4, pad, mw + pad * 1.4, 34 * scale, 17 * scale);
    ctx.fill();
    ctx.fillStyle = '#3A2E5C';
    ctx.fillText(mark, out.width - mw - pad * 1.7, pad + 24 * scale);
    ctx.fillStyle = '#FF7A9C';
    ctx.beginPath();
    ctx.arc(out.width - pad * 1.55, pad + 9 * scale, 3.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    const blob: Blob | null = await new Promise((r) => out.toBlob(r, 'image/png'));
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `murmur-${Date.now().toString(36)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  setCitizenCount(n: 300 | 600 | 1000) {
    setSettings({ citizenCount: n });
    if (this.mode === 'replay') return;
    const def = this.challenge ? CHALLENGE_BY_ID[this.challenge.id] : null;
    if (def) {
      this.startChallenge(def.id);
    } else {
      this.newWorld({ seed: this.freshSeed(), citizenCount: n, startMinute: DEFAULT_START });
    }
  }

  private watchFps(now: number) {
    const ui = useUI.getState();
    if (now - this.loadedAt < 6000 || ui.autoReduced || ui.settings.citizenCount !== 1000 || this.mode !== 'free' || ui.onboarding) return;
    if (document.hidden) {
      this.lowFpsSince = 0;
      return;
    }
    if (this.renderer.fps < 45) {
      if (!this.lowFpsSince) this.lowFpsSince = now;
      if (now - this.lowFpsSince > 3000 && this.world.activeEvents.length === 0) {
        useUI.setState({ autoReduced: true });
        setSettings({ citizenCount: 600 });
        this.newWorld({ seed: this.world.seed, citizenCount: 600, startMinute: this.world.minute % 1440 });
      }
    } else {
      this.lowFpsSince = 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Onboarding
  // ---------------------------------------------------------------------------

  startOnboarding() {
    this.stopOnboarding(false);
    if (this.mode !== 'free') {
      this.challenge = null;
      this.mode = 'free';
      this.newWorld({ seed: this.freshSeed(), citizenCount: useUI.getState().settings.citizenCount, startMinute: DEFAULT_START });
    }
    useUI.setState({ onboarding: { phase: 'welcome' }, settingsOpen: false, challenge: null });
    const cam = this.renderer.camera;
    const now = performance.now();
    const reduced = useUI.getState().settings.reducedMotion;
    if (!reduced) {
      cam.x = 8 * TILE;
      cam.y = 30 * TILE;
      cam.zoom = cam.defaultZoom * 1.9;
      cam.clamp();
      cam.glideTo(now, 40 * TILE, 12 * TILE, cam.defaultZoom * 1.5, 3200);
    }
    const text = useUI.getState().lang === 'ja' ? '公園で無料ラーメン' : 'free ramen in the park';
    const at = (ms: number, fn: () => void) => this.onboardingTimers.push(window.setTimeout(fn, ms));
    let t = reduced ? 600 : 3400;
    at(t - 200, () => useUI.setState({ onboarding: { phase: 'typing' } }));
    for (let i = 1; i <= text.length; i++) {
      const ch = text[i - 1];
      t += ch === ' ' ? 320 : useUI.getState().lang === 'ja' ? 260 : 95;
      const partial = text.slice(0, i);
      at(t, () => this.setCommandText(partial));
    }
    at(t + 1300, () => void this.release(text));
    at(t + 8500, () => useUI.setState({ onboarding: { phase: 'caption' } }));
    at(t + 15000, () => this.stopOnboarding(true));
  }

  stopOnboarding(markDone = true) {
    for (const t of this.onboardingTimers) window.clearTimeout(t);
    this.onboardingTimers = [];
    if (markDone) {
      try {
        localStorage.setItem('murmur.onboarded', '1');
      } catch {
        // ignore
      }
      if (useUI.getState().onboarding) useUI.setState({ onboarding: null });
    }
  }

  skipOnboarding() {
    const pending = useUI.getState().commandText;
    this.stopOnboarding(true);
    if (pending && this.world.events.length === 0) this.setCommandText('');
    this.renderer.camera.cancelDirector();
  }

  groupNames(): Record<GroupId, string> {
    const lang = useUI.getState().lang;
    return Object.fromEntries(GROUP_IDS.map((g) => [g, GROUPS[g].name[lang]])) as Record<GroupId, string>;
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = /\s/.test(text) ? text.split(/(\s+)/) : Array.from(text);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur + w;
    if (ctx.measureText(test).width > maxW && cur.trim()) {
      lines.push(cur.trim());
      cur = w.trimStart();
    } else {
      cur = test;
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines.slice(0, 3);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export const game = new Game();
