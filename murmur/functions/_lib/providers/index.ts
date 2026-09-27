import type { Env } from '../env';
import { config } from '../env';
import { jevHost, jevProvider } from './jev';
import { mockProvider } from './mock';
import type { Provider } from './types';

export type { Provider } from './types';

/** Picks the adapter from PROVIDER. A real provider without its key falls back to mock. */
export function getProvider(env: Env): Provider {
  const cfg = config(env);
  if (cfg.provider === 'mock') return mockProvider();
  const host = jevHost(cfg.provider, env);
  if (!host) return mockProvider();
  return jevProvider(host);
}

export { mockProvider };
