import { hrand } from '../../../shared/hash';
import { MAP_H, MAP_W, PLACE_DEFS, SHOP_RECTS, type TownMap } from '../engine/townMap';
import { PAL, ROOFS, TEX_RES, TILE } from './palette';

export interface TownCanvases {
  base: HTMLCanvasElement;
  lights: HTMLCanvasElement;
  snow: HTMLCanvasElement;
  shimmer: HTMLCanvasElement;
}

type Ctx = CanvasRenderingContext2D;

const W = MAP_W * TILE;
const H = MAP_H * TILE;

function makeCanvas(): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = W * TEX_RES;
  c.height = H * TEX_RES;
  const ctx = c.getContext('2d')!;
  ctx.scale(TEX_RES, TEX_RES);
  return [c, ctx];
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

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `rgb(${r},${g},${b})`;
}

const INK = 'rgba(58,46,92,0.55)';
const SHADOW = 'rgba(58,46,92,0.16)';

interface Painter {
  base: Ctx;
  lights: Ctx;
  snow: Ctx;
}

// ---------------------------------------------------------------------------
// Ground
// ---------------------------------------------------------------------------

function isRoadLike(c: string) {
  return c === '=' || c === 'B' || c === 'p' || c === 'a' || c === 'b' || c === 'k' || c === '#';
}

