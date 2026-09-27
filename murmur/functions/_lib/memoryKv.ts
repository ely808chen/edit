import type { KV } from './env';

/** In-memory KV for local development and tests. */
export function memoryKv(): KV {
  const store = new Map<string, { v: string; exp: number }>();
  return {
    async get(key) {
      const e = store.get(key);
      if (!e) return null;
      if (e.exp && Date.now() > e.exp) {
        store.delete(key);
        return null;
      }
      return e.v;
    },
    async put(key, value, opts) {
      store.set(key, { v: value, exp: opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : 0 });
    },
  };
}
