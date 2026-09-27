import type { PlaceId, Weather } from '../../shared/types';
import { digest, normalizeEventText } from '../../shared/hash';
import type { Ctx } from './env';
import { isBlockedText } from './moderation';
import { budgetAllows, recordUsage } from './limits';
import { getProvider, mockProvider } from './providers';
import type { AnalyzeOutput } from './providers/types';
import { withRetry } from './run';
import { log } from './http';

export interface AnalysisResult {
  out: AnalyzeOutput;
  mock: boolean;
  fallback: boolean;
  provider: string;
  cached: boolean;
}

const BLOCKED: AnalyzeOutput = {
  blocked: true,
  category: 'other',
  place: 'park',
  severity: 'trivial',
  broadcast: false,
  weather: 'none',
  groupLeans: [],
  questions: 0,
};

/** Shared by /api/preview and /api/analyze: blocklist, cache, budget, provider, fallback. */
export async function runAnalysis(
  ctx: Ctx,
  input: { text: string; minute: number; weather: Weather; clickedPlace: PlaceId | null; withLeans: boolean },
): Promise<AnalysisResult> {
  const t0 = Date.now();
  const provider = getProvider(ctx.env);
  if (isBlockedText(input.text)) {
    log(input.withLeans ? 'preview' : 'analyze', { blocked: true, by: 'blocklist', ms: Date.now() - t0 });
    return { out: BLOCKED, mock: provider.mock, fallback: false, provider: provider.name, cached: false };
  }
  const kind = input.withLeans ? 'p' : 'a';
  const key = `${kind}:${digest(`${normalizeEventText(input.text)}|${input.clickedPlace ?? 'auto'}|${input.withLeans ? input.minute - (input.minute % 60) : ''}`)}`;
  if (ctx.env.CACHE && !provider.mock) {
    const hit = await ctx.env.CACHE.get(key);
    if (hit) {
      try {
        const out = JSON.parse(hit) as AnalyzeOutput;
        if (input.clickedPlace) out.place = input.clickedPlace;
        log(kind === 'p' ? 'preview' : 'analyze', { cached: true, ms: Date.now() - t0 });
        return { out, mock: false, fallback: false, provider: provider.name, cached: true };
      } catch {
        // fall through
      }
    }
  }
  const estQuestions = input.withLeans ? 14 : 6;
  const allowed = await budgetAllows(ctx.env, estQuestions);
  if (!allowed || provider.mock) {
    const out = await mockProvider({ latency: provider.mock }).analyze(input, new AbortController().signal);
    return { out, mock: true, fallback: !allowed, provider: provider.name, cached: false };
  }
  try {
    const out = await withRetry((signal) => provider.analyze(input, signal), kind);
    recordUsage(ctx.env, out.questions, ctx.waitUntil);
    if (ctx.env.CACHE) ctx.waitUntil(ctx.env.CACHE.put(key, JSON.stringify(out), { expirationTtl: 86400 }));
    log(kind === 'p' ? 'preview' : 'analyze', { provider: provider.name, questions: out.questions, ms: Date.now() - t0, blocked: out.blocked });
    return { out, mock: false, fallback: false, provider: provider.name, cached: false };
  } catch {
    const out = await mockProvider({ latency: false }).analyze(input, new AbortController().signal);
    return { out, mock: true, fallback: true, provider: provider.name, cached: false };
  }
}
