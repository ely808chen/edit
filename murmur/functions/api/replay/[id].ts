import type { Ctx } from '../../_lib/env';
import { corsHeaders, errorResponse, HttpError, json, preflight } from '../../_lib/http';

export const onRequestOptions = (ctx: Ctx) => preflight(ctx.request, ctx.env);

export async function onRequestGet(ctx: Ctx<{ id: string }>): Promise<Response> {
  const { request, env, params } = ctx;
  try {
    const id = String(params.id ?? '');
    if (!/^[a-z0-9]{7}$/.test(id)) throw new HttpError(404, 'Not found');
    if (!env.REPLAYS) throw new HttpError(503, 'Sharing is not configured');
    const body = await env.REPLAYS.get(id);
    if (!body) return json(request, env, { error: 'Not found' }, 404);
    return new Response(body, {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=3600', ...corsHeaders(request, env) },
    });
  } catch (e) {
    return errorResponse(request, env, e);
  }
}
