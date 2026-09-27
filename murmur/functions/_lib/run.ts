import { log } from './http';

export const JEV_TIMEOUT_MS = 1500;

/** Run with a per-attempt timeout and one retry. Throws if both attempts fail. */
export async function withRetry<T>(fn: (signal: AbortSignal) => Promise<T>, label: string, timeoutMs = JEV_TIMEOUT_MS): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fn(ctrl.signal);
    } catch (e) {
      lastErr = e;
      log('provider_error', { label, attempt, message: e instanceof Error ? e.message.slice(0, 120) : 'unknown' });
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

/** Run async tasks with bounded concurrency, starting them in order. */
export async function pool<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}
