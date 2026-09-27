import { PLACE_IDS, type PlaceId } from '../../../shared/types';
import { TOWN_ROWS } from './townMapRows';

export const MAP_W = 64;
export const MAP_H = 40;

export type TileChar = '.' | '=' | '~' | 's' | '#' | 'h' | 'T' | 'p' | 'g' | 'f' | 'd' | 'a' | 'k' | 'b' | 'B' | 'r';

const WALKABLE = new Set<string>(['.', '=', 's', 'p', 'g', 'd', 'a', 'k', 'b', 'B']);

/** Movement cost per tile (x10). Roads and paths are preferred over lawns and sand. */
const COST: Record<string, number> = {
  '=': 10, p: 10, a: 10, b: 10, B: 10, k: 12, '.': 15, g: 14, d: 14, s: 18,
};

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Tile {
  x: number;
  y: number;
}

export interface PlaceDef {
  id: PlaceId;
  area: Rect[];
  building?: Rect;
  entrance: Tile;
  /** Visual and logical center of the place, in tile units. */
  center: { x: number; y: number };
  /** Routine visitors go inside (fade out) instead of lingering outdoors. */
  interior: boolean;
}

export const PLACE_DEFS: Record<PlaceId, PlaceDef> = {
  park: { id: 'park', area: [{ x0: 8, y0: 13, x1: 29, y1: 25 }], entrance: { x: 18, y: 16 }, center: { x: 19, y: 19 }, interior: false },
  ramen: {
    id: 'ramen', area: [{ x0: 36, y0: 5, x1: 42, y1: 11 }], building: { x0: 40, y0: 6, x1: 41, y1: 7 },
    entrance: { x: 40, y: 8 }, center: { x: 41, y: 8.2 }, interior: false,
  },
  shopping: {
    id: 'shopping', area: [{ x0: 24, y0: 5, x1: 35, y1: 11 }], building: { x0: 24, y0: 6, x1: 35, y1: 10 },
    entrance: { x: 29, y: 8 }, center: { x: 29.5, y: 8.5 }, interior: false,
  },
  cafe: {
    id: 'cafe', area: [{ x0: 32, y0: 15, x1: 38, y1: 16 }], building: { x0: 32, y0: 13, x1: 35, y1: 14 },
    entrance: { x: 33, y: 15 }, center: { x: 35, y: 15.5 }, interior: true,
  },
  station: {
    id: 'station', area: [{ x0: 8, y0: 5, x1: 16, y1: 6 }], building: { x0: 8, y0: 2, x1: 15, y1: 3 },
    entrance: { x: 12, y: 4 }, center: { x: 12, y: 5 }, interior: true,
  },
  office: {
    id: 'office', area: [{ x0: 18, y0: 10, x1: 23, y1: 11 }], building: { x0: 19, y0: 5, x1: 22, y1: 9 },
    entrance: { x: 20, y: 10 }, center: { x: 21, y: 10.5 }, interior: true,
  },
  school: {
    id: 'school', area: [{ x0: 0, y0: 16, x1: 6, y1: 24 }], building: { x0: 0, y0: 13, x1: 6, y1: 15 },
    entrance: { x: 3, y: 16 }, center: { x: 3.5, y: 19 }, interior: true,
  },
  hospital: {
    id: 'hospital', area: [{ x0: 32, y0: 23, x1: 40, y1: 24 }], building: { x0: 33, y0: 19, x1: 39, y1: 22 },
    entrance: { x: 36, y: 23 }, center: { x: 36.5, y: 23.5 }, interior: true,
  },
  bridge: { id: 'bridge', area: [{ x0: 42, y0: 11, x1: 48, y1: 13 }], entrance: { x: 45, y: 12 }, center: { x: 45.5, y: 12.5 }, interior: false },
  beach: { id: 'beach', area: [{ x0: 0, y0: 34, x1: 63, y1: 36 }], entrance: { x: 30, y: 34 }, center: { x: 30, y: 35.5 }, interior: false },
  shrine: {
    id: 'shrine', area: [{ x0: 52, y0: 3, x1: 61, y1: 6 }, { x0: 56, y0: 7, x1: 57, y1: 10 }], building: { x0: 55, y0: 1, x1: 58, y1: 2 },
    entrance: { x: 56, y: 3 }, center: { x: 57, y: 4.5 }, interior: false,
  },
  stadium: {
    id: 'stadium', area: [{ x0: 49, y0: 20, x1: 63, y1: 21 }], building: { x0: 51, y0: 14, x1: 61, y1: 19 },
    entrance: { x: 56, y: 20 }, center: { x: 56.5, y: 20.5 }, interior: true,
  },
};

