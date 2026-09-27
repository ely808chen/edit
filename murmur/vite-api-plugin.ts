import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

type Handler = (ctx: unknown) => Promise<Response> | Response;

const ROUTES: Array<{ method: string; pattern: RegExp; file: string; fn: string; param?: string }> = [
  { method: 'POST', pattern: /^\/api\/preview$/, file: 'functions/api/preview.ts', fn: 'onRequestPost' },
  { method: 'POST', pattern: /^\/api\/analyze$/, file: 'functions/api/analyze.ts', fn: 'onRequestPost' },
  { method: 'POST', pattern: /^\/api\/decide$/, file: 'functions/api/decide.ts', fn: 'onRequestPost' },
  { method: 'POST', pattern: /^\/api\/share$/, file: 'functions/api/share.ts', fn: 'onRequestPost' },
  { method: 'GET', pattern: /^\/api\/replay\/([^/]+)$/, file: 'functions/api/replay/[id].ts', fn: 'onRequestGet', param: 'id' },
];

function devVars(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const file = resolve(root, '.dev.vars');
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}

/**
 * Serves the Cloudflare Pages Functions from /functions inside the Vite dev server, with
 * in-memory KV. `npm run pages:dev` runs the real Workers runtime via wrangler instead.
 */
export function apiDevPlugin(): Plugin {
  const root = process.cwd();
  let env: Record<string, unknown> | null = null;
  return {
    name: 'murmur-api-dev',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (!url.pathname.startsWith('/api/')) return next();
        const route = ROUTES.find((r) => r.pattern.test(url.pathname) && (r.method === req.method || req.method === 'OPTIONS'));
        if (!route) {
          res.statusCode = 404;
          res.end('{"error":"Not found"}');
          return;
        }
        try {
          if (!env) {
            const { memoryKv } = (await server.ssrLoadModule(resolve(root, 'functions/_lib/memoryKv.ts'))) as { memoryKv: () => unknown };
            env = { PROVIDER: 'mock', ALLOWED_ORIGIN: '*', ...process.env, ...devVars(root), CACHE: memoryKv(), REPLAYS: memoryKv() };
          }
          const mod = (await server.ssrLoadModule(resolve(root, route.file))) as Record<string, Handler>;
          const fnName = req.method === 'OPTIONS' ? 'onRequestOptions' : route.fn;
          const handler = mod[fnName];
          const body = req.method === "GET" || req.method === "HEAD" ? undefined : new Uint8Array(await readBody(req));
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
          const request = new Request(url.toString(), { method: req.method, headers, body });
          const m = route.pattern.exec(url.pathname);
          const params = route.param && m ? { [route.param]: decodeURIComponent(m[1]) } : {};
          const pending: Promise<unknown>[] = [];
          const response = await handler({ request, env, params, waitUntil: (p: Promise<unknown>) => pending.push(p) });
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          if (response.body) {
            const reader = response.body.getReader();
            for (;;) {
              const { value, done } = await reader.read();
              if (done) break;
              res.write(Buffer.from(value));
            }
          }
          res.end();
          void Promise.allSettled(pending);
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: (e as Error).message }));
        }
      });
    },
  };
}
