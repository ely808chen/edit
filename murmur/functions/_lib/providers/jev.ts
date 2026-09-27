import { ACTION_KEYS, CATEGORY_KEYS, GROUP_IDS, PLACE_IDS, SEVERITIES, WEATHER_KEYS } from '../../../shared/types';
import type { ActionProbs, DecideContext, DecideRequest, GroupLean, PlaceId, Weather } from '../../../shared/types';
import { normalizeProbs } from '../../../shared/actions';
import { analysisState, analyzeQuestions, decideState, decisionQuestion, previewQuestions, type JevQuestion } from '../../../shared/templates';
import type { AnalyzeInput, AnalyzeOutput, Provider } from './types';

/**
 * One adapter for every Jev host. TypeSafe, OpenRouter's Decisions API, and Vercel AI Gateway's
 * TypeSafe-compatible endpoint all accept { state, model, questions } and return { answers }.
 * Docs: https://docs.typesafe.ai/api, https://openrouter.ai/docs/guides/community/jev,
 * https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe
 */
export interface JevHost {
  name: 'typesafe' | 'openrouter' | 'vercel';
  url: string;
  model: string;
  key: string;
}

export function jevHost(name: JevHost['name'], env: { JEV_API_KEY?: string; OPENROUTER_API_KEY?: string; VERCEL_AI_GATEWAY_KEY?: string; JEV_MODEL?: string }): JevHost | null {
  const model = env.JEV_MODEL?.trim();
  switch (name) {
    case 'typesafe':
      return env.JEV_API_KEY ? { name, url: 'https://api.typesafe.ai/v1/systemone', model: model || 'jev-latest', key: env.JEV_API_KEY } : null;
    case 'openrouter':
      return env.OPENROUTER_API_KEY
        ? { name, url: 'https://openrouter.ai/api/alpha/decisions', model: model || 'typesafe/jev-1.13', key: env.OPENROUTER_API_KEY }
        : null;
    case 'vercel':
      return env.VERCEL_AI_GATEWAY_KEY
        ? { name, url: 'https://ai-gateway.vercel.sh/typesafe/v1/systemone', model: model || 'typesafe-ai/jev', key: env.VERCEL_AI_GATEWAY_KEY }
        : null;
  }
}

type Answer =
  | { type: 'choice'; choice?: string; probabilities?: Record<string, number>; confidence?: number }
  | { type: 'score'; score?: number; probabilities?: Record<string, number>; confidence?: number }
  | { type: 'noul'; noul?: number };

export class JevError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function callJev(host: JevHost, state: unknown, questions: Record<string, JevQuestion>, signal: AbortSignal): Promise<Record<string, Answer>> {
  const res = await fetch(host.url, {
    method: 'POST',
    headers: { authorization: `Bearer ${host.key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ state, model: host.model, questions }),
    signal,
  });
  if (!res.ok) throw new JevError(`${host.name} responded ${res.status}`, res.status);
  const body = (await res.json()) as { answers?: Record<string, Answer> };
  if (!body.answers || typeof body.answers !== 'object') throw new JevError(`${host.name} returned no answers`, 502);
  return body.answers;
}

function argmax<T extends string>(probs: Record<string, number> | undefined, keys: readonly T[], fallback: T): T {
  if (!probs) return fallback;
  let best = fallback;
  let bv = -1;
  for (const k of keys) {
    const v = Number(probs[k] ?? 0);
    if (v > bv) {
      bv = v;
      best = k;
    }
  }
  return best;
}

function noul(a: Answer | undefined): number {
  return a && a.type === 'noul' && typeof a.noul === 'number' ? a.noul : 0;
}

function choiceProbs(a: Answer | undefined): Record<string, number> | undefined {
  return a && a.type === 'choice' ? a.probabilities : undefined;
}

export function jevProvider(host: JevHost): Provider {
  return {
    name: host.name,
    mock: false,
    async analyze(input: AnalyzeInput, signal: AbortSignal): Promise<AnalyzeOutput> {
      const questions = input.withLeans
        ? { ...previewQuestions(), ...analyzeQuestions({ includePlace: false }) }
        : analyzeQuestions({ includePlace: !input.clickedPlace });
      const answers = await callJev(host, analysisState(input.text, input.minute, input.weather), questions, signal);
      const blocked = noul(answers.blocked) >= 0.5;
      const category = argmax(choiceProbs(answers.category), CATEGORY_KEYS, 'other');
      const place: PlaceId = input.clickedPlace ?? argmax(choiceProbs(answers.place), PLACE_IDS, 'park');
      const sev = answers.severity;
      let sevIdx = 1;
      if (sev && sev.type === 'score') {
        if (sev.probabilities) sevIdx = Number(argmax(sev.probabilities, ['0', '1', '2', '3'] as const, '1'));
        else if (typeof sev.score === 'number') sevIdx = Math.round(sev.score);
      }
      const weatherProbs = choiceProbs(answers.weather);
      let weather: Weather = argmax(weatherProbs, WEATHER_KEYS, 'none');
      if (weatherProbs && Number(weatherProbs[weather] ?? 0) < 0.45) weather = 'none';
      const groupLeans: GroupLean[] = input.withLeans
        ? GROUP_IDS.map((g) => ({ group: g, probs: normalizeProbs(choiceProbs(answers[`lean_${g}`]) ?? { ignore: 1 }) }))
        : [];
      return {
        blocked,
        category,
        place,
        severity: SEVERITIES[Math.max(0, Math.min(3, sevIdx))],
        broadcast: noul(answers.broadcast) >= 0.5,
        weather,
        groupLeans,
        probs: {
          blocked: noul(answers.blocked),
          broadcast: noul(answers.broadcast),
          category: choiceProbs(answers.category),
          place: choiceProbs(answers.place),
        },
        questions: Object.keys(questions).length,
      };
    },
    async decideBatch(req: DecideRequest, contexts: DecideContext[], signal: AbortSignal): Promise<Map<string, ActionProbs>> {
      const questions: Record<string, JevQuestion> = {};
      contexts.forEach((c, i) => {
        questions[`q${i}`] = decisionQuestion(c, req.world.otherEvents);
      });
      const answers = await callJev(host, decideState(req), questions, signal);
      const out = new Map<string, ActionProbs>();
      contexts.forEach((c, i) => {
        const p = choiceProbs(answers[`q${i}`]);
        if (p) out.set(c.key, normalizeProbs(Object.fromEntries(ACTION_KEYS.map((k) => [k, p[k] ?? 0]))));
      });
      return out;
    },
  };
}
