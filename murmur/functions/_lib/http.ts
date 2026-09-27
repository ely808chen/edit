import type { Env } from './env';
import { config } from './env';

export function corsHeaders(request: Request, env: Env): Record<string, string> {
  const allowed = config(env).allowedOrigin;
  const origin = request.headers.get('origin');
  const h: Record<string, string> = { Vary: 'Origin' };
  if (allowed === '*') h['Access-Control-Allow-Origin'] = '*';
  else if (origin && allowed.split(',').map((s) => s.trim()).includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
  h['Access-Control-Allow-Headers'] = 'content-type';
  h['Access-Control-Expose-Headers'] = 'x-murmur-provider, x-murmur-fallback';
  return h;
}

/** Rejects cross-origin browser requests from origins that aren't allowed. */
export function originAllowed(request: Request, env: Env): boolean {
  const allowed = config(env).allowedOrigin;
  if (allowed === '*') return true;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  return allowed.split(',').map((s) => s.trim()).includes(origin);
}

export function json(request: Request, env: Env, body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...corsHeaders(request, env), ...extra },
  });
}

export function preflight(request: Request, env: Env): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function readJson<T>(request: Request, maxBytes: number): Promise<T> {
  const len = Number(request.headers.get('content-length') ?? '0');
  if (len > maxBytes) throw new HttpError(413, 'Payload too large');
  const buf = await request.arrayBuffer();
  if (buf.byteLength > maxBytes) throw new HttpError(413, 'Payload too large');
  try {
    return JSON.parse(new TextDecoder().decode(buf)) as T;
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

export function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
}

export function errorResponse(request: Request, env: Env, e: unknown): Response {
  if (e instanceof HttpError) return json(request, env, { error: e.message }, e.status);
  log('error', { message: e instanceof Error ? e.message : 'unknown' });
  return json(request, env, { error: 'Internal error' }, 500);
}

/** Structured logs: counts and timings only. Event text is never logged. */
export function log(evt: string, fields: Record<string, string | number | boolean>) {
  console.log(JSON.stringify({ evt, ...fields }));
}
