import type { PreviewResponse } from '../../shared/types';
import type { Ctx } from '../_lib/env';
import { clientIp, errorResponse, HttpError, json, originAllowed, preflight, readJson } from '../_lib/http';
import { rateLimit } from '../_lib/limits';
import { cleanMinute, cleanText } from '../_lib/validate';
import { runAnalysis } from '../_lib/analysis';

export const onRequestOptions = (ctx: Ctx) => preflight(ctx.request, ctx.env);

export async function onRequestPost(ctx: Ctx): Promise<Response> {
  const { request, env } = ctx;
  try {
    if (!originAllowed(request, env)) throw new HttpError(403, 'Origin not allowed');
    if (!rateLimit('preview', clientIp(request))) throw new HttpError(429, 'Slow down a little');
    const body = await readJson<{ text?: unknown; minute?: unknown }>(request, 4096);
    const text = cleanText(body.text);
    const r = await runAnalysis(ctx, { text, minute: cleanMinute(body.minute), weather: 'none', clickedPlace: null, withLeans: true });
    const res: PreviewResponse = {
      blocked: r.out.blocked,
      category: r.out.category,
      place: r.out.place,
      severity: r.out.severity,
      groupLeans: r.out.blocked ? [] : r.out.groupLeans,
      broadcast: r.out.broadcast,
      weather: r.out.weather,
      mock: r.mock,
    };
    return json(request, env, res, 200, { 'x-murmur-provider': r.provider, 'x-murmur-fallback': r.fallback ? '1' : '0' });
  } catch (e) {
    return errorResponse(request, env, e);
  }
}
