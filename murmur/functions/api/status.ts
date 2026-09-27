import type { Ctx } from '../_lib/env';
import { config } from '../_lib/env';
import { json, preflight } from '../_lib/http';
import { getProvider } from '../_lib/providers';

export const onRequestOptions = (ctx: Ctx) => preflight(ctx.request, ctx.env);

/** Lets the client label mock mode from the first frame. Reveals no keys or limits. */
export async function onRequestGet(ctx: Ctx): Promise<Response> {
  const provider = getProvider(ctx.env);
  const killed = config(ctx.env).killSwitch;
  return json(ctx.request, ctx.env, { provider: provider.name, mock: provider.mock || killed, fallback: killed });
}