/** Individual shop fronts along the shopping street, for rendering. */
export const SHOP_RECTS: Rect[] = [
  { x0: 24, y0: 6, x1: 26, y1: 7 }, { x0: 27, y0: 6, x1: 28, y1: 7 }, { x0: 29, y0: 6, x1: 30, y1: 7 },
  { x0: 32, y0: 6, x1: 33, y1: 7 }, { x0: 34, y0: 6, x1: 35, y1: 7 },
  { x0: 24, y0: 9, x1: 25, y1: 10 }, { x0: 26, y0: 9, x1: 28, y1: 10 }, { x0: 29, y0: 9, x1: 30, y1: 10 },
  { x0: 32, y0: 9, x1: 33, y1: 10 }, { x0: 34, y0: 9, x1: 35, y1: 10 },
];

export interface House {
  id: number;
  x: number;
  y: number;
  door: Tile;
  roof: number;
}

export interface TownMap {
  tiles: string[];
  walkable: Uint8Array;
  cost: Uint8Array;
  houses: House[];
  places: Record<PlaceId, PlaceDef & { areaTiles: Tile[]; gatherTiles: Tile[]; placeMask: Uint8Array }>;
  benches: Array<{ x: number; y: number }>;
  lamps: Array<{ x: number; y: number }>;
}

export const idx = (x: number, y: number) => y * MAP_W + x;

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
}

function inRects(x: number, y: number, rects: Rect[]): boolean {
  return rects.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
}

let cached: TownMap | null = null;

export function getTownMap(): TownMap {
  if (cached) return cached;
  const tiles = TOWN_ROWS.slice();
  if (tiles.length !== MAP_H) throw new Error(`Town map must have ${MAP_H} rows, has ${tiles.length}`);
  tiles.forEach((row, y) => {
    if (row.length !== MAP_W) throw new Error(`Town map row ${y} must be ${MAP_W} wide, is ${row.length}`);
  });
  const walkable = new Uint8Array(MAP_W * MAP_H);
  const cost = new Uint8Array(MAP_W * MAP_H);
  const houses: House[] = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const c = tiles[y][x];
      if (WALKABLE.has(c)) {
        walkable[idx(x, y)] = 1;
        cost[idx(x, y)] = COST[c] ?? 15;
      }
      if (c === 'h') {
        houses.push({ id: houses.length, x, y, door: { x, y: y + 1 }, roof: (x * 7 + y * 13) % 5 });
      }
    }
  }
  const places = {} as TownMap['places'];
  for (const id of PLACE_IDS) {
    const def = PLACE_DEFS[id];
    const areaTiles: Tile[] = [];
    const placeMask = new Uint8Array(MAP_W * MAP_H);
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (inRects(x, y, def.area)) {
          placeMask[idx(x, y)] = 1;
          if (walkable[idx(x, y)]) areaTiles.push({ x, y });
        }
      }
    }
    const gather: Array<Tile & { d: number }> = [];
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (!walkable[idx(x, y)]) continue;
        const dx = x + 0.5 - def.center.x;
        const dy = y + 0.5 - def.center.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const inside = placeMask[idx(x, y)] === 1;
        // Prefer tiles inside the place; spill into the surroundings for big crowds.
        if (d <= 12) gather.push({ x, y, d: d + (inside ? 0 : 1.5) });
      }
    }
    gather.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
    places[id] = { ...def, areaTiles, gatherTiles: gather.map(({ x, y }) => ({ x, y })), placeMask };
  }
  const benches = [
    { x: 10.5, y: 17.6 }, { x: 13.5, y: 17.6 }, { x: 23.5, y: 17.6 }, { x: 26.5, y: 17.6 },
    { x: 10.5, y: 19.4 }, { x: 14.5, y: 19.4 }, { x: 24.5, y: 19.4 }, { x: 27.5, y: 19.4 },
    { x: 17.4, y: 14.5 }, { x: 19.6, y: 23.5 },
  ];
  const lamps: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const c = tiles[y][x];
      if ((c === '=' || c === 'B') && (x * 3 + y * 5) % 9 === 0) lamps.push({ x: x + 0.5, y: y + 0.5 });
    }
  }
  cached = { tiles, walkable, cost, houses, places, benches, lamps };
  return cached;
}

export function tileAt(x: number, y: number): string {
  const m = getTownMap();
  if (!inBounds(x, y)) return '~';
  return m.tiles[y][x];
}
