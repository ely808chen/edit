import type { EmoteId } from '../../../shared/actions';
import type { AccessoryId } from '../../../shared/archetypes';
import type { Category } from '../../../shared/types';
import { BODY_COLORS, PAL } from './palette';

export const SPRITE_RES = 3;
export const CIT_W = 14;
export const CIT_H = 18;
export const CIT_FRAMES = 5; // 4 walk frames + blink
export const EMOTE_SIZE = 18;

type Ctx = CanvasRenderingContext2D;

export interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpriteSheet {
  canvas: HTMLCanvasElement;
  citizens: FrameRect[][]; // [color][frame]
  emotes: Record<EmoteId, FrameRect>;
  pins: Record<Category, FrameRect>;
  ghostPin: FrameRect;
  umbrella: FrameRect;
  phone: FrameRect;
  dot: FrameRect;
  streak: FrameRect;
  flake: FrameRect;
  leaf: FrameRect;
  confetti: FrameRect;
  star: FrameRect;
  blob: FrameRect;
  ring: FrameRect;
  select: FrameRect;
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v + (255 - v) * amt);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function darken(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v * (1 - amt));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

const INK = PAL.plum;

const ACCESSORY_BY_COLOR: AccessoryId[] = ['backpack', 'backpack', 'tie', 'tie', 'nursecap', 'scarf', 'scarf', 'apron', 'headphones', 'headphones', 'cap', 'beret'];

