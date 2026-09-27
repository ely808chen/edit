import type { AnalyzeResponse, DecideLine, DecideRequest, Lang, PlaceId, PreviewResponse } from '../../../shared/types';
import { mockAnalysis, mockDecideContext, mockGroupLeans } from '../../../shared/mock';

export interface ServerMeta {
  provider: string;
  /** True when the server answered with simulated results because of the budget, kill switch, or an outage. */
  fallback: boolean;
}

function meta(res: Response): ServerMeta {
  return {
    provider: res.headers.get('x-murmur-provider') ?? 'unknown',
    fallback: res.headers.get('x-murmur-fallback') === '1',
  };
}

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal, timeoutMs = 4000): Promise<{ data: T; meta: ServerMeta }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { data: (await res.json()) as T, meta: meta(res) };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

export async function preview(text: string, lang: Lang, minute: number, signal: AbortSignal): Promise<{ data: PreviewResponse; meta: ServerMeta; local: boolean }> {
  try {
    const r = await postJson<PreviewResponse>('/api/preview', { text, lang, minute }, signal, 2500);
    return { ...r, local: false };
  } catch (e) {
    if ((e as Error).name === 'AbortError' && signal.aborted) throw e;
    const a = mockAnalysis(text);
    await sleep(120 + Math.random() * 120, signal);
    return {
      data: { blocked: false, category: a.category, place: a.place, severity: a.severity, groupLeans: mockGroupLeans(text, a, minute), mock: true },
      meta: { provider: 'browser', fallback: true },
      local: true,
    };
  }
}

export async function analyze(
  text: string,
  lang: Lang,
  minute: number,
  weather: string,
  clickedPlace: PlaceId | null,
): Promise<{ data: AnalyzeResponse; meta: ServerMeta; local: boolean }> {
  try {
    const r = await postJson<AnalyzeResponse>('/api/analyze', { text, lang, minute, weather, clickedPlace: clickedPlace ?? undefined }, undefined, 4000);
    return { ...r, local: false };
  } catch {
    const a = mockAnalysis(text, clickedPlace);
    return { data: { ...a, eventId: 'local-' + Date.now().toString(36) }, meta: { provider: 'browser', fallback: true }, local: true };
  }
}

/**
 * Stream decisions. Lines arrive as each server-side batch completes. If the request fails,
 * the remaining contexts are resolved by the in-browser simulation and flagged as mock.
 */
export async function decide(
  req: DecideRequest,
  onLine: (line: DecideLine) => void,
  signal: AbortSignal,
): Promise<ServerMeta> {
  const seen = new Set<string>();
  const emit = (l: DecideLine) => {
    if (seen.has(l.key)) return;
    seen.add(l.key);
    onLine(l);
  };
  let serverMeta: ServerMeta = { provider: 'browser', fallback: true };
  try {
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    signal.addEventListener('abort', onAbort);
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(req),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      serverMeta = meta(res);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          try {
            emit(JSON.parse(line) as DecideLine);
          } catch {
            // ignore malformed line; the context will be simulated below
          }
        }
      }
      if (buf.trim()) {
        try {
          emit(JSON.parse(buf.trim()) as DecideLine);
        } catch {
          // ignore
        }
      }
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
    }
  } catch (e) {
    if (signal.aborted) throw e;
  }
  const missing = req.contexts.filter((c) => !seen.has(c.key));
  if (missing.length && !signal.aborted) {
    if (seen.size === 0) serverMeta = { provider: serverMeta.provider, fallback: true };
    for (let i = 0; i < missing.length; i += 32) {
      const t0 = performance.now();
      await sleep(150 + Math.random() * 250, signal);
      for (const ctx of missing.slice(i, i + 32)) {
        emit({ key: ctx.key, probs: mockDecideContext(ctx, req.event, req.world), latencyMs: Math.round(performance.now() - t0), cached: false, mock: true });
      }
    }
  }
  return serverMeta;
}

export async function shareReplay(payload: unknown): Promise<string> {
  const res = await fetch('/api/share', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = (await res.json()) as { id: string };
  return j.id;
}

export async function fetchReplay(id: string): Promise<unknown> {
  const res = await fetch(`/api/replay/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function status(): Promise<{ provider: string; mock: boolean; fallback: boolean } | null> {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) return null;
    return (await res.json()) as { provider: string; mock: boolean; fallback: boolean };
  } catch {
    return null;
  }
}
