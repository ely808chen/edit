import { MAP_H, MAP_W } from '../engine/townMap';
import { TILE } from './palette';

const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface Shot {
  x: number;
  y: number;
  zoom: number;
  dur: number;
}

export class Camera {
  x = WORLD_W / 2;
  y = WORLD_H / 2;
  zoom = 1;
  viewW = 800;
  viewH = 600;
  /** Screen-space padding reserved by UI (top/bottom) so framing avoids panels. */
  padTop = 0;
  padBottom = 0;
  followId: number | null = null;
  private shots: Shot[] = [];
  private shotStart = 0;
  private from: { x: number; y: number; zoom: number } | null = null;
  private holdUntil = 0;

  get fitZoom(): number {
    return Math.min(this.viewW / WORLD_W, (this.viewH - this.padTop - this.padBottom) / WORLD_H);
  }

  get isPortrait(): boolean {
    return this.viewH > this.viewW * 1.1;
  }

  get minZoom(): number {
    return Math.max(0.2, this.isPortrait ? Math.min(this.fitZoom, (this.viewH / WORLD_H) * 0.55) : this.fitZoom * 0.92);
  }

  get maxZoom(): number {
    return 3.2;
  }

  get defaultZoom(): number {
    if (this.isPortrait) return Math.max(this.minZoom, Math.min(1.1, (this.viewH / WORLD_H) * 0.72));
    return Math.max(this.minZoom, this.fitZoom * 1.02);
  }

  resize(w: number, h: number) {
    const first = this.viewW === 800 && this.viewH === 600;
    this.viewW = w;
    this.viewH = h;
    if (first) this.reset();
    this.clamp();
  }

  reset() {
    this.zoom = this.defaultZoom;
    this.x = this.isPortrait ? 27 * TILE : WORLD_W / 2;
    this.y = this.isPortrait ? 16 * TILE : WORLD_H / 2 + (this.padTop - this.padBottom) / 2 / this.zoom;
    this.clamp();
  }

  clamp() {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));
    const halfW = this.viewW / 2 / this.zoom;
    const halfH = this.viewH / 2 / this.zoom;
    const marginX = TILE * 2;
    const marginY = TILE * 3;
    if (halfW * 2 >= WORLD_W + marginX * 2) this.x = WORLD_W / 2;
    else this.x = Math.max(halfW - marginX, Math.min(WORLD_W - halfW + marginX, this.x));
    if (halfH * 2 >= WORLD_H + marginY * 2) this.y = WORLD_H / 2;
    else this.y = Math.max(halfH - marginY, Math.min(WORLD_H - halfH + marginY, this.y));
  }

  screenToWorld(sx: number, sy: number) {
    return { x: (sx - this.viewW / 2) / this.zoom + this.x, y: (sy - this.viewH / 2) / this.zoom + this.y };
  }

  worldToScreen(wx: number, wy: number) {
    return { x: (wx - this.x) * this.zoom + this.viewW / 2, y: (wy - this.y) * this.zoom + this.viewH / 2 };
  }

  pan(dx: number, dy: number) {
    this.cancelDirector();
    this.followId = null;
    this.x -= dx / this.zoom;
    this.y -= dy / this.zoom;
    this.clamp();
  }

  zoomAt(sx: number, sy: number, factor: number) {
    this.cancelDirector();
    const before = this.screenToWorld(sx, sy);
    this.zoom *= factor;
    this.clamp();
    const after = this.screenToWorld(sx, sy);
    if (this.followId === null) {
      this.x += before.x - after.x;
      this.y += before.y - after.y;
    }
    this.clamp();
  }

  get directing(): boolean {
    return this.shots.length > 0 || this.holdUntil > 0;
  }

  cancelDirector() {
    this.shots = [];
    this.from = null;
    this.holdUntil = 0;
  }

  /** Ease to the event, hold, then pull back to reveal the ripple. */
  direct(now: number, wx: number, wy: number, radiusPx: number) {
    this.followId = null;
    const close = Math.min(this.maxZoom, Math.max(this.defaultZoom * 1.7, 1.6));
    const reveal = Math.max(this.minZoom, Math.min(this.defaultZoom, Math.min(this.viewW, this.viewH) / (radiusPx * 2.6)));
    this.shots = [
      { x: wx, y: wy, zoom: close, dur: 600 },
      { x: wx, y: wy, zoom: close, dur: 1200 },
      { x: wx, y: wy, zoom: reveal, dur: 2500 },
    ];
    this.shotStart = now;
    this.from = { x: this.x, y: this.y, zoom: this.zoom };
  }

  glideTo(now: number, wx: number, wy: number, zoom: number, dur = 900) {
    this.followId = null;
    this.shots = [{ x: wx, y: wy, zoom, dur }];
    this.shotStart = now;
    this.from = { x: this.x, y: this.y, zoom: this.zoom };
  }

  update(now: number, followPos: { x: number; y: number } | null) {
    if (this.shots.length && this.from) {
      const shot = this.shots[0];
      const t = Math.min(1, (now - this.shotStart) / shot.dur);
      const e = easeInOut(t);
      this.x = this.from.x + (shot.x - this.from.x) * e;
      this.y = this.from.y + (shot.y - this.from.y) * e;
      this.zoom = this.from.zoom + (shot.zoom - this.from.zoom) * e;
      if (t >= 1) {
        this.shots.shift();
        this.from = { x: this.x, y: this.y, zoom: this.zoom };
        this.shotStart = now;
      }
      this.clamp();
      return;
    }
    if (followPos) {
      this.x += (followPos.x - this.x) * 0.12;
      this.y += (followPos.y - this.y) * 0.12;
      this.clamp();
    }
  }
}
