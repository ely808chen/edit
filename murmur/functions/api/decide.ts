import type { ActionProbs, DecideContext, DecideLine } from '../../shared/types';
import { decideCacheKey } from '../../shared/cacheKeys';
import { mockDecideContext } from '../../shared/mock';
import type { Ctx } from '../_lib/env';
import { config } from '../_lib/env';
import { clientIp, corsHeaders, errorResponse, HttpError, log, originAllowed, preflight, readJson } from '../_lib/http';
import { budgetAllows, rateLimit, recordUsage } from '../_lib/limits';
import { isBlockedText } from '../_lib/moderation';
import { getProvider, mockProvider } from '../_lib/providers';
import { pool, withRetry } from '../_lib/run';
import { parseDecide } from '../_lib/validate';

export const onRequestOptions = (ctx: Ctx) => preflight(ctx.request, ctx.env);

const MAX_BODY = 256 * 1024;
const TTL = 86400;

export async function onRequestPost(ctx: Ctx): Promise<Response> {
  const { request, env } = ctx;
  try {
    if (!originAllowed(request, env)) throw new HttpError(403, 'Origin not allowed');
    const req = parseDecide(await readJson(request, MAX_BODY));
    if (isBlockedText(req.event.text) || req.world.otherEvents.some(isBlockedText)) throw new HttpError(400, 'Blocked event');
    if (!rateLimit('decide', clientIp(request), req.contexts.length)) throw new HttpError(429, 'Slow down a little');

    const cfg = config(env);
    const provider = getProvider(env);
    const allowed = provider.mock || (await budgetAllows(env, req.contexts.length));
    const active = allowed ? provider : mockProvider();
    const fallback = !allowed;
    const t0 = Date.now();
    const keyFor = (c: DecideContext) =>
      'd:' + decideCacheKey(req.event.text, req.event.place, req.event.category, req.world.weather, req.world.minute, req.world.otherEvents, c.key);

    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let open = true;
        const write = (line: DecideLine) => {
          if (!open) return;
          try {
            controller.enqueue(enc.encode(JSON.stringify(line) + '\n'));
          } catch {
            open = false;
          }
        };
        let cachedCount = 0;
        let mockCount = 0;
        let errors = 0;
        let sent = 0;
        const todo: DecideContext[] = [];
        if (env.CACHE && !active.mock) {
          const hits = await Promise.all(req.contexts.map((c) => env.CACHE!.get(keyFor(c)).catch(() => null)));
          req.contexts.forEach((c, i) => {
            const hit = hits[i];
            if (hit) {
              try {
                write({ key: c.key, probs: JSON.parse(hit) as ActionProbs, latencyMs: 0, cached: true, mock: false });
                cachedCount++;
                return;
              } catch {
                // fall through
              }
            }
            todo.push(c);
          });
        } else {
          todo.push(...req.contexts);
        }
        const batches: DecideContext[][] = [];
        for (let i = 0; i < todo.length; i += cfg.questionsPerRequest) batches.push(todo.slice(i, i + cfg.questionsPerRequest));
        await pool(batches, cfg.maxInFlight, async (batch) => {
          const b0 = Date.now();
          let result: Map<string, ActionProbs> | null = null;
          if (!active.mock) {
            try {
              result = await withRetry((signal) => active.decideBatch(req, batch, signal), 'decide');
              sent += batch.length;
            } catch {
              errors++;
            }
          } else {
            result = await active.decideBatch(req, batch, new AbortController().signal);
          }
          const latencyMs = Date.now() - b0;
          const puts: Promise<void>[] = [];
          for (const c of batch) {
            const probs = result?.get(c.key);
            if (probs) {
              write({ key: c.key, probs, latencyMs, cached: false, mock: active.mock });
              if (active.mock) mockCount++;
              else if (env.CACHE) puts.push(env.CACHE.put(keyFor(c), JSON.stringify(probs), { expirationTtl: TTL }).catch(() => undefined));
            } else {
              mockCount++;
              write({ key: c.key, probs: mockDecideContext(c, req.event, req.world), latencyMs, cached: false, mock: true });
            }
          }
          if (puts.length) ctx.waitUntil(Promise.all(puts));
        });
        if (sent) recordUsage(env, sent, ctx.waitUntil);
        log('decide', { provider: active.name, contexts: req.contexts.length, sent, cached: cachedCount, mock: mockCount, errors, ms: Date.now() - t0, fallback });
        open = false;
        controller.close();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: {
        'content-type': 'application/x-ndjson; charset=utf-8',
        'cache-control': 'no-store',
        'x-murmur-provider': provider.name,
        'x-murmur-fallback': fallback ? '1' : '0',
        ...corsHeaders(request, env),
      },
    });
  } catch (e) {
    return errorResponse(request, env, e);
  }
}
