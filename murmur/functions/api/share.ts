import type { Ctx } from '../_lib/env';
import { clientIp, errorResponse, HttpError, json, log, originAllowed, preflight, readJson } from '../_lib/http';
import { rateLimit } from '../_lib/limits';
import { isBlockedText } from '../_lib/moderation';

export const onRequestOptions = (ctx: Ctx) => preflight(ctx.request, ctx.env);

const MAX_BYTES = 2 * 1024 * 1024;
const TTL = 90 * 86400;
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

export function replayId(): string {
  const b = new Uint8Array(7);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join('');
}

interface ReplayShape {
  v?: number;
  config?: { seed?: unknown; citizenCount?: unknown; startMinute?: unknown };
  events?: Array<{ text?: unknown }>;
  decisions?: unknown[];
  probs?: unknown[];
}

export async function onRequestPost(ctx: Ctx): Promise<Response> {
  const { request, env } = ctx;
  try {
    if (!originAllowed(request, env)) throw new HttpError(403, 'Origin not allowed');
    if (!rateLimit('share', clientIp(request))) throw new HttpError(429, 'Slow down a little');
    if (!env.REPLAYS) throw new HttpError(503, 'Sharing is not configured');
    const body = await readJson<ReplayShape>(request, MAX_BYTES);
    if (body.v !== 1 || !body.config || typeof body.config.seed !== 'number' || !Array.isArray(body.events) || !Array.isArray(body.decisions) || !Array.isArray(body.probs)) {
      throw new HttpError(400, 'Not a replay');
    }
    if (![300, 600, 1000].includes(Number(body.config.citizenCount))) throw new HttpError(400, 'Invalid citizen count');
    if (body.events.length > 200 || body.events.some((e) => typeof e.text !== 'string' || e.text.length > 140 || isBlockedText(e.text))) {
      throw new HttpError(400, 'Invalid events');
    }
    let id = replayId();
    for (let i = 0; i < 3 && (await env.REPLAYS.get(id)); i++) id = replayId();
    await env.REPLAYS.put(id, JSON.stringify(body), { expirationTtl: TTL });
    log('share', { events: body.events.length, decisions: body.decisions.length });
    return json(request, env, { id });
  } catch (e) {
    return errorResponse(request, env, e);
  }
}