function drawCitizen(ctx: Ctx, color: string, acc: AccessoryId, frame: number) {
  const blink = frame === 4;
  const f = blink ? 0 : frame;
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  // legs
  const legY = 14.2;
  const stride = f === 1 ? 1.4 : f === 3 ? -1.4 : 0;
  ctx.fillStyle = darken(color, 0.35);
  rr(ctx, 4.6 - stride * 0.6, legY + (f === 1 ? -0.4 : 0), 2, 3.6, 1);
  ctx.fill();
  rr(ctx, 7.6 + stride * 0.6, legY + (f === 3 ? -0.4 : 0), 2, 3.6, 1);
  ctx.fill();
  // backpack sits behind the body
  if (acc === 'backpack') {
    ctx.fillStyle = '#E58C6E';
    rr(ctx, 1.4, 8.6, 3.4, 5.4, 1.4);
    ctx.fill();
    ctx.stroke();
  }
  // body bean
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(7, 7);
  ctx.bezierCurveTo(11.6, 7, 11.8, 12, 11, 14.2);
  ctx.bezierCurveTo(10.2, 16.2, 3.8, 16.2, 3, 14.2);
  ctx.bezierCurveTo(2.2, 12, 2.4, 7, 7, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(5.2, 10, 1.1, 2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // accessories on the body
  if (acc === 'tie') {
    ctx.fillStyle = '#5E6FA8';
    ctx.beginPath();
    ctx.moveTo(9, 8.4);
    ctx.lineTo(10.2, 8.4);
    ctx.lineTo(10, 12.6);
    ctx.lineTo(9.2, 12.6);
    ctx.closePath();
    ctx.fill();
  }
  if (acc === 'apron') {
    ctx.fillStyle = '#FFFFFF';
    rr(ctx, 7.2, 9.4, 3.8, 5.6, 1.2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,46,92,0.5)';
    ctx.stroke();
    ctx.strokeStyle = INK;
  }
  if (acc === 'scarf') {
    ctx.fillStyle = '#E8846B';
    rr(ctx, 3.6, 7.6, 7.6, 2, 1);
    ctx.fill();
    rr(ctx, 4.2, 8.6, 1.8, 3.4, 0.8);
    ctx.fill();
  }
  // head
  ctx.fillStyle = lighten(color, 0.45);
  ctx.beginPath();
  ctx.arc(7.6, 4.8, 3.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // cheek
  ctx.fillStyle = 'rgba(255,150,170,0.55)';
  ctx.beginPath();
  ctx.arc(10.2, 6, 0.8, 0, Math.PI * 2);
  ctx.fill();
  // eyes
  ctx.fillStyle = INK;
  if (blink) {
    ctx.fillRect(8, 4.6, 1.2, 0.5);
    ctx.fillRect(9.9, 4.6, 1.2, 0.5);
  } else {
    ctx.beginPath();
    ctx.arc(8.6, 4.6, 0.62, 0, Math.PI * 2);
    ctx.arc(10.5, 4.6, 0.62, 0, Math.PI * 2);
    ctx.fill();
  }
  // head accessories
  switch (acc) {
    case 'nursecap':
      ctx.fillStyle = '#FFFFFF';
      rr(ctx, 5.6, 0.6, 4.4, 2, 0.6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#5FB6C9';
      ctx.fillRect(7.4, 0.9, 0.8, 1.4);
      ctx.fillRect(7.1, 1.2, 1.4, 0.8);
      break;
    case 'headphones':
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(7.6, 4.6, 4.1, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.fillStyle = '#6D5A9E';
      rr(ctx, 3, 3.8, 1.8, 3, 0.8);
      ctx.fill();
      ctx.lineWidth = 0.8;
      break;
    case 'cap':
      ctx.fillStyle = '#5FA3D6';
      ctx.beginPath();
      ctx.arc(7.6, 3.6, 3.8, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      rr(ctx, 9, 2.9, 3.6, 1.2, 0.6);
      ctx.fill();
      break;
    case 'beret':
      ctx.fillStyle = '#7A5C9E';
      ctx.beginPath();
      ctx.ellipse(7, 1.8, 4, 1.6, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    default:
      break;
  }
}

function bubble(ctx: Ctx, s: number, small = false) {
  const r = small ? s * 0.34 : s * 0.42;
  const cx = s / 2;
  const cy = s / 2 - 1;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 2, cy + r - 0.8);
  ctx.lineTo(cx, cy + r + 2.6);
  ctx.lineTo(cx + 2, cy + r - 0.8);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 2, cy + r - 0.3);
  ctx.lineTo(cx, cy + r + 2.6);
  ctx.lineTo(cx + 2, cy + r - 0.3);
  ctx.stroke();
}

function bang(ctx: Ctx, cx: number, cy: number, color: string, scale = 1) {
  ctx.fillStyle = color;
  rr(ctx, cx - 1.3 * scale, cy - 5 * scale, 2.6 * scale, 6.4 * scale, 1.3 * scale);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy + 3.4 * scale, 1.4 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawEmote(ctx: Ctx, id: EmoteId, s: number) {
  const cx = s / 2;
  const cy = s / 2 - 1;
  if (id === 'shimmer') {
    ctx.fillStyle = PAL.lantern;
    star(ctx, cx, cy, 4.5, 1.4);
    ctx.fillStyle = '#FFFFFF';
    star(ctx, cx, cy, 2.2, 0.7);
    return;
  }
  if (id === 'ellipsis') {
    bubble(ctx, s, true);
    ctx.fillStyle = '#9B92B4';
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.arc(cx + k * 2.4, cy, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  bubble(ctx, s);
  ctx.lineCap = 'round';
  switch (id) {
    case 'bang':
      bang(ctx, cx, cy - 0.4, '#F29E4C');
      break;
    case 'sweatbang':
      bang(ctx, cx - 1.8, cy - 0.4, '#C04E6E', 0.9);
      drop(ctx, cx + 2.8, cy - 0.5, 2.2);
      break;
    case 'question':
      ctx.strokeStyle = '#8E7CC3';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 2.6, Math.PI * 1.1, Math.PI * 2.35);
      ctx.lineTo(cx, cy + 1.6);
      ctx.stroke();
      ctx.fillStyle = '#8E7CC3';
      ctx.beginPath();
      ctx.arc(cx, cy + 4, 1.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'heart':
      ctx.fillStyle = '#F2708F';
      ctx.beginPath();
      ctx.moveTo(cx, cy + 4);
      ctx.bezierCurveTo(cx - 6, cy - 0.5, cx - 3, cy - 5.5, cx, cy - 2.2);
      ctx.bezierCurveTo(cx + 3, cy - 5.5, cx + 6, cy - 0.5, cx, cy + 4);
      ctx.fill();
      break;
    case 'sweat':
      drop(ctx, cx, cy, 3.2);
      break;
    case 'sparkle':
      ctx.fillStyle = '#F4B63F';
      star(ctx, cx, cy, 5, 1.6);
      ctx.fillStyle = PAL.lantern;
      star(ctx, cx + 3.6, cy - 3.4, 2, 0.6);
      break;
    case 'dots':
      ctx.fillStyle = '#B169A6';
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.arc(cx + k * 3.2, cy, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'flash':
      ctx.fillStyle = PAL.plum;
      rr(ctx, cx - 4.6, cy - 2.4, 9.2, 6.2, 1.4);
      ctx.fill();
      ctx.fillRect(cx - 1.6, cy - 3.8, 3.2, 1.6);
      ctx.fillStyle = '#6FB7D6';
      ctx.beginPath();
      ctx.arc(cx, cy + 0.7, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PAL.lantern;
      star(ctx, cx + 4.6, cy - 4.4, 2.4, 0.7);
      break;
    case 'hands':
      ctx.fillStyle = '#7CC49A';
      rr(ctx, cx - 1.4, cy - 4.4, 2.8, 8.8, 1);
      ctx.fill();
      rr(ctx, cx - 4.4, cy - 1.4, 8.8, 2.8, 1);
      ctx.fill();
      break;
    case 'grumble':
      ctx.strokeStyle = '#8C6448';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy + 1);
      for (let k = 0; k < 5; k++) ctx.lineTo(cx - 4 + k * 2.2, cy + (k % 2 === 0 ? -2.2 : 1.8));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 3.8, cy - 4.5);
      ctx.lineTo(cx - 1, cy - 3.2);
      ctx.moveTo(cx + 3.8, cy - 4.5);
      ctx.lineTo(cx + 1, cy - 3.2);
      ctx.stroke();
      break;
    case 'umbrella':
      ctx.fillStyle = '#6FA8DC';
      ctx.beginPath();
      ctx.arc(cx, cy, 5, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = PAL.plum;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy + 4);
      ctx.arc(cx - 1.2, cy + 4, 1.2, 0, Math.PI);
      ctx.stroke();
      break;
    case 'house':
      ctx.fillStyle = '#7D93C9';
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy);
      ctx.lineTo(cx, cy - 5);
      ctx.lineTo(cx + 5, cy);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(cx - 3.6, cy - 0.5, 7.2, 5);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - 1, cy + 1.4, 2, 3.1);
      break;
    case 'zzz':
      ctx.strokeStyle = '#7D93C9';
      ctx.lineWidth = 1.3;
      for (const [zx, zy, zs] of [[cx - 2.5, cy + 1.5, 3.4], [cx + 2.2, cy - 2.5, 2.4]]) {
        ctx.beginPath();
        ctx.moveTo(zx - zs / 2, zy - zs / 2);
        ctx.lineTo(zx + zs / 2, zy - zs / 2);
        ctx.lineTo(zx - zs / 2, zy + zs / 2);
        ctx.lineTo(zx + zs / 2, zy + zs / 2);
        ctx.stroke();
      }
      break;
  }
}

function drop(ctx: Ctx, cx: number, cy: number, r: number) {
  ctx.fillStyle = '#7CC6D9';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 1.6);
  ctx.bezierCurveTo(cx + r, cy - 0.2, cx + r, cy + r, cx, cy + r);
  ctx.bezierCurveTo(cx - r, cy + r, cx - r, cy - 0.2, cx, cy - r * 1.6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(cx - r * 0.35, cy + r * 0.1, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

function star(ctx: Ctx, cx: number, cy: number, r: number, inner: number) {
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 - Math.PI / 2;
    const rad = k % 2 === 0 ? r : inner;
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}

function pinShape(ctx: Ctx, w: number, h: number) {
  const cx = w / 2;
  const r = w / 2 - 1.5;
  ctx.beginPath();
  ctx.arc(cx, r + 1.5, r, Math.PI * 0.8, Math.PI * 2.2);
  ctx.quadraticCurveTo(cx + r * 0.6, h * 0.72, cx, h - 1);
  ctx.quadraticCurveTo(cx - r * 0.6, h * 0.72, cx - r * Math.cos(Math.PI * 0.2), r + 1.5 + r * Math.sin(Math.PI * 0.2));
  ctx.closePath();
}

function categoryIcon(ctx: Ctx, cat: Category, cx: number, cy: number) {
  ctx.fillStyle = PAL.plum;
  ctx.strokeStyle = PAL.plum;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  switch (cat) {
    case 'free_food':
      ctx.beginPath();
      ctx.arc(cx, cy - 0.5, 4, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 1, cy - 1.5);
      ctx.lineTo(cx + 3.5, cy - 5);
      ctx.moveTo(cx + 1, cy - 1.5);
      ctx.lineTo(cx + 4.5, cy - 4);
      ctx.stroke();
      break;
    case 'weather':
      ctx.beginPath();
      ctx.arc(cx - 1.8, cy, 2.4, 0, Math.PI * 2);
      ctx.arc(cx + 1.4, cy - 1, 2.8, 0, Math.PI * 2);
      ctx.arc(cx + 3, cy + 0.8, 1.8, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'danger':
      ctx.beginPath();
      ctx.moveTo(cx, cy - 4.5);
      ctx.lineTo(cx + 4.5, cy + 3.5);
      ctx.lineTo(cx - 4.5, cy + 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - 0.6, cy - 1.8, 1.2, 3);
      ctx.fillRect(cx - 0.6, cy + 1.8, 1.2, 1);
      break;
    case 'rumor':
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx, cy - 1.5, 2.3, Math.PI * 1.1, Math.PI * 2.35);
      ctx.lineTo(cx, cy + 1.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + 3.5, 1, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'celebration':
      star(ctx, cx, cy, 4.8, 2);
      break;
    case 'spectacle':
      star(ctx, cx, cy, 5, 1.2);
      break;
    case 'animal':
      ctx.beginPath();
      ctx.ellipse(cx, cy + 1.6, 2.6, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const [dx, dy] of [[-3, -1.5], [-1.1, -3.4], [1.1, -3.4], [3, -1.5]]) {
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy, 1.05, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'silly':
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - 1.6, cy - 1.5, 0.9, 0, Math.PI * 2);
      ctx.arc(cx + 1.6, cy - 1.5, 0.9, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'announcement':
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 1.5);
      ctx.lineTo(cx + 3, cy - 4.5);
      ctx.lineTo(cx + 3, cy + 4.5);
      ctx.lineTo(cx - 4, cy + 1.5);
      ctx.closePath();
      ctx.fill();
      break;
    default:
      ctx.beginPath();
      ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
      ctx.fill();
  }
}

export function buildSpriteSheet(): SpriteSheet {
  const R = SPRITE_RES;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  let cx = 0;
  let cy = 0;
  let rowH = 0;
  const alloc = (w: number, h: number): FrameRect => {
    const pw = Math.ceil(w * R) + 2;
    const ph = Math.ceil(h * R) + 2;
    if (cx + pw > canvas.width) {
      cx = 0;
      cy += rowH;
      rowH = 0;
    }
    const r = { x: cx + 1, y: cy + 1, w: Math.ceil(w * R), h: Math.ceil(h * R) };
    cx += pw;
    rowH = Math.max(rowH, ph);
    return r;
  };
  const paint = (r: FrameRect, fn: (c: Ctx) => void) => {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.scale(R, R);
    fn(ctx);
    ctx.restore();
  };

  const citizens: FrameRect[][] = BODY_COLORS.map((color, ci) => {
    const frames: FrameRect[] = [];
    for (let f = 0; f < CIT_FRAMES; f++) {
      const r = alloc(CIT_W, CIT_H);
      paint(r, (c) => drawCitizen(c, color, ACCESSORY_BY_COLOR[ci], f));
      frames.push(r);
    }
    return frames;
  });

  const emoteIds: EmoteId[] = ['bang', 'question', 'heart', 'sweat', 'sparkle', 'dots', 'flash', 'hands', 'grumble', 'ellipsis', 'umbrella', 'house', 'zzz', 'sweatbang', 'shimmer'];
  const emotes = {} as Record<EmoteId, FrameRect>;
  for (const id of emoteIds) {
    const r = alloc(EMOTE_SIZE, EMOTE_SIZE);
    paint(r, (c) => drawEmote(c, id, EMOTE_SIZE));
    emotes[id] = r;
  }

  const cats: Category[] = ['free_food', 'weather', 'danger', 'rumor', 'celebration', 'spectacle', 'animal', 'silly', 'announcement', 'other'];
  const pins = {} as Record<Category, FrameRect>;
  for (const cat of cats) {
    const r = alloc(22, 30);
    paint(r, (c) => {
      c.fillStyle = PAL.blush;
      pinShape(c, 22, 30);
      c.fill();
      c.strokeStyle = PAL.plum;
      c.lineWidth = 1.2;
      c.stroke();
      c.fillStyle = '#FFFFFF';
      c.beginPath();
      c.arc(11, 10.5, 7, 0, Math.PI * 2);
      c.fill();
      categoryIcon(c, cat, 11, 10.5);
    });
    pins[cat] = r;
  }
  const ghostPin = alloc(22, 30);
  paint(ghostPin, (c) => {
    c.fillStyle = 'rgba(255,255,255,0.55)';
    pinShape(c, 22, 30);
    c.fill();
    c.setLineDash([2.4, 2]);
    c.strokeStyle = PAL.plum;
    c.lineWidth = 1.2;
    c.stroke();
  });

  const umbrella = alloc(16, 11);
  paint(umbrella, (c) => {
    const cols = ['#6FA8DC', '#FFFFFF'];
    for (let k = 0; k < 4; k++) {
      c.fillStyle = cols[k % 2];
      c.beginPath();
      c.moveTo(8, 7);
      c.arc(8, 7, 7, Math.PI + (k * Math.PI) / 4, Math.PI + ((k + 1) * Math.PI) / 4);
      c.closePath();
      c.fill();
    }
    c.strokeStyle = PAL.plum;
    c.lineWidth = 0.8;
    c.beginPath();
    c.arc(8, 7, 7, Math.PI, 0);
    c.closePath();
    c.stroke();
    c.beginPath();
    c.moveTo(8, 7);
    c.lineTo(8, 10.5);
    c.stroke();
  });
  const phone = alloc(4, 5);
  paint(phone, (c) => {
    c.fillStyle = PAL.plum;
    rr(c, 0.3, 0.3, 3.4, 4.4, 0.8);
    c.fill();
    c.fillStyle = '#9FD6E8';
    c.fillRect(0.9, 0.9, 2.2, 2.8);
  });
  const dot = alloc(6, 6);
  paint(dot, (c) => {
    const g = c.createRadialGradient(3, 3, 0, 3, 3, 3);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 6, 6);
  });
  const streak = alloc(1.4, 9);
  paint(streak, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 9);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,0.95)');
    c.fillStyle = g;
    rr(c, 0, 0, 1.4, 9, 0.7);
    c.fill();
  });
  const flake = alloc(5, 5);
  paint(flake, (c) => {
    c.fillStyle = '#FFFFFF';
    c.beginPath();
    c.arc(2.5, 2.5, 1.8, 0, Math.PI * 2);
    c.fill();
  });
  const leaf = alloc(6, 4);
  paint(leaf, (c) => {
    c.fillStyle = '#FFFFFF';
    c.beginPath();
    c.ellipse(3, 2, 2.8, 1.4, 0.3, 0, Math.PI * 2);
    c.fill();
  });
  const confetti = alloc(2.5, 1.6);
  paint(confetti, (c) => {
    c.fillStyle = '#FFFFFF';
    c.fillRect(0, 0, 2.5, 1.6);
  });
  const starR = alloc(9, 9);
  paint(starR, (c) => {
    c.fillStyle = '#FFFFFF';
    star(c, 4.5, 4.5, 4.4, 1);
  });
  const blob = alloc(64, 40);
  paint(blob, (c) => {
    const g = c.createRadialGradient(32, 20, 0, 32, 20, 30);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.scale(1, 40 / 64);
    c.beginPath();
    c.arc(32, 32, 32, 0, Math.PI * 2);
    c.fill();
  });
  const ring = alloc(64, 64);
  paint(ring, (c) => {
    c.strokeStyle = '#FFFFFF';
    c.lineWidth = 1.4;
    c.beginPath();
    c.arc(32, 32, 31, 0, Math.PI * 2);
    c.stroke();
  });
  const select = alloc(16, 8);
  paint(select, (c) => {
    c.strokeStyle = '#FFFFFF';
    c.lineWidth = 1.6;
    c.beginPath();
    c.ellipse(8, 4, 7, 3, 0, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = PAL.plum;
    c.lineWidth = 0.7;
    c.beginPath();
    c.ellipse(8, 4, 7.6, 3.4, 0, 0, Math.PI * 2);
    c.stroke();
  });

  return { canvas, citizens, emotes, pins, ghostPin, umbrella, phone, dot, streak, flake, leaf, confetti, star: starR, blob, ring, select };
}
