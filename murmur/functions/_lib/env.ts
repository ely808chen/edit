/** Minimal KV interface (Cloudflare KV compatible) so functions stay testable in Node. */
export interface KV {
  get(key: string, type?: 'text'): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  PROVIDER?: string;
  JEV_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  VERCEL_AI_GATEWAY_KEY?: string;
  JEV_MODEL?: string;
  QUESTIONS_PER_REQUEST?: string;
  MAX_IN_FLIGHT?: string;
  DAILY_QUESTION_BUDGET?: string;
  KILL_SWITCH?: string;
  ALLOWED_ORIGIN?: string;
  CACHE?: KV;
  REPLAYS?: KV;
}

export interface Ctx<P extends Record<string, string> = Record<string, string>> {
  request: Request;
  env: Env;
  params: P;
  waitUntil(p: Promise<unknown>): void;
}

export interface Config {
  provider: 'mock' | 'typesafe' | 'openrouter' | 'vercel';
  questionsPerRequest: number;
  maxInFlight: number;
  dailyBudget: number;
  killSwitch: boolean;
  allowedOrigin: string;
}

function int(v: string | undefined, d: number, min: number, max: number): number {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : d;
}

export function config(env: Env): Config {
  const p = (env.PROVIDER ?? 'mock').toLowerCase();
  const provider = p === 'typesafe' || p === 'openrouter' || p === 'vercel' ? p : 'mock';
  return {
    provider,
    questionsPerRequest: int(env.QUESTIONS_PER_REQUEST, 32, 1, 128),
    maxInFlight: int(env.MAX_IN_FLIGHT, 6, 1, 32),
    dailyBudget: int(env.DAILY_QUESTION_BUDGET, 200000, 0, 1e9),
    killSwitch: (env.KILL_SWITCH ?? 'false').toLowerCase() === 'true',
    allowedOrigin: env.ALLOWED_ORIGIN ?? '*',
  };
}
