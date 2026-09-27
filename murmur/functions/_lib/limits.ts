import type { Env } from './env';
import { config } from './env';

/**
 * Per-IP sliding-window rate limits. State lives in the isolate's memory, which is good enough
 * to stop casual abuse; add a Cloudflare rate limiting rule in front for hard guarantees.
 */
const windows = new Map<string, Array<{ t: number; n: number }>>();

export const LIMITS = {
  analyze: { max: 20, windowMs: 5 * 60_000 },
  preview: { max: 90, windowMs: 60_000 },
  decide: { max: 6000, windowMs: 60_000 },
  share: { max: 30, windowMs: 10 * 60_000 },
} as const;

export function rateLimit(route: keyof typeof LIMITS, ip: string, cost = 1, now = Date.now()): boolean {
  const { max, windowMs } = LIMITS[route];
  const key = `${route}:${ip}`;
  const list = (windows.get(key) ?? []).filter((e) => now - e.t < windowMs);
  const used = list.reduce((s, e) => s + e.n, 0);
  if (used + cost > max) {
    windows.set(key, list);
    return false;
  }
  list.push({ t: now, n: cost });
  windows.set(key, list);
  if (windows.size > 20000) {
    for (const [k, v] of windows) if (!v.length || now - v[v.length - 1].t > 10 * 60_000) windows.delete(k);
  }
  return true;
}

// ---------------------------------------------------------------------------
// Daily question budget
// ---------------------------------------------------------------------------

let budgetDay = '';
let budgetKnown = 0;
let budgetPending = 0;
let budgetReadAt = 0;
let budgetFlushAt = 0;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** True when real Jev calls are allowed right now (budget left and kill switch off). */
export async function budgetAllows(env: Env, questions: number): Promise<boolean> {
  const cfg = config(env);
  if (cfg.killSwitch || cfg.provider === 'mock') return !cfg.killSwitch;
  const day = today();
  const now = Date.now();
  if (day !== budgetDay) {
    budgetDay = day;
    budgetKnown = 0;
    budgetPending = 0;
    budgetReadAt = 0;
  }
  if (env.CACHE && now - budgetReadAt > 30_000) {
    budgetReadAt = now;
    const v = await env.CACHE.get(`budget:${day}`);
    budgetKnown = Math.max(budgetKnown, Number(v ?? '0') || 0);
  }
  return budgetKnown + budgetPending + questions <= cfg.dailyBudget;
}

export function recordUsage(env: Env, questions: number, waitUntil: (p: Promise<unknown>) => void) {
  budgetPending += questions;
  const now = Date.now();
  if (!env.CACHE || now - budgetFlushAt < 10_000) return;
  budgetFlushAt = now;
  const day = budgetDay || today();
  const add = budgetPending;
  budgetPending = 0;
  waitUntil(
    (async () => {
      const cur = Number((await env.CACHE!.get(`budget:${day}`)) ?? '0') || 0;
      budgetKnown = cur + add;
      await env.CACHE!.put(`budget:${day}`, String(budgetKnown), { expirationTtl: 3 * 86400 });
    })().catch(() => {
      budgetPending += add;
    }),
  );
}
