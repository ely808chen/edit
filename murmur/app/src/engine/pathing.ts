import { MAP_H, MAP_W, getTownMap, idx } from './townMap';

export const UNREACHABLE = 0xffff;

const N8 = [
  [1, 0, 10],
  [-1, 0, 10],
  [0, 1, 10],
  [0, -1, 10],
  [1, 1, 14],
  [1, -1, 14],
  [-1, 1, 14],
  [-1, -1, 14],
] as const;

/** Dijkstra distance field from a set of source tiles, weighted by tile cost. */
export function buildField(sources: number[]): Uint16Array {
  const { walkable, cost } = getTownMap();
  const n = MAP_W * MAP_H;
  const dist = new Uint16Array(n).fill(UNREACHABLE);
  // Binary heap of [dist, index] packed into one number.
  const heap: number[] = [];
  const push = (d: number, i: number) => {
    heap.push(d * 4096 + i);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (heap[p] <= heap[c]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]];
      c = p;
    }
  };
  const pop = (): number => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1;
        const r = l + 1;
        let m = c;
        if (l < heap.length && heap[l] < heap[m]) m = l;
        if (r < heap.length && heap[r] < heap[m]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]];
        c = m;
      }
    }
    return top;
  };
  for (const s of sources) {
    dist[s] = 0;
    push(0, s);
  }
  while (heap.length) {
    const v = pop();
    const d = Math.floor(v / 4096);
    const i = v - d * 4096;
    if (d > dist[i]) continue;
    const x = i % MAP_W;
    const y = (i - x) / MAP_W;
    for (const [dx, dy, base] of N8) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const ni = idx(nx, ny);
      if (!walkable[ni]) continue;
      if (dx !== 0 && dy !== 0 && (!walkable[idx(x + dx, y)] || !walkable[idx(x, y + dy)])) continue;
      const nd = d + Math.round((base * cost[ni]) / 10);
      if (nd < dist[ni]) {
        dist[ni] = nd;
        push(nd, ni);
      }
    }
  }
  return dist;
}

export class FieldCache {
  private fields = new Map<number, Uint16Array>();

  /** Field toward one target tile (computed lazily, cached). */
  get(target: number): Uint16Array {
    let f = this.fields.get(target);
    if (!f) {
      if (this.fields.size > 1600) this.fields.clear();
      f = buildField([target]);
      this.fields.set(target, f);
    }
    return f;
  }
}

/** The best neighboring tile to step to when descending (or ascending) a field. */
export function bestNeighbor(field: Uint16Array, x: number, y: number, ascend = false): number {
  const { walkable } = getTownMap();
  const here = idx(x, y);
  let best = -1;
  let bestD = ascend ? field[here] : field[here] === UNREACHABLE ? UNREACHABLE : field[here];
  if (ascend && bestD === UNREACHABLE) bestD = 0;
  for (const [dx, dy] of N8) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
    const ni = idx(nx, ny);
    if (!walkable[ni]) continue;
    if (dx !== 0 && dy !== 0 && (!walkable[idx(x + dx, y)] || !walkable[idx(x, y + dy)])) continue;
    const d = field[ni];
    if (d === UNREACHABLE) continue;
    if (ascend ? d > bestD : d < bestD) {
      bestD = d;
      best = ni;
    }
  }
  return best;
}
