/** FNV-1a 32-bit string hash. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mix(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Stateless deterministic random number in [0,1) from up to four integers. */
export function hrand(a: number, b = 0, c = 0, d = 0): number {
  let h = mix((a | 0) ^ 0x9e3779b9);
  h = mix(h ^ (b | 0));
  h = mix(h ^ Math.imul(c | 0, 0x85ebca6b));
  h = mix(h ^ Math.imul(d | 0, 0xc2b2ae35));
  return h / 4294967296;
}

/** Small seeded PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeEventText(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Short stable hex digest for cache keys (not cryptographic). */
export function digest(s: string): string {
  const a = hashString(s);
  const b = hashString(s + '\u0001' + s.length);
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}
