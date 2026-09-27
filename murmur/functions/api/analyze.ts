import type { AnalyzeResponse } from '../../shared/types';
import type { Ctx } from '../_lib/env';
import { clientIp, errorResponse, HttpError, json, originAllowed, preflight, readJson } from '../_lib/http';
import { rateLimit } from '../_lib/limits';
import { cleanMinute, cleanPlace, cleanText, cleanWeather } from '../_lib/validate';
import { runAnalysis } from '../_lib/analysis';

export const onRequestOptions = (ctx: Ctx) => preflight(ctx.request, ctx.env);

function eventId(): string {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(ctx: Ctx): Promise<Response> {
  const { request, env } = ctx;
  try {
    if (!originAllowed(request, env)) throw new HttpError(403, 'Origin not allowed');
    if (!rateLimit('analyze', clientIp(request))) throw new HttpError(429, 'Slow down a little');
    const body = await readJson<{ text?: unknown; minute?: unknown; weather?: unknown; clickedPlace?: unknown }>(request, 4096);
    const text = cleanText(body.text);
    const r = await runAnalysis(ctx, {
      text,
      minute: cleanMinute(body.minute),
      weather: cleanWeather(body.weather),
      clickedPlace: cleanPlace(body.clickedPlace),
      withLeans: false,
    });
    const res: AnalyzeResponse = {
      eventId: eventId(),
      blocked: r.out.blocked,
      category: r.out.category,
      place: r.out.place,
      severity: r.out.severity,
      broadcast: r.out.broadcast,
      weather: r.out.weather,
      probs: r.out.probs,
      mock: r.mock,
    };
    return json(request, env, res, 200, { 'x-murmur-provider': r.provider, 'x-murmur-fallback': r.fallback ? '1' : '0' });
  } catch (e) {
    return errorResponse(request, env, e);
  }
}