function paintGround(ctx: Ctx, map: TownMap) {
  ctx.fillStyle = PAL.meadow;
  ctx.fillRect(0, 0, W, H);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H ? '~' : map.tiles[y][x]);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const c = at(x, y);
      const px = x * TILE;
      const py = y * TILE;
      switch (c) {
        case 'g':
        case 'f':
          ctx.fillStyle = (x + y) % 2 === 0 ? PAL.lawn : '#A2D49B';
          ctx.fillRect(px, py, TILE, TILE);
          break;
        case '=':
        case 'B':
          ctx.fillStyle = PAL.road;
          ctx.fillRect(px, py, TILE, TILE);
          break;
        case 'p':
        case '#':
          ctx.fillStyle = PAL.plaza;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.strokeStyle = PAL.plazaLine;
          ctx.lineWidth = 0.6;
          ctx.strokeRect(px + 0.3, py + 0.3, TILE - 0.6, TILE - 0.6);
          break;
        case 'a':
          ctx.fillStyle = (x % 2 === 0) ? '#F5DFBC' : '#F0D5AE';
          ctx.fillRect(px, py, TILE, TILE);
          break;
        case 's':
          ctx.fillStyle = PAL.sand;
          ctx.fillRect(px, py, TILE, TILE);
          for (let k = 0; k < 3; k++) {
            ctx.fillStyle = 'rgba(190,160,120,0.35)';
            ctx.fillRect(px + hrand(x, y, k) * TILE, py + hrand(y, x, k + 9) * TILE, 1, 1);
          }
          break;
        case '~': {
          const deep = y >= 37;
          ctx.fillStyle = deep ? (y >= 38 ? PAL.seaDeep : PAL.sea) : PAL.lagoon;
          ctx.fillRect(px, py, TILE, TILE);
          break;
        }
        case 'd':
          ctx.fillStyle = PAL.dirt;
          ctx.fillRect(px, py, TILE, TILE);
          break;
        case 'k':
          ctx.fillStyle = PAL.stone;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.strokeStyle = PAL.stoneDark;
          ctx.lineWidth = 0.8;
          for (let k = 1; k < 4; k++) {
            ctx.beginPath();
            ctx.moveTo(px, py + k * 5);
            ctx.lineTo(px + TILE, py + k * 5);
            ctx.stroke();
          }
          break;
        case 'b':
          ctx.fillStyle = '#D6C6B2';
          ctx.fillRect(px, py, TILE, TILE);
          ctx.strokeStyle = 'rgba(150,130,110,0.5)';
          ctx.lineWidth = 0.6;
          for (let k = 0; k < 4; k++) ctx.strokeRect(px + (k % 2) * 10, py + Math.floor(k / 2) * 10, 10, 10);
          break;
        case 'r':
          ctx.fillStyle = x >= 44 && x <= 46 ? PAL.lagoon : '#D3C5B0';
          ctx.fillRect(px, py, TILE, TILE);
          break;
        default: {
          ctx.fillStyle = PAL.meadow;
          ctx.fillRect(px, py, TILE, TILE);
          if (hrand(x, y, 3) < 0.35) {
            ctx.fillStyle = PAL.meadowDark;
            const tx = px + 3 + hrand(x, y, 4) * 12;
            const ty = py + 4 + hrand(x, y, 5) * 12;
            ctx.beginPath();
            ctx.ellipse(tx, ty, 2.2, 1.1, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }

  // Road edges and water banks.
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const c = at(x, y);
      const px = x * TILE;
      const py = y * TILE;
      if (c === '=' || c === 'B') {
        ctx.fillStyle = PAL.roadEdge;
        const nb = [at(x, y - 1), at(x, y + 1), at(x - 1, y), at(x + 1, y)];
        if (!isRoadLike(nb[0]) && nb[0] !== '~') ctx.fillRect(px, py, TILE, 1.2);
        if (!isRoadLike(nb[1]) && nb[1] !== '~') ctx.fillRect(px, py + TILE - 1.2, TILE, 1.2);
        if (!isRoadLike(nb[2]) && nb[2] !== '~') ctx.fillRect(px, py, 1.2, TILE);
        if (!isRoadLike(nb[3]) && nb[3] !== '~') ctx.fillRect(px + TILE - 1.2, py, 1.2, TILE);
        // Soft center dashes on long roads.
        const horiz = isRoadLike(nb[2]) && isRoadLike(nb[3]) && !isRoadLike(nb[0]);
        if (horiz && x % 2 === 0 && c === '=') {
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          rr(ctx, px + 6, py + TILE / 2 - 0.7, 8, 1.4, 0.7);
          ctx.fill();
        }
      }
      if (c === '~') {
        const up = at(x, y - 1);
        const down = at(x, y + 1);
        const left = at(x - 1, y);
        const right = at(x + 1, y);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        if (up !== '~' && up !== 'r' && up !== 'b' && up !== 'B') {
          for (let k = 0; k < 4; k++) {
            ctx.beginPath();
            ctx.ellipse(px + 2.5 + k * 5, py + 1.6, 2.6, 1.2, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        if (left !== '~' && left !== 'b' && left !== 'B' && left !== 'r') ctx.fillRect(px, py, 1.5, TILE);
        if (right !== '~' && right !== 'b' && right !== 'B' && right !== 'r') ctx.fillRect(px + TILE - 1.5, py, 1.5, TILE);
        if (down !== '~' && down !== 'b' && down !== 'B' && down !== 'r' && down !== 's') {
          ctx.fillStyle = 'rgba(58,46,92,0.12)';
          ctx.fillRect(px, py + TILE - 2, TILE, 2);
        }
      }
      if (c === 's' && at(x, y + 1) === '~') {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(px, py + TILE - 3, TILE, 3);
      }
    }
  }

  // Railway: sleepers and rails.
  ctx.fillStyle = PAL.woodDark;
  for (let x = 0; x < 48; x++) {
    for (let k = 0; k < 4; k++) {
      ctx.globalAlpha = 0.55;
      ctx.fillRect(x * TILE + k * 5 + 1, TILE + 4, 2.4, 12);
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#8E8A9C';
  ctx.fillRect(0, TILE + 6, 48 * TILE, 1.4);
  ctx.fillRect(0, TILE + 13, 48 * TILE, 1.4);

  // Sports ground track lines.
  const sg = PLACE_DEFS.school.area[0];
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.2;
  rr(ctx, (sg.x0 + 0.5) * TILE, 17.4 * TILE, (sg.x1 - sg.x0) * TILE, 7.1 * TILE, 2.8 * TILE);
  ctx.stroke();
  rr(ctx, (sg.x0 + 1.4) * TILE, 18.3 * TILE, (sg.x1 - sg.x0 - 1.8) * TILE, 5.3 * TILE, 2 * TILE);
  ctx.stroke();

  // Park flower beds.
  const flowerColors = ['#FFB7C5', '#FFE08A', '#FFFFFF', '#C9B6F2'];
  for (let y = 13; y <= 25; y++) {
    for (let x = 8; x <= 29; x++) {
      if (map.tiles[y][x] !== 'g' || hrand(x, y, 21) > 0.18) continue;
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = flowerColors[Math.floor(hrand(x, y, k + 30) * flowerColors.length)];
        ctx.beginPath();
        ctx.arc(x * TILE + 4 + hrand(x, y, k + 40) * 12, y * TILE + 4 + hrand(x, y, k + 50) * 12, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------

interface Drawable {
  sortY: number;
  shadow?: (ctx: Ctx) => void;
  draw: (p: Painter) => void;
}

function blockShadow(x: number, y: number, w: number, h: number, r = 4) {
  return (ctx: Ctx) => {
    ctx.fillStyle = SHADOW;
    rr(ctx, x + 3, y + 4, w, h, r);
    ctx.fill();
  };
}

interface BlockOpts {
  roof: string;
  wall?: string;
  face: number;
  radius?: number;
  roofInset?: number;
}

/** A rounded diorama block: roof on top, front face below. Returns the face rect. */
function block(p: Painter, x: number, y: number, w: number, h: number, o: BlockOpts) {
  const ctx = p.base;
  const wall = o.wall ?? PAL.wall;
  const r = o.radius ?? 3;
  const faceY = y + h - o.face;
  // face
  ctx.fillStyle = wall;
  rr(ctx, x + 0.5, faceY - 2, w - 1, o.face + 1.5, r);
  ctx.fill();
  ctx.fillStyle = shade(wall, -0.06);
  ctx.fillRect(x + 1, y + h - 2.2, w - 2, 1.4);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9;
  rr(ctx, x + 0.5, faceY - 2, w - 1, o.face + 1.5, r);
  ctx.stroke();
  // roof
  const inset = o.roofInset ?? 0;
  ctx.fillStyle = shade(o.roof, -0.14);
  rr(ctx, x - inset, y + 1.5, w + inset * 2, h - o.face + 1, r + 1);
  ctx.fill();
  ctx.fillStyle = o.roof;
  rr(ctx, x - inset, y, w + inset * 2, h - o.face, r + 1);
  ctx.fill();
  ctx.fillStyle = shade(o.roof, 0.28);
  rr(ctx, x - inset + 2, y + 1.5, w + inset * 2 - 4, Math.max(2, (h - o.face) * 0.28), r);
  ctx.fill();
  ctx.strokeStyle = INK;
  rr(ctx, x - inset, y, w + inset * 2, h - o.face, r + 1);
  ctx.stroke();
  // snow cap
  p.snow.fillStyle = 'rgba(255,255,255,0.95)';
  rr(p.snow, x - inset, y, w + inset * 2, h - o.face - 1, r + 1);
  p.snow.fill();
  return { fx: x, fy: faceY, fw: w, fh: o.face };
}

function windowRect(p: Painter, x: number, y: number, w: number, h: number, lit: boolean) {
  const ctx = p.base;
  ctx.fillStyle = '#CFE6F2';
  rr(ctx, x, y, w, h, 1);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(x + 0.6, y + 0.6, Math.max(0.8, w * 0.3), Math.max(0.8, h * 0.4));
  if (lit) {
    const l = p.lights;
    const g = l.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) * 1.6);
    g.addColorStop(0, 'rgba(255,200,100,0.22)');
    g.addColorStop(1, 'rgba(255,200,100,0)');
    l.fillStyle = g;
    l.fillRect(x - w, y - h, w * 3, h * 3);
    l.fillStyle = 'rgba(255,205,105,0.78)';
    rr(l, x, y, w, h, 1);
    l.fill();
  }
}

function door(ctx: Ctx, x: number, y: number, w: number, h: number, color = '#8D6E9E') {
  ctx.fillStyle = color;
  rr(ctx, x, y, w, h, Math.min(w / 2, 2));
  ctx.fill();
}

function glow(l: Ctx, x: number, y: number, r: number, a = 0.5) {
  const g = l.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,211,110,${a})`);
  g.addColorStop(0.5, `rgba(255,190,90,${a * 0.35})`);
  g.addColorStop(1, 'rgba(255,190,90,0)');
  l.fillStyle = g;
  l.fillRect(x - r, y - r, r * 2, r * 2);
}

function house(p: Painter, hx: number, hy: number, roofIdx: number): Drawable {
  const x = hx * TILE + 1.5;
  const y = hy * TILE + 1;
  const w = TILE - 3;
  const h = TILE - 1.5;
  return {
    sortY: hy + 1,
    shadow: blockShadow(x, y, w, h),
    draw: (pp) => {
      const f = block(pp, x, y, w, h, { roof: ROOFS[roofIdx], face: 7.5, radius: 2.5, roofInset: 0.8 });
      const left = hrand(hx, hy, 1) < 0.5;
      door(pp.base, left ? f.fx + 3 : f.fx + f.fw - 7, f.fy + 1, 4, f.fh - 1.5);
      windowRect(pp, left ? f.fx + f.fw - 7 : f.fx + 3, f.fy + 1.5, 4, 3, hrand(hx, hy, 2) < 0.8);
      if (hrand(hx, hy, 3) < 0.35) {
        pp.base.fillStyle = shade(ROOFS[roofIdx], -0.3);
        pp.base.fillRect(x + w - 5, y - 2, 2.5, 4);
      }
    },
  };
}

function tree(tx: number, ty: number, pine: boolean): Drawable {
  const cx = tx * TILE + 10 + (hrand(tx, ty, 7) - 0.5) * 4;
  const cy = ty * TILE + 9 + (hrand(tx, ty, 8) - 0.5) * 3;
  const r = 6.5 + hrand(tx, ty, 9) * 2.5;
  return {
    sortY: ty + 0.9,
    shadow: (ctx) => {
      ctx.fillStyle = SHADOW;
      ctx.beginPath();
      ctx.ellipse(cx + 2.5, cy + r * 0.9, r * 0.9, r * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
    },
    draw: (p) => {
      const ctx = p.base;
      ctx.fillStyle = PAL.woodDark;
      rr(ctx, cx - 1.3, cy + r * 0.3, 2.6, r * 0.7, 1);
      ctx.fill();
      if (pine) {
        ctx.fillStyle = PAL.pine;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r * 1.2);
        ctx.lineTo(cx + r * 0.85, cy + r * 0.55);
        ctx.lineTo(cx - r * 0.85, cy + r * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.fillStyle = shade(PAL.pine, 0.25);
        ctx.beginPath();
        ctx.moveTo(cx - 0.5, cy - r * 0.9);
        ctx.lineTo(cx - r * 0.45, cy + r * 0.2);
        ctx.lineTo(cx - r * 0.1, cy + r * 0.2);
        ctx.closePath();
        ctx.fill();
        p.snow.fillStyle = 'rgba(255,255,255,0.9)';
        p.snow.beginPath();
        p.snow.moveTo(cx, cy - r * 1.2);
        p.snow.lineTo(cx + r * 0.4, cy - r * 0.35);
        p.snow.lineTo(cx - r * 0.4, cy - r * 0.35);
        p.snow.closePath();
        p.snow.fill();
      } else {
        ctx.fillStyle = PAL.treeDark;
        ctx.beginPath();
        ctx.arc(cx, cy + 1, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PAL.tree;
        ctx.beginPath();
        ctx.arc(cx, cy - 0.5, r - 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.arc(cx, cy + 0.2, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = PAL.treeLight;
        ctx.beginPath();
        ctx.arc(cx - r * 0.35, cy - r * 0.4, r * 0.38, 0, Math.PI * 2);
        ctx.fill();
        p.snow.fillStyle = 'rgba(255,255,255,0.9)';
        p.snow.beginPath();
        p.snow.ellipse(cx, cy - r * 0.45, r * 0.8, r * 0.45, 0, 0, Math.PI * 2);
        p.snow.fill();
      }
    },
  };
}

function rect(r: { x0: number; y0: number; x1: number; y1: number }) {
  return { x: r.x0 * TILE, y: r.y0 * TILE, w: (r.x1 - r.x0 + 1) * TILE, h: (r.y1 - r.y0 + 1) * TILE };
}

function placeBuildings(): Drawable[] {
  const out: Drawable[] = [];

  // Station
  {
    const b = rect(PLACE_DEFS.station.building!);
    out.push({
      sortY: 4,
      shadow: blockShadow(b.x, b.y, b.w, b.h),
      draw: (p) => {
        const f = block(p, b.x + 1, b.y + 1, b.w - 2, b.h - 2, { roof: '#A6C8F4', face: 16, radius: 4, roofInset: 1.5 });
        for (let i = 0; i < 7; i++) {
          if (i === 3) continue;
          windowRect(p, f.fx + 8 + i * 21, f.fy + 3, 9, 7, true);
        }
        door(p.base, f.fx + f.fw / 2 - 9, f.fy + 1, 18, f.fh - 1.5, '#6F5A8E');
        // clock
        const ctx = p.base;
        const cx = b.x + b.w / 2;
        const cy = b.y + 9;
        ctx.fillStyle = PAL.wall;
        ctx.beginPath();
        ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.strokeStyle = PAL.plum;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy - 4);
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 3, cy + 1);
        ctx.stroke();
        glow(p.lights, cx, cy, 10, 0.35);
      },
    });
  }

  // Office tower
  {
    const b = rect(PLACE_DEFS.office.building!);
    out.push({
      sortY: 10,
      shadow: (ctx) => {
        ctx.fillStyle = SHADOW;
        rr(ctx, b.x + 6, b.y + 8, b.w, b.h, 5);
        ctx.fill();
      },
      draw: (p) => {
        const f = block(p, b.x + 2, b.y, b.w - 4, b.h - 1, { roof: '#C9C3E6', wall: '#EAF2FA', face: 62, radius: 4 });
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            windowRect(p, f.fx + 5 + c * 14.5, f.fy + 4 + r * 11, 9, 7, hrand(r, c, 91) < 0.7);
          }
        }
        door(p.base, f.fx + f.fw / 2 - 6, f.fy + f.fh - 8, 12, 7, '#6F5A8E');
        const ctx = p.base;
        ctx.fillStyle = '#B3ACD6';
        rr(ctx, b.x + 12, b.y + 8, 14, 9, 2);
        ctx.fill();
        rr(ctx, b.x + 44, b.y + 12, 10, 7, 2);
        ctx.fill();
        ctx.strokeStyle = PAL.plum;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(b.x + b.w - 16, b.y + 20);
        ctx.lineTo(b.x + b.w - 16, b.y - 12);
        ctx.stroke();
        ctx.fillStyle = PAL.blush;
        ctx.beginPath();
        ctx.arc(b.x + b.w - 16, b.y - 12, 1.6, 0, Math.PI * 2);
        ctx.fill();
        glow(p.lights, b.x + b.w - 16, b.y - 12, 6, 0.8);
      },
    });
  }

  // Shops
  SHOP_RECTS.forEach((s, i) => {
    const b = rect(s);
    const roof = ROOFS[(i * 3 + 1) % ROOFS.length];
    const north = s.y0 === 6;
    out.push({
      sortY: s.y1 + 1,
      shadow: blockShadow(b.x, b.y, b.w, b.h),
      draw: (p) => {
        const f = block(p, b.x + 1, b.y + 1, b.w - 2, b.h - 2, { roof, face: 14, radius: 3 });
        const ctx = p.base;
        // striped awning
        const aw = ['#F4A6A6', '#A6C8F4', '#F4D6A6', '#A6E3C8', '#BFA6F4'][i % 5];
        for (let k = 0; k < f.fw / 4; k++) {
          ctx.fillStyle = k % 2 === 0 ? aw : '#FFFFFF';
          ctx.fillRect(f.fx + k * 4, f.fy - 2, 4, 5);
        }
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.7;
        ctx.strokeRect(f.fx, f.fy - 2, f.fw, 5);
        windowRect(p, f.fx + 4, f.fy + 5, f.fw - 16, 6, true);
        door(ctx, f.fx + f.fw - 9, f.fy + 4, 5, f.fh - 5);
        if (north) glow(p.lights, f.fx + f.fw / 2, b.y + b.h + 10, 12, 0.35);
      },
    });
  });

  // Arcade lanterns strung along the covered street.
  out.push({
    sortY: 8.2,
    draw: (p) => {
      const ctx = p.base;
      ctx.strokeStyle = 'rgba(58,46,92,0.35)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(24 * TILE, 8 * TILE + 3);
      for (let x = 24; x <= 36; x++) ctx.quadraticCurveTo((x + 0.5) * TILE, 8 * TILE + 6, (x + 1) * TILE, 8 * TILE + 3);
      ctx.stroke();
      for (let x = 24; x <= 35; x++) {
        ctx.fillStyle = x % 2 === 0 ? '#F4A6A6' : PAL.lantern;
        rr(ctx, (x + 0.5) * TILE - 1.6, 8 * TILE + 4, 3.2, 4, 1.4);
        ctx.fill();
        glow(p.lights, (x + 0.5) * TILE, 8 * TILE + 6, 9, 0.55);
      }
    },
  });

  // Ramen stall
  {
    const b = rect(PLACE_DEFS.ramen.building!);
    out.push({
      sortY: 8,
      shadow: blockShadow(b.x, b.y, b.w, b.h),
      draw: (p) => {
        const ctx = p.base;
        const f = block(p, b.x + 2, b.y + 2, b.w - 4, b.h - 3, { roof: '#C98B5E', wall: '#E7C29A', face: 15, radius: 3, roofInset: 2 });
        // noren curtain
        for (let k = 0; k < 4; k++) {
          ctx.fillStyle = '#4A5A8C';
          rr(ctx, f.fx + 3 + k * 8.5, f.fy - 1, 7.5, 7, 1);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(f.fx + 6 + k * 8.5, f.fy + 1.5, 1.5, 2.5);
        }
        // counter
        ctx.fillStyle = PAL.wood;
        ctx.fillRect(f.fx + 1, f.fy + 8, f.fw - 2, 2.5);
        // red lanterns
        for (const lx of [b.x + 3, b.x + b.w - 3]) {
          ctx.fillStyle = '#E86A5B';
          rr(ctx, lx - 2.5, b.y + 18, 5, 7, 2.4);
          ctx.fill();
          ctx.strokeStyle = INK;
          ctx.lineWidth = 0.6;
          ctx.stroke();
          glow(p.lights, lx, b.y + 21, 14, 0.7);
        }
        // steam
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(b.x + 14, b.y + 2);
        ctx.quadraticCurveTo(b.x + 11, b.y - 3, b.x + 15, b.y - 7);
        ctx.moveTo(b.x + 22, b.y + 2);
        ctx.quadraticCurveTo(b.x + 19, b.y - 4, b.x + 23, b.y - 9);
        ctx.stroke();
        // stools
        for (let k = 0; k < 3; k++) {
          ctx.fillStyle = '#E86A5B';
          ctx.beginPath();
          ctx.ellipse(b.x + 8 + k * 11, b.y + b.h + 5, 2.6, 1.6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    });
  }

  // Café
  {
    const b = rect(PLACE_DEFS.cafe.building!);
    out.push({
      sortY: 15,
      shadow: blockShadow(b.x, b.y, b.w, b.h),
      draw: (p) => {
        const ctx = p.base;
        const f = block(p, b.x + 1, b.y + 1, b.w - 2, b.h - 2, { roof: '#F4D6A6', face: 16, radius: 4 });
        for (let k = 0; k < f.fw / 5; k++) {
          ctx.fillStyle = k % 2 === 0 ? '#F4A6A6' : '#FFFFFF';
          rr(ctx, f.fx + k * 5, f.fy - 3, 5, 6, 1.5);
          ctx.fill();
        }
        windowRect(p, f.fx + 5, f.fy + 5, 26, 8, true);
        windowRect(p, f.fx + 44, f.fy + 5, 26, 8, true);
        door(ctx, f.fx + 34, f.fy + 4, 7, f.fh - 4.5);
      },
    });
    for (const [tx, ty, c] of [[34.5, 15.3, '#A6E3C8'], [37, 15.3, '#F4A6A6'], [35.7, 16.5, '#FFD36E'], [32.8, 16.6, '#A6C8F4']] as Array<[number, number, string]>) {
      out.push({
        sortY: ty + 0.4,
        shadow: (ctx) => {
          ctx.fillStyle = SHADOW;
          ctx.beginPath();
          ctx.ellipse(tx * TILE + 2, ty * TILE + 5, 6, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
        },
        draw: (pp) => {
          const ctx = pp.base;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.ellipse(tx * TILE, ty * TILE + 3, 4, 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = PAL.plum;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(tx * TILE, ty * TILE + 3);
          ctx.lineTo(tx * TILE, ty * TILE - 7);
          ctx.stroke();
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.moveTo(tx * TILE - 7, ty * TILE - 5);
          ctx.quadraticCurveTo(tx * TILE, ty * TILE - 12, tx * TILE + 7, ty * TILE - 5);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = INK;
          ctx.stroke();
        },
      });
    }
  }

  // School
  {
    const b = rect(PLACE_DEFS.school.building!);
    out.push({
      sortY: 16,
      shadow: blockShadow(b.x, b.y, b.w, b.h),
      draw: (p) => {
        const ctx = p.base;
        const f = block(p, b.x + 1, b.y + 1, b.w - 2, b.h - 2, { roof: '#F4D6A6', wall: '#FFF3E0', face: 26, radius: 4 });
        for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) {
          if (r === 1 && (c === 3 || c === 4)) continue;
          windowRect(p, f.fx + 5 + c * 16.5, f.fy + 3 + r * 11, 10, 7, hrand(r, c, 5) < 0.3);
        }
        door(ctx, f.fx + f.fw / 2 - 8, f.fy + 13, 16, f.fh - 13.5, '#6F5A8E');
        const cx = b.x + b.w / 2;
        ctx.fillStyle = PAL.wall;
        ctx.beginPath();
        ctx.arc(cx, b.y + 12, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, b.y + 12);
        ctx.lineTo(cx + 3, b.y + 10);
        ctx.stroke();
      },
    });
    // flag pole
    out.push({
      sortY: 17.2,
      draw: (p) => {
        const ctx = p.base;
        const x = 6.4 * TILE;
        const y = 17 * TILE;
        ctx.strokeStyle = PAL.plum;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + 6);
        ctx.lineTo(x, y - 18);
        ctx.stroke();
        ctx.fillStyle = PAL.lagoon;
        ctx.beginPath();
        ctx.moveTo(x, y - 18);
        ctx.lineTo(x + 9, y - 15);
        ctx.lineTo(x, y - 12);
        ctx.closePath();
        ctx.fill();
      },
    });
  }

  // Hospital
  {
    const b = rect(PLACE_DEFS.hospital.building!);
    out.push({
      sortY: 23,
      shadow: blockShadow(b.x, b.y, b.w, b.h),
      draw: (p) => {
        const ctx = p.base;
        const f = block(p, b.x + 1, b.y + 1, b.w - 2, b.h - 2, { roof: '#E4EEF6', wall: '#FFFFFF', face: 30, radius: 4 });
        for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) {
          if (r === 1 && (c === 3 || c === 4)) continue;
          windowRect(p, f.fx + 5 + c * 16.5, f.fy + 3 + r * 12, 10, 7.5, hrand(r, c, 17) < 0.85);
        }
        door(ctx, f.fx + f.fw / 2 - 9, f.fy + 15, 18, f.fh - 15.5, '#5E8FA6');
        const cx = b.x + b.w / 2;
        const cy = b.y + 22;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5FB6C9';
        ctx.fillRect(cx - 2.5, cy - 7, 5, 14);
        ctx.fillRect(cx - 7, cy - 2.5, 14, 5);
        glow(p.lights, cx, cy, 16, 0.3);
      },
    });
  }

  // Shrine: hall, torii, stone lanterns
  {
    const b = rect(PLACE_DEFS.shrine.building!);
    out.push({
      sortY: 3,
      shadow: blockShadow(b.x, b.y, b.w, b.h),
      draw: (p) => {
        const ctx = p.base;
        const f = block(p, b.x + 3, b.y + 2, b.w - 6, b.h - 2, { roof: '#6E6286', wall: '#F2E3D0', face: 14, radius: 3, roofInset: 4 });
        for (let k = 0; k < 5; k++) {
          ctx.fillStyle = PAL.vermilion;
          ctx.fillRect(f.fx + 3 + k * ((f.fw - 8) / 4), f.fy - 1, 2.4, f.fh);
        }
        door(ctx, f.fx + f.fw / 2 - 6, f.fy + 2, 12, f.fh - 2.5, '#8C5B4A');
        // upturned eaves
        ctx.fillStyle = '#6E6286';
        ctx.beginPath();
        ctx.moveTo(b.x - 2, b.y + 2);
        ctx.lineTo(b.x + 6, b.y + 6);
        ctx.lineTo(b.x + 6, b.y + 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(b.x + b.w + 2, b.y + 2);
        ctx.lineTo(b.x + b.w - 6, b.y + 6);
        ctx.lineTo(b.x + b.w - 6, b.y + 2);
        ctx.fill();
      },
    });
    const tx = 57 * TILE;
    const ty = 7 * TILE;
    out.push({
      sortY: 7.9,
      shadow: (ctx) => {
        ctx.fillStyle = SHADOW;
        ctx.fillRect(tx - 17, ty + 15, 38, 3);
      },
      draw: (p) => {
        const ctx = p.base;
        ctx.fillStyle = PAL.vermilion;
        ctx.fillRect(tx - 13, ty - 8, 3.2, 24);
        ctx.fillRect(tx + 10, ty - 8, 3.2, 24);
        rr(ctx, tx - 19, ty - 12, 38, 4, 2);
        ctx.fill();
        ctx.fillRect(tx - 15, ty - 5, 30, 2.5);
        ctx.fillStyle = '#3A2E5C';
        rr(ctx, tx - 20, ty - 14, 40, 2.4, 1.2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.6;
        ctx.strokeRect(tx - 13, ty - 8, 3.2, 24);
        ctx.strokeRect(tx + 10, ty - 8, 3.2, 24);
      },
    });
    for (const [lx, ly] of [[53, 4.6], [60.5, 4.6], [53, 6.4], [60.5, 6.4]]) {
      out.push({
        sortY: ly + 0.5,
        draw: (p) => {
          const ctx = p.base;
          const x = lx * TILE;
          const y = ly * TILE;
          ctx.fillStyle = PAL.stone;
          ctx.fillRect(x - 2, y - 2, 4, 8);
          rr(ctx, x - 4, y - 6, 8, 5, 1.5);
          ctx.fill();
          ctx.fillStyle = PAL.stoneDark;
          ctx.fillRect(x - 5, y - 8, 10, 2.4);
          ctx.fillStyle = '#FFE6A8';
          ctx.fillRect(x - 1.6, y - 5, 3.2, 2.4);
          glow(p.lights, x, y - 4, 12, 0.6);
        },
      });
    }
  }

  // Stadium
  {
    const b = rect(PLACE_DEFS.stadium.building!);
    out.push({
      sortY: 20,
      shadow: (ctx) => {
        ctx.fillStyle = SHADOW;
        ctx.beginPath();
        ctx.ellipse(b.x + b.w / 2 + 4, b.y + b.h / 2 + 6, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      },
      draw: (p) => {
        const ctx = p.base;
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2 - 6;
        const rx = b.w / 2 - 2;
        const ry = b.h / 2 - 12;
        // outer wall face
        ctx.fillStyle = '#EDE4F6';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 14, rx, ry, 0, 0, Math.PI);
        ctx.lineTo(cx - rx, cy);
        ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1;
        ctx.stroke();
        for (let k = 0; k < 14; k++) {
          const a = Math.PI * (0.08 + (k / 13) * 0.84);
          const x = cx + Math.cos(a) * rx * 0.98;
          const y = cy + Math.sin(a) * ry + 6;
          ctx.fillStyle = '#B9A8D9';
          rr(ctx, x - 3, y, 6, 6, 2);
          ctx.fill();
        }
        // seating ring
        const bands = ['#F4A6A6', '#A6C8F4', '#F4D6A6', '#BFA6F4'];
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = bands[i];
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx - i * 7, ry - i * 5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#8FD08A';
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx - 30, ry - 21, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - (rx - 40), cy - (ry - 27), (rx - 40) * 2, (ry - 27) * 2);
        ctx.beginPath();
        ctx.moveTo(cx, cy - (ry - 27));
        ctx.lineTo(cx, cy + (ry - 27));
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = INK;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        p.snow.fillStyle = 'rgba(255,255,255,0.9)';
        p.snow.beginPath();
        p.snow.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        p.snow.fill();
        // floodlights
        for (const [fx, fy] of [[b.x + 8, b.y + 4], [b.x + b.w - 8, b.y + 4], [b.x + 8, b.y + b.h - 18], [b.x + b.w - 8, b.y + b.h - 18]]) {
          ctx.strokeStyle = PAL.plum;
          ctx.beginPath();
          ctx.moveTo(fx, fy + 10);
          ctx.lineTo(fx, fy - 8);
          ctx.stroke();
          ctx.fillStyle = '#FFF4CC';
          rr(ctx, fx - 4, fy - 12, 8, 4, 1);
          ctx.fill();
          glow(p.lights, fx, fy - 10, 22, 0.55);
        }
      },
    });
  }

  // Fountain
  {
    const cx = 19 * TILE;
    const cy = 19 * TILE;
    out.push({
      sortY: 20,
      shadow: (ctx) => {
        ctx.fillStyle = SHADOW;
        ctx.beginPath();
        ctx.ellipse(cx + 3, cy + 5, 18, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      },
      draw: (p) => {
        const ctx = p.base;
        ctx.fillStyle = PAL.stoneDark;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 3, 18, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PAL.stone;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 18, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.fillStyle = PAL.lagoon;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 14.5, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.ellipse(cx - 4, cy - 3, 5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PAL.stone;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 2, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 1.5, cy - 9, 3, 7);
      },
    });
  }
  return out;
}

function benches(map: TownMap): Drawable[] {
  return map.benches.map((b) => ({
    sortY: b.y,
    draw: (p: Painter) => {
      const ctx = p.base;
      const x = b.x * TILE;
      const y = b.y * TILE;
      ctx.fillStyle = PAL.woodDark;
      ctx.fillRect(x - 7, y - 1, 1.5, 4);
      ctx.fillRect(x + 5.5, y - 1, 1.5, 4);
      ctx.fillStyle = PAL.wood;
      rr(ctx, x - 8, y - 4, 16, 3, 1);
      ctx.fill();
      rr(ctx, x - 8, y - 7, 16, 2, 1);
      ctx.fill();
    },
  }));
}

function lamps(map: TownMap): Drawable[] {
  return map.lamps.map((l) => {
    const x = Math.floor(l.x) * TILE + 2;
    const y = Math.floor(l.y) * TILE + 3;
    return {
      sortY: l.y,
      draw: (p: Painter) => {
        const ctx = p.base;
        ctx.fillStyle = PAL.plum;
        ctx.fillRect(x - 0.6, y - 9, 1.2, 10);
        ctx.fillStyle = '#FFF1C4';
        rr(ctx, x - 1.8, y - 12, 3.6, 3.6, 1.4);
        ctx.fill();
        glow(p.lights, x, y - 10, 20, 0.5);
        glow(p.lights, x, y + 2, 14, 0.25);
      },
    };
  });
}

function beachDecor(): Drawable[] {
  const out: Drawable[] = [];
  const umbrellas: Array<[number, number, string]> = [[5, 35, '#F4A6A6'], [13, 34.6, '#A6C8F4'], [22, 35.3, '#FFD36E'], [37, 34.8, '#A6E3C8'], [53, 35.2, '#BFA6F4'], [60, 34.7, '#F4A6A6']];
  for (const [x, y, c] of umbrellas) {
    out.push({
      sortY: y + 0.3,
      shadow: (ctx) => {
        ctx.fillStyle = SHADOW;
        ctx.beginPath();
        ctx.ellipse(x * TILE + 4, y * TILE + 4, 9, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      },
      draw: (p) => {
        const ctx = p.base;
        ctx.fillStyle = '#FFFFFF';
        rr(ctx, x * TILE + 3, y * TILE, 12, 5, 1.5);
        ctx.fill();
        ctx.fillStyle = c;
        ctx.fillRect(x * TILE + 3, y * TILE + 1.5, 12, 1.5);
        ctx.strokeStyle = PAL.plum;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x * TILE, y * TILE + 3);
        ctx.lineTo(x * TILE, y * TILE - 10);
        ctx.stroke();
        for (let k = 0; k < 4; k++) {
          ctx.fillStyle = k % 2 === 0 ? c : '#FFFFFF';
          ctx.beginPath();
          ctx.moveTo(x * TILE, y * TILE - 13);
          ctx.arc(x * TILE, y * TILE - 8, 9, Math.PI + (k * Math.PI) / 4, Math.PI + ((k + 1) * Math.PI) / 4);
          ctx.closePath();
          ctx.fill();
        }
      },
    });
  }
  for (const [x, y] of [[8, 38.2], [30, 38.6], [55, 38]]) {
    out.push({
      sortY: y,
      draw: (p) => {
        const ctx = p.base;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(x * TILE - 10, y * TILE);
        ctx.lineTo(x * TILE + 10, y * TILE);
        ctx.lineTo(x * TILE + 6, y * TILE + 5);
        ctx.lineTo(x * TILE - 6, y * TILE + 5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.fillStyle = PAL.blush;
        ctx.beginPath();
        ctx.moveTo(x * TILE, y * TILE - 1);
        ctx.lineTo(x * TILE, y * TILE - 14);
        ctx.lineTo(x * TILE + 8, y * TILE - 3);
        ctx.closePath();
        ctx.fillStyle = '#FFF7EA';
        ctx.fill();
        ctx.stroke();
      },
    });
  }
  return out;
}

function bridges(): Drawable[] {
  const out: Drawable[] = [];
  // Old stone bridge: parapets and arched south face.
  out.push({
    sortY: 13,
    draw: (p) => {
      const ctx = p.base;
      const x0 = 44 * TILE - 3;
      const x1 = 47 * TILE + 3;
      const y = 12 * TILE;
      ctx.fillStyle = '#B9A48E';
      rr(ctx, x0, y + TILE - 1, x1 - x0, 7, 2);
      ctx.fill();
      ctx.fillStyle = PAL.lagoon;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(44 * TILE + 10 + k * 20, y + TILE + 6, 6, 4, 0, Math.PI, 0);
        ctx.fill();
      }
      ctx.fillStyle = '#C9B39B';
      rr(ctx, x0, y - 2.5, x1 - x0, 3.5, 1.5);
      ctx.fill();
      rr(ctx, x0, y + TILE - 2, x1 - x0, 3.5, 1.5);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.7;
      rr(ctx, x0, y - 2.5, x1 - x0, 3.5, 1.5);
      ctx.stroke();
      rr(ctx, x0, y + TILE - 2, x1 - x0, 3.5, 1.5);
      ctx.stroke();
      // moss
      ctx.fillStyle = 'rgba(110,170,110,0.6)';
      for (let k = 0; k < 6; k++) ctx.fillRect(x0 + 4 + k * 11, y + TILE + 1, 3, 1.5);
      for (const lx of [x0 + 2, x1 - 2]) glow(p.lights, lx, y, 12, 0.35);
    },
  });
  for (const by of [4, 26, 33]) {
    out.push({
      sortY: by + 1,
      draw: (p) => {
        const ctx = p.base;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.6;
        for (const yy of [by * TILE - 1.5, (by + 1) * TILE - 1]) {
          rr(ctx, 44 * TILE - 2, yy, 3 * TILE + 4, 2.5, 1);
          ctx.fill();
          ctx.stroke();
        }
      },
    });
  }
  // Railway bridge and tunnel mouth.
  out.push({
    sortY: 2,
    draw: (p) => {
      const ctx = p.base;
      ctx.fillStyle = '#9A8FA8';
      ctx.fillRect(44 * TILE - 2, TILE + TILE - 3, 3 * TILE + 4, 3);
      ctx.fillStyle = '#4B4063';
      ctx.beginPath();
      ctx.ellipse(48 * TILE + 3, TILE + 16, 9, 12, 0, Math.PI, 0);
      ctx.fill();
    },
  });
  return out;
}

export function paintTown(map: TownMap): TownCanvases {
  const [base, bctx] = makeCanvas();
  const [lights, lctx] = makeCanvas();
  const [snow, sctx] = makeCanvas();
  const [shimmer, shctx] = makeCanvas();
  paintGround(bctx, map);

  const drawables: Drawable[] = [];
  for (const h of map.houses) drawables.push(house({ base: bctx, lights: lctx, snow: sctx }, h.x, h.y, h.roof));
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (map.tiles[y][x] === 'T') drawables.push(tree(x, y, (x >= 48 && y <= 10) ? hrand(x, y, 2) < 0.55 : y === 0 && hrand(x, y, 3) < 0.3));
    }
  }
  drawables.push(...placeBuildings(), ...benches(map), ...lamps(map), ...beachDecor(), ...bridges());
  drawables.sort((a, b) => a.sortY - b.sortY);
  for (const d of drawables) d.shadow?.(bctx);
  const painter: Painter = { base: bctx, lights: lctx, snow: sctx };
  for (const d of drawables) d.draw(painter);

  // Water shimmer highlights.
  shctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (map.tiles[y][x] !== '~') continue;
      for (let k = 0; k < 2; k++) {
        if (hrand(x, y, k + 60) < 0.45) continue;
        const px = x * TILE + hrand(x, y, k + 61) * 16;
        const py = y * TILE + 3 + hrand(x, y, k + 62) * 14;
        rr(shctx, px, py, 3 + hrand(x, y, k + 63) * 3, 1, 0.5);
        shctx.fill();
      }
    }
  }
  return { base, lights, snow, shimmer };
}
