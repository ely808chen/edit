import { ACTION_KEYS, CATEGORY_KEYS, GROUP_IDS, PLACE_IDS, SEVERITIES, WEATHER_KEYS } from '../../../shared/types';
import type { ActionKey, ActionProbs, DecideContext, DecideRequest, GroupLean, PlaceId, Severity, Weather } from '../../../shared/types';
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

const severityRank: Record<Severity, number> = { trivial: 0, notable: 1, big_deal: 2, city_wide: 3 };

function includesAny(text: string, words: readonly string[]): boolean {
  const t = text.toLocaleLowerCase();
  return words.some((w) => t.includes(w));
}

function atLeastSeverity(current: Severity, min: Severity): Severity {
  return severityRank[current] >= severityRank[min] ? current : min;
}

function isFreeFood(text: string): boolean {
  return includesAny(text, ['free', 'giveaway', '無料', 'タダ']) && includesAny(text, ['ramen', 'food', 'meal', 'noodle', 'ラーメン', 'ご飯', '食']);
}

function isCatMayor(text: string): boolean {
  return includesAny(text, ['cat', 'kitten', '猫', 'ねこ', 'ネコ']) && includesAny(text, ['mayor', 'elected', 'election', '市長', '町長', '選挙']);
}

function isFireworks(text: string): boolean {
  return includesAny(text, ['firework', '花火']);
}

function boostProbs(probs: ActionProbs, boosts: Partial<Record<ActionKey, number>>): ActionProbs {
  return normalizeProbs(Object.fromEntries(ACTION_KEYS.map((k) => [k, probs[k] * (boosts[k] ?? 1)])));
}

function calibrateAnalysis(input: AnalyzeInput, out: AnalyzeOutput): AnalyzeOutput {
  const next: AnalyzeOutput = { ...out };
  if (isCatMayor(input.text)) {
    next.category = 'silly';
    next.severity = atLeastSeverity(next.severity, 'big_deal');
    next.broadcast = true;
  } else if (next.category === 'free_food' && isFreeFood(input.text)) {
    next.severity = atLeastSeverity(next.severity, 'big_deal');
  }
  if (isFireworks(input.text)) next.weather = 'fireworks';
  return next;
}

function calibrateDecisionProbs(probs: ActionProbs, req: DecideRequest, ctx: DecideContext): ActionProbs {
  const text = req.event.text;
  if (req.event.category === 'free_food' || isFreeFood(text)) {
    let next = boostProbs(probs, { rush_toward: 1.35, spread_word: 1.15, ignore: 0.65 });
    if (ctx.archetypeId === 'street_foodie') next = boostProbs(next, { rush_toward: 2.4, stroll_toward: 0.75, ignore: 0.2 });
    return next;
  }
  if (req.event.category === 'rumor') {
    let next = boostProbs(probs, { investigate: 1.9, spread_word: 1.8, stroll_toward: 0.8, ignore: 0.32 });
    if (ctx.archetypeId === 'cautious_grandma') {
      next = boostProbs(next, { head_home: 18, flee: 14, spread_word: 0.08, investigate: 0.18, ignore: 0.18, stroll_toward: 0.25 });
    }
    return next;
  }
  if (isCatMayor(text)) {
    let next = boostProbs(probs, { celebrate: 3.6, film_it: 1.8, spread_word: 1.8, ignore: 0.25, stroll_toward: 0.55, complain: 0.4 });
    if (ctx.archetypeId === 'cat_lover') next = boostProbs(next, { celebrate: 10, rush_toward: 1.4, ignore: 0.08, stroll_toward: 0.25 });
    return next;
  }
  return probs;
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
      return calibrateAnalysis(input, {
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
      });
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
        if (p) out.set(c.key, calibrateDecisionProbs(normalizeProbs(Object.fromEntries(ACTION_KEYS.map((k) => [k, p[k] ?? 0]))), req, c));
      });
      return out;
    },
  };
}
