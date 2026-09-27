import { Application, CanvasSource, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { ACTIONS, type EmoteId } from '../../../shared/actions';
import type { ActionKey, GroupId, PlaceId, Weather } from '../../../shared/types';
import { hrand } from '../../../shared/hash';
import { MAP_H, MAP_W, PLACE_DEFS } from '../engine/townMap';
import type { Citizen, SimEvent, World } from '../engine/world';
import { THREAD_TICKS, WEATHER_TICKS } from '../engine/world';
import { Camera } from './camera';
import { paintTown } from './paintTown';
import { BODY_COLORS, PAL, TEX_RES, TILE, hex } from './palette';
import { buildSpriteSheet, CIT_H, SPRITE_RES, type FrameRect, type SpriteSheet } from './sprites';
import { lighting } from './lighting';
import { getTownMap } from '../engine/townMap';

const S = 1 / SPRITE_RES;

export interface PreviewLean {
  group: GroupId;
  top: ActionKey;
  confidence: number;
  toward: number;
}

export interface RenderOptions {
  reducedMotion: boolean;
  selectedId: number | null;
  ghostPlace: PlaceId | null;
  preview: { place: PlaceId; leans: Map<GroupId, PreviewLean> } | null;
}

interface EmoteSprite {
  sprite: Sprite;
  citizen: number;
  born: number;
  life: number;
  gentle: boolean;
}

interface Particle {
  sprite: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  gravity: number;
  spin: number;
}

interface PinView {
  root: Container;
  pin: Sprite;
  label: Container;
  ring: Graphics;
  born: number;
  radius: number;
  fading: number;
}

export class TownRenderer {
  app = new Application();
  camera = new Camera();
  private sheet!: SpriteSheet;
  private sheetTex!: Texture;
  private frames = new Map<FrameRect, Texture>();
  private worldLayer = new Container();
  private topLayer = new Container();
  private citizenLayer = new Container();
  private groundFx = new Graphics();
  private threadG = new Graphics();
  private emoteLayer = new Container();
  private extrasLayer = new Container();
  private pinLayer = new Container();
  private particleLayer = new Container();
  private weatherScreen = new Container();
  private weatherWorld = new Container();
  private rainbowG = new Graphics();
  private town!: Sprite;
  private shimmerA!: Sprite;
  private shimmerB!: Sprite;
  private snowRoofs!: Sprite;
  private lights!: Sprite;
  private nightOverlay!: Sprite;
  private goldOverlay!: Sprite;
  private weatherOverlay!: Sprite;
  private flashOverlay!: Sprite;
  private citizenSprites: Sprite[] = [];
  private citizenAlpha: Float32Array = new Float32Array(0);
  private lastEmoteTick: Int32Array = new Int32Array(0);
  private emotes: EmoteSprite[] = [];
  private emotePool: Sprite[] = [];
  private extrasPool: Sprite[] = [];
  private extrasUsed = 0;
  private particles: Particle[] = [];
  private particlePool: Sprite[] = [];
  private weatherParticles: Particle[] = [];
  private pins = new Map<number, PinView>();
  private ghost!: Sprite;
  private fountain: Particle[] = [];
  private currentWeather: Weather = 'none';
  private nextFirework = 0;
  private lastSort = 0;
  private worldRef: World | null = null;
  onPop: ((action: ActionKey) => void) | null = null;
  fps = 60;
  private fpsAcc = 0;
  private fpsFrames = 0;

  async init(parent: HTMLElement) {
    await this.app.init({
      resizeTo: parent,
      antialias: true,
      backgroundColor: hex(PAL.sea),
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      preference: 'webgl',
      preserveDrawingBuffer: false,
    });
    parent.appendChild(this.app.canvas);
    this.app.canvas.style.touchAction = 'none';
    this.app.canvas.setAttribute('aria-label', 'Murmur town');

    const map = getTownMap();
    const town = paintTown(map);
    const mkTex = (c: HTMLCanvasElement) => new Texture({ source: new CanvasSource({ resource: c, autoGenerateMipmaps: true, scaleMode: 'linear', resolution: 1 }) });
    this.town = new Sprite(mkTex(town.base));
    this.town.scale.set(1 / TEX_RES);
    this.shimmerA = new Sprite(mkTex(town.shimmer));
    this.shimmerA.scale.set(1 / TEX_RES);
    this.shimmerB = new Sprite(this.shimmerA.texture);
    this.shimmerB.scale.set(1 / TEX_RES);
    this.shimmerB.position.set(3, 2);
    this.snowRoofs = new Sprite(mkTex(town.snow));
    this.snowRoofs.scale.set(1 / TEX_RES);
    this.snowRoofs.alpha = 0;
    this.lights = new Sprite(mkTex(town.lights));
    this.lights.scale.set(1 / TEX_RES);
    this.lights.blendMode = 'add';
    this.lights.alpha = 0;

    this.sheet = buildSpriteSheet();
    this.sheetTex = new Texture({ source: new CanvasSource({ resource: this.sheet.canvas, autoGenerateMipmaps: true, scaleMode: 'linear' }) });

    this.citizenLayer.sortableChildren = true;
    this.worldLayer.addChild(this.town, this.shimmerA, this.shimmerB, this.snowRoofs, this.groundFx, this.citizenLayer, this.extrasLayer, this.particleLayer);

    this.nightOverlay = this.overlay(PAL.night, 'multiply');
    this.goldOverlay = this.overlay('#FFD9A6', 'multiply');
    this.weatherOverlay = this.overlay('#8F9BB8', 'multiply');
    this.flashOverlay = this.overlay('#FFF4D6', 'add');

    this.ghost = new Sprite(this.tex(this.sheet.ghostPin));
    this.ghost.anchor.set(0.5, 1);
    this.ghost.scale.set(S);
    this.ghost.visible = false;
    this.topLayer.addChild(this.lights, this.threadG, this.emoteLayer, this.pinLayer, this.ghost, this.weatherWorld);

    this.app.stage.addChild(this.worldLayer, this.weatherScreen, this.rainbowG, this.weatherOverlay, this.goldOverlay, this.nightOverlay, this.topLayer, this.flashOverlay);
    this.camera.resize(this.app.screen.width, this.app.screen.height);
    this.initFountain();
  }

  private overlay(color: string, mode: 'multiply' | 'add'): Sprite {
    const s = new Sprite(Texture.WHITE);
    s.tint = hex(color);
    s.blendMode = mode;
    s.alpha = 0;
    s.eventMode = 'none';
    return s;
  }

  tex(r: FrameRect): Texture {
    let t = this.frames.get(r);
    if (!t) {
      t = new Texture({ source: this.sheetTex.source, frame: new Rectangle(r.x, r.y, r.w, r.h) });
      this.frames.set(r, t);
    }
    return t;
  }

  setWorld(world: World) {
    this.worldRef = world;
    this.citizenLayer.removeChildren().forEach((c) => c.destroy());
    this.citizenSprites = [];
    for (const c of world.citizens) {
      const s = new Sprite(this.tex(this.sheet.citizens[c.color][0]));
      s.anchor.set(0.5, 1);
      s.scale.set(S);
      s.eventMode = 'none';
      this.citizenLayer.addChild(s);
      this.citizenSprites.push(s);
    }
    this.citizenAlpha = new Float32Array(world.citizens.length);
    this.lastEmoteTick = new Int32Array(world.citizens.length).fill(world.tick);
    for (const e of this.emotes) this.releaseEmote(e);
    this.emotes = [];
    for (const p of this.pins.values()) p.root.destroy({ children: true });
    this.pins.clear();
    for (const p of this.particles) this.releaseParticle(p);
    this.particles = [];
  }

  resize() {
    this.camera.resize(this.app.screen.width, this.app.screen.height);
  }

  // ---------------------------------------------------------------------------
  // Frame
  // ---------------------------------------------------------------------------

  render(world: World, alpha: number, now: number, dt: number, opts: RenderOptions) {
    this.fpsAcc += dt;
    this.fpsFrames++;
    if (this.fpsAcc >= 500) {
      this.fps = (this.fpsFrames * 1000) / this.fpsAcc;
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }
    const cam = this.camera;
    const follow = cam.followId !== null ? world.citizens[cam.followId] : null;
    cam.update(now, follow ? { x: this.ix(follow, alpha) * TILE, y: this.iy(follow, alpha) * TILE - 6 } : null);
    for (const layer of [this.worldLayer, this.topLayer]) {
      layer.scale.set(cam.zoom);
      layer.position.set(cam.viewW / 2 - cam.x * cam.zoom, cam.viewH / 2 - cam.y * cam.zoom);
    }
    const vw = cam.viewW;
    const vh = cam.viewH;
    for (const o of [this.nightOverlay, this.goldOverlay, this.weatherOverlay, this.flashOverlay]) {
      o.width = vw;
      o.height = vh;
    }
    const view = {
      x0: cam.x - vw / 2 / cam.zoom - 20,
      y0: cam.y - vh / 2 / cam.zoom - 30,
      x1: cam.x + vw / 2 / cam.zoom + 20,
      y1: cam.y + vh / 2 / cam.zoom + 20,
    };
    const tickF = world.tick - 1 + alpha;

    // Water shimmer
    const sh = (Math.sin(now / 900) + 1) / 2;
    this.shimmerA.alpha = 0.25 + 0.45 * sh;
    this.shimmerB.alpha = 0.25 + 0.45 * (1 - sh);

    this.extrasUsed = 0;
    this.renderCitizens(world, alpha, now, dt, view, opts, tickF);
    this.renderThreads(world, alpha, tickF);
    this.renderPins(world, now, opts);
    this.renderEmotes(world, alpha, now);
    this.renderParticles(dt);
    this.renderFountain(dt, opts.reducedMotion);
    this.renderLighting(world, now);
    this.renderWeather(world, now, dt, opts);
    for (let i = this.extrasUsed; i < this.extrasPool.length; i++) this.extrasPool[i].visible = false;
  }

  private ix(c: Citizen, a: number) {
    return c.px + (c.x - c.px) * a;
  }

  private iy(c: Citizen, a: number) {
    return c.py + (c.y - c.py) * a;
  }

  private extra(r: FrameRect): Sprite {
    let s = this.extrasPool[this.extrasUsed];
    if (!s) {
      s = new Sprite();
      s.anchor.set(0.5, 1);
      s.eventMode = 'none';
      this.extrasLayer.addChild(s);
      this.extrasPool.push(s);
    }
    this.extrasUsed++;
    s.texture = this.tex(r);
    s.visible = true;
    s.alpha = 1;
    s.tint = 0xffffff;
    s.rotation = 0;
    s.scale.set(S);
    return s;
  }

  private renderCitizens(world: World, alpha: number, now: number, dt: number, view: { x0: number; y0: number; x1: number; y1: number }, opts: RenderOptions, tickF: number) {
    const fade = Math.min(1, dt / 220);
    const raining = world.weather === 'light_rain' || world.weather === 'downpour';
    const downpour = world.weather === 'downpour';
    const heat = world.weather === 'heatwave';
    const preview = opts.preview;
    const previewPin = preview ? PLACE_DEFS[preview.place].center : null;
    let previewBudget = 220;
    const sortNow = now - this.lastSort > 120;
    if (sortNow) this.lastSort = now;
    for (let i = 0; i < world.citizens.length; i++) {
      const c = world.citizens[i];
      const s = this.citizenSprites[i];
      if (!s) continue;
      const target = c.inside ? 0 : 1;
      this.citizenAlpha[i] += (target - this.citizenAlpha[i]) * fade;
      const a = this.citizenAlpha[i];
      const x = this.ix(c, alpha) * TILE;
      const y = this.iy(c, alpha) * TILE;
      if (a < 0.02 || x < view.x0 || x > view.x1 || y < view.y0 || y > view.y1) {
        s.visible = false;
        continue;
      }
      s.visible = true;
      s.alpha = a;
      const r = c.reaction;
      const act = r ? r.action : null;
      let frame = 0;
      let dy = 0;
      let dx = 0;
      let sy = 1;
      const phase = now / (c.running ? 70 : 120) + i * 1.7;
      if (c.moving) {
        frame = Math.floor(phase) % 4;
        dy = frame % 2 === 1 ? -1 : 0;
      } else if ((Math.floor(now / 160) + i * 13) % 31 === 0) {
        frame = 4;
      }
      if (!opts.reducedMotion) {
        if (act === 'celebrate') dy -= Math.abs(Math.sin(now / 130 + i)) * 4;
        if (act === 'complain') {
          const st = Math.floor(now / 180 + i) % 2;
          sy = st ? 0.9 : 1;
          dx = st ? 0.4 : -0.4;
        }
        if (act === 'panic') dx += Math.sin(now / 40 + i) * 0.6;
      }
      let facing = c.facing;
      if (previewPin && previewBudget > 0 && !r && !c.inside) {
        const pdx = previewPin.x * TILE - x;
        const pdy = previewPin.y * TILE - y;
        const d = Math.sqrt(pdx * pdx + pdy * pdy);
        if (d < 34 * TILE) {
          previewBudget--;
          const lean = preview!.leans.get(c.group);
          if (lean) {
            if (Math.abs(pdx) > 4) facing = pdx > 0 ? 1 : -1;
            const k = (lean.toward * 1.8) / (d || 1);
            dx += pdx * k;
            dy += pdy * k * 0.6;
            const flick = 0.35 + 0.25 * Math.sin(now / 180 + i);
            const em = this.extra(this.sheet.emotes[lean.confidence < 0.34 ? 'question' : ACTIONS[lean.top].emote]);
            em.position.set(x + dx, y + dy - CIT_H + 1);
            em.alpha = flick * a;
            em.scale.set(S * 0.72);
          }
        }
      }
      s.texture = this.tex(this.sheet.citizens[c.color][frame]);
      s.position.set(x + dx, y + dy);
      s.scale.set(S * facing, S * sy);
      if (sortNow) s.zIndex = y;

      if (c.pending > 0 && !c.inside) {
        const sh = this.extra(this.sheet.emotes.shimmer);
        const tw = 0.5 + 0.5 * Math.sin(now / 90 + i);
        sh.position.set(x, y - CIT_H - 1 - tw * 1.5);
        sh.alpha = 0.55 + 0.45 * tw;
        sh.scale.set(S * (0.7 + tw * 0.2));
      }
      if (act === 'film_it' && !c.moving) {
        const ph = this.extra(this.sheet.phone);
        ph.position.set(x + facing * 4.5, y - 8);
        const since = (tickF - r!.start) % 12;
        if (since < 1.5 && !opts.reducedMotion) {
          const fl = this.extra(this.sheet.star);
          fl.position.set(x + facing * 5, y - 9);
          fl.tint = hex(PAL.lantern);
          fl.scale.set(S * (1.4 - since * 0.5));
          fl.alpha = 1 - since / 1.5;
        }
      }
      if (raining && (downpour || i % 10 < 7)) {
        const u = this.extra(this.sheet.umbrella);
        u.position.set(x + dx + facing * 1, y + dy - CIT_H + 5);
        u.alpha = a;
      }
      if (opts.selectedId === i) {
        const sel = this.extra(this.sheet.select);
        sel.anchor.set(0.5, 0.5);
        sel.position.set(x, y);
        sel.scale.set(S * (1 + 0.06 * Math.sin(now / 200)));
      }
      if (act === 'celebrate' && !opts.reducedMotion && (Math.floor(now / 1500 + i * 0.37) !== Math.floor((now - dt) / 1500 + i * 0.37))) {
        this.confetti(x, y - 14);
      }
      if (heat && !opts.reducedMotion && hrand(i, Math.floor(now / 3000), 5) < 0.004) {
        this.spawnEmote(i, 'sweat', now, true);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Threads, pins, emotes
  // ---------------------------------------------------------------------------

  private renderThreads(world: World, alpha: number, tickF: number) {
    const g = this.threadG;
    g.clear();
    const blush = hex(PAL.blush);
    for (const th of world.threads) {
      const a = world.citizens[th.from];
      const b = world.citizens[th.to];
      const ax = this.ix(a, alpha) * TILE;
      const ay = this.iy(a, alpha) * TILE - 12;
      const bx = this.ix(b, alpha) * TILE;
      const by = this.iy(b, alpha) * TILE - 12;
      const dist = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
      const lift = th.online ? dist * 0.45 + 30 : dist * 0.35 + 8;
      const cx = (ax + bx) / 2;
      const cy = (ay + by) / 2 - lift;
      const t = (tickF - th.start) / THREAD_TICKS;
      const after = Math.max(0, tickF - th.end);
      const fadeOut = Math.max(0, 1 - after / 8);
      if (fadeOut <= 0) continue;
      const tt = Math.max(0, Math.min(1, t));
      g.moveTo(ax, ay).quadraticCurveTo(cx, cy, bx, by).stroke({ width: 5, color: blush, alpha: 0.1 * fadeOut, cap: 'round' });
      g.moveTo(ax, ay).quadraticCurveTo(cx, cy, bx, by).stroke({ width: th.online ? 1.4 : 1.9, color: blush, alpha: 0.5 * fadeOut, cap: 'round' });
      if (t >= 0 && t <= 1) {
        for (let k = 5; k >= 0; k--) {
          const p = Math.max(0, tt - k * 0.035);
          const q = 1 - p;
          const px = q * q * ax + 2 * q * p * cx + p * p * bx;
          const py = q * q * ay + 2 * q * p * cy + p * p * by;
          g.circle(px, py, k === 0 ? 2.6 : 2.2 - k * 0.25).fill({ color: k === 0 ? 0xffffff : blush, alpha: k === 0 ? 1 : 0.8 - k * 0.12 });
        }
        const q = 1 - tt;
        const hx = q * q * ax + 2 * q * tt * cx + tt * tt * bx;
        const hy = q * q * ay + 2 * q * tt * cy + tt * tt * by;
        g.circle(hx, hy, 7).fill({ color: blush, alpha: 0.25 });
      } else if (t > 1 && after < 4) {
        g.circle(bx, by, 3 + after * 2).stroke({ width: 1, color: blush, alpha: 0.6 * (1 - after / 4) });
      }
    }
  }

  private renderPins(world: World, now: number, opts: RenderOptions) {
    const seen = new Set<number>();
    for (const ev of world.events) {
      if (!ev) continue;
      if (!ev.active && !this.pins.has(ev.idx)) continue;
      seen.add(ev.idx);
      let pv = this.pins.get(ev.idx);
      if (!pv) {
        pv = this.createPin(ev, now);
        this.pins.set(ev.idx, pv);
      }
      if (!ev.active && pv.fading === 0) pv.fading = now;
      const age = now - pv.born;
      const drop = opts.reducedMotion ? 1 : Math.min(1, age / 650);
      const spring = opts.reducedMotion ? 0 : (1 - drop) * -70 + Math.sin(drop * Math.PI * 2.5) * (1 - drop) * 12;
      pv.pin.position.set(0, spring);
      const ringT = Math.min(1, age / 1300);
      const r = pv.radius * (1 - Math.pow(1 - ringT, 3));
      pv.ring.clear();
      pv.ring.ellipse(0, 0, r, r * 0.72).stroke({ width: 2, color: hex(PAL.blush), alpha: 0.75 * (1 - ringT) + 0.18 });
      pv.ring.ellipse(0, 0, r, r * 0.72).fill({ color: hex(PAL.blush), alpha: 0.06 * (1 - ringT) + 0.025 });
      if (!opts.reducedMotion) {
        const pulse = ((now - pv.born) % 2400) / 2400;
        pv.ring.ellipse(0, 0, 10 + pulse * 34, (10 + pulse * 34) * 0.72).stroke({ width: 1.5, color: hex(PAL.blush), alpha: 0.7 * (1 - pulse) });
      }
      const fadeA = pv.fading ? Math.max(0, 1 - (now - pv.fading) / 800) : 1;
      pv.root.alpha = fadeA;
      pv.label.alpha = Math.min(1, age / 500) * fadeA;
      if (pv.fading && fadeA <= 0) {
        pv.root.destroy({ children: true });
        this.pins.delete(ev.idx);
      }
    }
    for (const [idx, pv] of this.pins) {
      if (!seen.has(idx)) {
        pv.root.destroy({ children: true });
        this.pins.delete(idx);
      }
    }
    const gp = opts.ghostPlace ?? opts.preview?.place ?? null;
    this.ghost.visible = gp !== null;
    if (gp) {
      const c = PLACE_DEFS[gp].center;
      this.ghost.position.set(c.x * TILE, c.y * TILE - 2 + Math.sin(now / 300) * 1.5);
      this.ghost.alpha = opts.ghostPlace ? 0.95 : 0.6;
    }
  }

  private createPin(ev: SimEvent, now: number): PinView {
    const root = new Container();
    root.position.set(ev.ox * TILE, ev.oy * TILE);
    const ring = new Graphics();
    const pin = new Sprite(this.tex(this.sheet.pins[ev.analysis.category]));
    pin.anchor.set(0.5, 1);
    pin.scale.set(S * 1.1);
    const label = new Container();
    const txt = ev.text.length > 34 ? ev.text.slice(0, 33) + '…' : ev.text;
    const text = new Text({
      text: txt,
      style: { fontFamily: '"Dela Gothic One", "M PLUS Rounded 1c", sans-serif', fontSize: 22, fill: hex(PAL.plum) },
      resolution: 2,
    });
    text.scale.set(0.34);
    text.anchor.set(0.5, 0.5);
    const bg = new Graphics();
    const w = text.width + 10;
    const h = text.height + 6;
    bg.roundRect(-w / 2, -h / 2, w, h, h / 2).fill({ color: 0xffffff, alpha: 0.92 });
    bg.roundRect(-w / 2, -h / 2, w, h, h / 2).stroke({ width: 0.8, color: hex(PAL.plum), alpha: 0.5 });
    label.addChild(bg, text);
    label.position.set(0, -44);
    root.addChild(ring, pin, label);
    this.pinLayer.addChild(root);
    return { root, pin, label, ring, born: now, radius: ev.radius * TILE, fading: 0 };
  }

  private getEmoteSprite(): Sprite {
    const s = this.emotePool.pop() ?? new Sprite();
    s.anchor.set(0.5, 1);
    s.visible = true;
    s.eventMode = 'none';
    this.emoteLayer.addChild(s);
    return s;
  }

  private releaseEmote(e: EmoteSprite) {
    e.sprite.visible = false;
    this.emoteLayer.removeChild(e.sprite);
    this.emotePool.push(e.sprite);
  }

  spawnEmote(citizen: number, id: EmoteId, now: number, gentle = false) {
    const existing = this.emotes.findIndex((e) => e.citizen === citizen);
    if (existing >= 0) {
      this.releaseEmote(this.emotes[existing]);
      this.emotes.splice(existing, 1);
    }
    if (this.emotes.length > 260) {
      this.releaseEmote(this.emotes.shift()!);
    }
    const s = this.getEmoteSprite();
    s.texture = this.tex(this.sheet.emotes[id]);
    this.emotes.push({ sprite: s, citizen, born: now, life: id === 'ellipsis' ? 1100 : 1900, gentle });
  }

  private renderEmotes(world: World, alpha: number, now: number) {
    const cam = this.camera;
    for (let i = 0; i < world.citizens.length; i++) {
      const c = world.citizens[i];
      if (c.emoteTick <= this.lastEmoteTick[i]) continue;
      this.lastEmoteTick[i] = c.emoteTick;
      if (c.inside || !c.emote) continue;
      const sx = (this.ix(c, alpha) * TILE - cam.x) * cam.zoom + cam.viewW / 2;
      const sy = (this.iy(c, alpha) * TILE - cam.y) * cam.zoom + cam.viewH / 2;
      if (sx < -40 || sy < -40 || sx > cam.viewW + 40 || sy > cam.viewH + 40) continue;
      const rain = (world.weather === 'light_rain' || world.weather === 'downpour') && c.emote === 'house';
      this.spawnEmote(i, rain ? 'umbrella' : c.emote, now);
      if (c.last && c.last.tick === world.tick) this.onPop?.(c.last.action);
    }
    const keep: EmoteSprite[] = [];
    for (const e of this.emotes) {
      const age = now - e.born;
      if (age > e.life) {
        this.releaseEmote(e);
        continue;
      }
      const c = world.citizens[e.citizen];
      if (!c || c.inside) {
        this.releaseEmote(e);
        continue;
      }
      let sc: number;
      if (e.gentle) sc = Math.min(1, age / 250);
      else if (age < 150) sc = (age / 150) * 1.25;
      else if (age < 250) sc = 1.25 - ((age - 150) / 100) * 0.25;
      else sc = 1;
      const fade = age > e.life - 300 ? (e.life - age) / 300 : 1;
      e.sprite.scale.set(S * sc * 0.9);
      e.sprite.alpha = fade;
      e.sprite.position.set(this.ix(c, alpha) * TILE, this.iy(c, alpha) * TILE - CIT_H - 1);
      keep.push(e);
    }
    this.emotes = keep;
  }

  // ---------------------------------------------------------------------------
  // Particles
  // ---------------------------------------------------------------------------

  private getParticle(r: FrameRect, layer: Container): Sprite {
    const s = this.particlePool.pop() ?? new Sprite();
    s.texture = this.tex(r);
    s.anchor.set(0.5);
    s.visible = true;
    s.alpha = 1;
    s.rotation = 0;
    s.eventMode = 'none';
    layer.addChild(s);
    return s;
  }

  private releaseParticle(p: Particle) {
    p.sprite.visible = false;
    p.sprite.parent?.removeChild(p.sprite);
    this.particlePool.push(p.sprite);
  }

  private confetti(x: number, y: number) {
    if (this.particles.length > 420) return;
    const colors = [PAL.lantern, PAL.blush, PAL.lagoon, '#A6E3C8', '#BFA6F4'];
    for (let k = 0; k < 7; k++) {
      const s = this.getParticle(this.sheet.confetti, this.particleLayer);
      s.tint = hex(colors[k % colors.length]);
      s.scale.set(S);
      this.particles.push({ sprite: s, x, y, vx: (Math.random() - 0.5) * 0.09, vy: -0.08 - Math.random() * 0.06, life: 0, max: 900, gravity: 0.00022, spin: (Math.random() - 0.5) * 0.02 });
    }
  }

  private renderParticles(dt: number) {
    const keep: Particle[] = [];
    for (const p of this.particles) {
      p.life += dt;
      if (p.life > p.max) {
        this.releaseParticle(p);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.sprite.position.set(p.x, p.y);
      p.sprite.rotation += p.spin * dt;
      p.sprite.alpha = 1 - p.life / p.max;
      keep.push(p);
    }
    this.particles = keep;
  }

  private initFountain() {
    for (let k = 0; k < 26; k++) {
      const s = this.getParticle(this.sheet.dot, this.particleLayer);
      s.scale.set(S * 0.55);
      s.tint = 0xe8f8ff;
      this.fountain.push({ sprite: s, x: 0, y: 0, vx: 0, vy: 0, life: Math.random() * 900, max: 900, gravity: 0.00012, spin: 0 });
    }
  }

  private renderFountain(dt: number, reduced: boolean) {
    const fx = 19 * TILE;
    const fy = 19 * TILE - 9;
    for (const p of this.fountain) {
      p.sprite.visible = !reduced;
      if (reduced) continue;
      p.life += dt;
      if (p.life >= p.max) {
        p.life = 0;
        p.x = fx;
        p.y = fy;
        const a = Math.random() * Math.PI * 2;
        p.vx = Math.cos(a) * 0.012;
        p.vy = -0.055 - Math.random() * 0.02;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > fy + 8) p.life = p.max;
      p.sprite.position.set(p.x, p.y);
      p.sprite.alpha = 0.9;
    }
  }

  // ---------------------------------------------------------------------------
  // Lighting and weather
  // ---------------------------------------------------------------------------

  private renderLighting(world: World, now: number) {
    const L = lighting(world.minute);
    const starry = world.weather === 'starry';
    const night = Math.max(L.night, starry ? 0.45 : 0);
    this.nightOverlay.alpha = 0.55 * night;
    this.goldOverlay.tint = L.dawn > L.golden ? 0xffd0d6 : 0xffd9a6;
    this.goldOverlay.alpha = 0.32 * Math.max(L.golden, L.dawn);
    this.lights.alpha = Math.min(0.85, night * 0.95) * (0.95 + 0.05 * Math.sin(now / 700));
  }

  private renderWeather(world: World, now: number, dt: number, opts: RenderOptions) {
    const w = world.weather;
    const age = world.weatherAge();
    const f = w === 'none' ? 0 : Math.min(1, age / 20) * Math.min(1, (WEATHER_TICKS - age) / 30);
    if (w !== this.currentWeather) {
      for (const p of this.weatherParticles) this.releaseParticle(p);
      this.weatherParticles = [];
      this.currentWeather = w;
    }
    const cam = this.camera;
    const vw = cam.viewW;
    const vh = cam.viewH;
    const rain = w === 'light_rain' || w === 'downpour';
    this.weatherOverlay.tint = w === 'heatwave' ? 0xffd2a8 : w === 'fog' ? 0xdfe6ef : 0x8f9bb8;
    this.weatherOverlay.alpha = (rain ? (w === 'downpour' ? 0.5 : 0.3) : w === 'fog' ? 0.25 : w === 'heatwave' ? 0.25 : w === 'snow' ? 0.12 : 0) * f;
    const snowAge = w === 'snow' ? Math.min(1, age / 220) : 0;
    this.snowRoofs.alpha += ((snowAge * f) - this.snowRoofs.alpha) * 0.05;

    const want =
      w === 'downpour' ? 520 : w === 'light_rain' ? 220 : w === 'snow' ? 240 : w === 'wind' ? 70 : w === 'fog' ? 10 : w === 'starry' ? 90 : w === 'heatwave' ? 14 : 0;
    const target = opts.reducedMotion ? Math.floor(want * 0.4) : want;
    while (this.weatherParticles.length < target * f) {
      const kind = rain ? this.sheet.streak : w === 'snow' ? this.sheet.flake : w === 'wind' ? this.sheet.leaf : w === 'starry' ? this.sheet.star : this.sheet.blob;
      const s = this.getParticle(kind, this.weatherScreen);
      const p: Particle = { sprite: s, x: Math.random() * vw, y: Math.random() * vh, vx: 0, vy: 0, life: Math.random() * 4000, max: 1e9, gravity: 0, spin: 0 };
      if (rain) {
        s.tint = 0xdff2ff;
        s.scale.set(S * (w === 'downpour' ? 1.8 : 1.3));
        p.vy = w === 'downpour' ? 1.25 : 0.8;
        p.vx = -0.12;
        s.rotation = 0.12;
        s.alpha = 0.55;
      } else if (w === 'snow') {
        s.scale.set(S * (1 + Math.random()));
        p.vy = 0.03 + Math.random() * 0.03;
        s.alpha = 0.9;
      } else if (w === 'wind') {
        s.tint = [0x8fcf7a, 0xf4d06f, 0xe8a05c][Math.floor(Math.random() * 3)];
        s.scale.set(S * 1.5);
        p.vx = 0.5 + Math.random() * 0.3;
        p.vy = 0.05;
        p.spin = 0.01;
      } else if (w === 'starry') {
        s.tint = hex(PAL.lantern);
        s.scale.set(S * (0.5 + Math.random() * 0.8));
        p.y = Math.random() * vh * 0.7;
      } else if (w === 'fog') {
        s.scale.set(S * 14);
        s.alpha = 0.3;
        p.vx = 0.012 + Math.random() * 0.01;
      } else if (w === 'heatwave') {
        s.scale.set(S * 10, S * 2);
        s.tint = 0xffe2b8;
        s.alpha = 0.12;
        p.vy = -0.02;
      }
      this.weatherParticles.push(p);
    }
    if (this.weatherParticles.length > target * f + 5) {
      const extra = this.weatherParticles.splice(Math.floor(target * f));
      for (const p of extra) this.releaseParticle(p);
    }
    for (const p of this.weatherParticles) {
      p.life += dt;
      if (w === 'snow') p.x += Math.sin(p.life / 600 + p.y) * 0.02 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > vh + 20) {
        p.y = -20;
        p.x = Math.random() * vw;
      }
      if (p.y < -60) p.y = vh + 40;
      if (p.x > vw + 120) p.x = -120;
      if (p.x < -120) p.x = vw + 100;
      p.sprite.position.set(p.x, p.y);
      p.sprite.rotation += p.spin * dt;
      if (w === 'starry') p.sprite.alpha = (0.4 + 0.6 * Math.abs(Math.sin(p.life / 500 + p.x))) * f;
      else if (w === 'fog') p.sprite.alpha = 0.32 * f;
      else if (w === 'heatwave') p.sprite.alpha = (0.08 + 0.06 * Math.sin(p.life / 400)) * f;
      else p.sprite.alpha = (rain ? 0.55 : 0.9) * f;
    }

    // Fireworks burst above the latest fireworks event.
    const fw = w === 'fireworks' ? [...world.events].reverse().find((e) => e && e.analysis.weather === 'fireworks') : null;
    this.flashOverlay.alpha *= 0.9;
    if (fw && now > this.nextFirework && f > 0.2) {
      this.nextFirework = now + 700 + Math.random() * 700;
      const bx = fw.ox * TILE + (Math.random() - 0.5) * 320;
      const by = fw.oy * TILE - 110 - Math.random() * 120;
      const colors = [PAL.lantern, PAL.blush, PAL.lagoon, '#FFFFFF', '#BFA6F4', '#A6E3C8'];
      const col = hex(colors[Math.floor(Math.random() * colors.length)]);
      const n = opts.reducedMotion ? 18 : 46;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const sp = 0.07 + Math.random() * 0.05;
        const s = this.getParticle(this.sheet.dot, this.weatherWorld);
        s.tint = col;
        s.scale.set(S * (1.5 + Math.random()));
        s.blendMode = 'add';
        this.particlesWorld.push({ sprite: s, x: bx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 1600, gravity: 0.00004, spin: 0 });
      }
      if (!opts.reducedMotion) this.flashOverlay.alpha = 0.1;
    }
    const keep: Particle[] = [];
    for (const p of this.particlesWorld) {
      p.life += dt;
      if (p.life > p.max) {
        p.sprite.blendMode = 'normal';
        this.releaseParticle(p);
        continue;
      }
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.sprite.position.set(p.x, p.y);
      p.sprite.alpha = 1 - p.life / p.max;
      keep.push(p);
    }
    this.particlesWorld = keep;

    // Rainbow arc
    this.rainbowG.clear();
    if (w === 'rainbow' && f > 0) {
      const cx = vw * 0.5;
      const cy = vh * 1.05;
      const R = Math.max(vw, vh) * 0.75;
      const bands = [0xff9aa2, 0xffc48a, 0xffe58a, 0xa8e6a1, 0x9ccaf2, 0xc3a6f0];
      bands.forEach((col, k) => {
        this.rainbowG.arc(cx, cy, R - k * 14, Math.PI * 1.08, Math.PI * 1.92).stroke({ width: 14, color: col, alpha: 0.3 * f });
      });
    }
  }

  private particlesWorld: Particle[] = [];

  // ---------------------------------------------------------------------------
  // Picking and export
  // ---------------------------------------------------------------------------

  pickCitizen(sx: number, sy: number): number | null {
    const world = this.worldRef;
    if (!world) return null;
    const p = this.camera.screenToWorld(sx, sy);
    const tol = Math.max(4, 10 / this.camera.zoom);
    let best: number | null = null;
    let bestD = Infinity;
    for (const c of world.citizens) {
      if (c.inside) continue;
      const cx = c.x * TILE;
      const cy = c.y * TILE - 8;
      const dx = p.x - cx;
      const dy = p.y - cy;
      const d = dx * dx + dy * dy * 0.6;
      if (Math.abs(dx) < tol && Math.abs(dy) < tol + 4 && d < bestD) {
        bestD = d;
        best = c.id;
      }
    }
    return best;
  }

  pickPlace(sx: number, sy: number): PlaceId | null {
    const p = this.camera.screenToWorld(sx, sy);
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor(p.y / TILE);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return null;
    for (const def of Object.values(PLACE_DEFS)) {
      const rects = def.building ? [...def.area, def.building] : def.area;
      if (rects.some((r) => tx >= r.x0 - 1 && tx <= r.x1 + 1 && ty >= r.y0 - 1 && ty <= r.y1 + 1)) return def.id;
    }
    return null;
  }

  snapshot(): HTMLCanvasElement {
    return this.app.renderer.extract.canvas({ target: this.app.stage, resolution: Math.min(2, window.devicePixelRatio || 1) }) as HTMLCanvasElement;
  }

  bodyColor(c: Citizen): string {
    return BODY_COLORS[c.color];
  }
}
