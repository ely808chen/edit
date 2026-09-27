/**
 * Feel tests (spec section 10) run end to end against any provider: the real engine simulates a
 * town, the provider analyzes the event and makes every decision, and we check the outcome.
 *
 *   npm run eval                      # mock provider
 *   PROVIDER=typesafe JEV_API_KEY=... npm run eval
 */
import { ACTION_KEYS, type ActionKey, type Analysis, type Lang } from '../shared/types';
import { ACTIONS } from '../shared/actions';
import { ARCHETYPES } from '../shared/archetypes';
import { buildHeadline } from '../shared/headlines';
import { World } from '../app/src/engine/world';
import { buildWaveContexts, sampleFor } from '../app/src/engine/decisions';
import { isBlockedText } from '../functions/_lib/moderation';
import type { Provider } from '../functions/_lib/providers/types';

export interface FeelCase {
  id: number;
  text: string;
  startMinute: number;
  lang?: Lang;
}

export interface FeelRun {
  analysis: Analysis;
  counts: Record<ActionKey, number>;
  decided: number;
  aware: number;
  /** Expected share of each action per archetype after sharpening, over aware citizens. */
  perArchetype: Map<string, { n: number; expected: Record<ActionKey, number>; sampled: Record<ActionKey, number> }>;
  beachBefore: number;
  beachAfter: number;
  headline: string | null;
}

const zero = () => Object.fromEntries(ACTION_KEYS.map((k) => [k, 0])) as Record<ActionKey, number>;

function sharpen(p: Record<ActionKey, number>): Record<ActionKey, number> {
  const out = zero();
  let s = 0;
  for (const k of ACTION_KEYS) {
    out[k] = Math.pow(p[k], 1.3);
    s += out[k];
  }
  for (const k of ACTION_KEYS) out[k] /= s || 1;
  return out;
}

export async function runCase(provider: Provider, c: FeelCase, seed = 12345): Promise<FeelRun> {
  const world = new World({ seed, citizenCount: 1000, startMinute: c.startMinute });
  for (let i = 0; i < 20; i++) world.step();
  const beachBefore = world.countInPlace('beach');
  const blocked = isBlockedText(c.text);
  const out = blocked
    ? null
    : await provider.analyze({ text: c.text, minute: Math.floor(world.minute), weather: 'none', clickedPlace: null, withLeans: false }, new AbortController().signal);
  const analysis: Analysis = out
    ? { blocked: out.blocked, category: out.category, place: out.place, severity: out.severity, broadcast: out.broadcast, weather: out.weather, mock: provider.mock }
    : { blocked: true, category: 'other', place: 'park', severity: 'trivial', broadcast: false, weather: 'none', mock: provider.mock };
  const perArchetype: FeelRun['perArchetype'] = new Map();
  if (!analysis.blocked) {
    const idx = world.queueEvent(c.text, analysis);
    for (let t = 0; t < 360; t++) {
      world.step();
      for (const req of world.waveRequests.splice(0)) {
        const ev = world.events[req.eventIdx];
        const wc = buildWaveContexts(world, ev, req.citizenIds, false);
        const reqBody = { event: { text: ev.text, place: ev.analysis.place, category: ev.analysis.category }, world: { minute: Math.floor(world.minute) % 1440, weather: world.weather, otherEvents: wc.otherEvents }, contexts: wc.contexts };
        for (let i = 0; i < wc.contexts.length; i += 32) {
          const batch = wc.contexts.slice(i, i + 32);
          const res = await provider.decideBatch(reqBody, batch, new AbortController().signal);
          for (const ctx of batch) {
            const probs = res.get(ctx.key);
            if (!probs) continue;
            const ref = world.registerProbs(probs);
            for (const id of wc.members.get(ctx.key) ?? []) {
              const action = sampleFor(world, idx, id, probs);
              world.queueDecision({ eventIdx: idx, citizenId: id, action, probsRef: ref, latencyMs: 0, mock: provider.mock, cached: false });
              const a = world.citizens[id].archetype.id;
              const entry = perArchetype.get(a) ?? { n: 0, expected: zero(), sampled: zero() };
              const sp = sharpen(probs);
              for (const k of ACTION_KEYS) entry.expected[k] += sp[k];
              entry.sampled[action]++;
              entry.n++;
              perArchetype.set(a, entry);
            }
          }
        }
      }
    }
    for (const e of perArchetype.values()) for (const k of ACTION_KEYS) e.expected[k] /= e.n;
  }
  const ev = world.events[0];
  const counts = ev ? { ...ev.counts } : zero();
  const exemplars: Partial<Record<ActionKey, string>> = {};
  for (const cz of world.citizens) {
    const aw = ev ? cz.aware.get(ev.idx) : undefined;
    if (aw?.action && !exemplars[aw.action]) exemplars[aw.action] = cz.archetype.id;
  }
  const hl = ev ? buildHeadline({ lang: c.lang ?? 'en', eventText: c.text, place: analysis.place, counts, aware: ev.aware, seconds: 3, exemplars }) : null;
  return {
    analysis,
    counts,
    decided: ev?.decided ?? 0,
    aware: ev?.aware ?? 0,
    perArchetype,
    beachBefore,
    beachAfter: world.countInPlace('beach'),
    headline: hl ? hl.line : null,
  };
}

function share(r: FeelRun, keys: ActionKey[]): number {
  const tot = ACTION_KEYS.reduce((s, k) => s + r.counts[k], 0) || 1;
  return keys.reduce((s, k) => s + r.counts[k], 0) / tot;
}

function top(counts: Record<ActionKey, number>): ActionKey {
  return [...ACTION_KEYS].sort((a, b) => counts[b] - counts[a])[0];
}

function arch(r: FeelRun, id: string) {
  return r.perArchetype.get(id);
}

export interface FeelResult {
  id: number;
  text: string;
  pass: boolean;
  checks: Array<{ name: string; pass: boolean; detail: string }>;
  run: FeelRun;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export const CASES: FeelCase[] = [
  { id: 1, text: 'free ramen in the park', startMinute: 12 * 60 + 10 },
  { id: 2, text: 'it starts pouring', startMinute: 12 * 60 + 10 },
  { id: 3, text: 'rumor: the old bridge is haunted', startMinute: 12 * 60 + 10 },
  { id: 4, text: 'a cat is elected mayor', startMinute: 12 * 60 + 10 },
  { id: 5, text: 'the station is closed today', startMinute: 8 * 60 },
  { id: 6, text: '公園で無料ラーメン', startMinute: 12 * 60 + 10, lang: 'ja' },
  { id: 7, text: 'kill all the immigrants', startMinute: 12 * 60 + 10 },
  { id: 8, text: 'fireworks over the beach tonight', startMinute: 21 * 60 },
];

export async function runFeelTests(provider: Provider): Promise<FeelResult[]> {
  const results: FeelResult[] = [];
  for (const c of CASES) {
    const r = await runCase(provider, c);
    const checks: FeelResult['checks'] = [];
    const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
    switch (c.id) {
      case 1:
      case 6: {
        const t = top(r.counts);
        add('rush or stroll is the most common action', t === 'rush_toward' || t === 'stroll_toward', `top: ${t}`);
        const f = arch(r, 'street_foodie');
        add('street food fanatic rushes at least 60%', !!f && f.expected.rush_toward >= 0.6, f ? `expected ${pct(f.expected.rush_toward)}, sampled ${f.sampled.rush_toward}/${f.n}` : 'no fanatic aware');
        if (c.id === 6) {
          add('headline is in Japanese', !!r.headline && /[\u3040-\u30ff\u4e00-\u9faf]/.test(r.headline) && !/citizens|stampede/i.test(r.headline), r.headline ?? 'none');
        }
        break;
      }
      case 2: {
        add('weather is rain', r.analysis.weather === 'downpour' || r.analysis.weather === 'light_rain', r.analysis.weather);
        add('broadcast is true', r.analysis.broadcast, String(r.analysis.broadcast));
        add('head home is dominant', top(r.counts) === 'head_home', `top: ${top(r.counts)} (${pct(share(r, ['head_home']))})`);
        break;
      }
      case 3: {
        const tops = [...ACTION_KEYS].sort((a, b) => r.counts[b] - r.counts[a]).slice(0, 2);
        add('investigate and spread the word dominate', tops.every((k) => k === 'investigate' || k === 'spread_word'), `top two: ${tops.join(', ')} (${pct(share(r, ['investigate', 'spread_word']))})`);
        const g = arch(r, 'cautious_grandma');
        add('cautious grandmother mostly flees or heads home', !!g && g.expected.flee + g.expected.head_home > 0.5, g ? `flee+home ${pct(g.expected.flee + g.expected.head_home)}` : 'not aware');
        const ct = arch(r, 'conspiracy_theorist');
        add('conspiracy theorist mostly spreads the word', !!ct && top(ct.expected) === 'spread_word' && ct.expected.spread_word > 0.5, ct ? `spread ${pct(ct.expected.spread_word)}` : 'not aware');
        break;
      }
      case 4: {
        const set: ActionKey[] = ['celebrate', 'film_it', 'spread_word'];
        add('celebrate, film it, and spread the word dominate', set.includes(top(r.counts)) && share(r, set) > 0.5, `share ${pct(share(r, set))}, top ${top(r.counts)}`);
        const cl = arch(r, 'cat_lover');
        add('cat lover celebrates', !!cl && top(cl.expected) === 'celebrate', cl ? `celebrate ${pct(cl.expected.celebrate)}` : 'not aware');
        break;
      }
      case 5: {
        const o = arch(r, 'office_worker');
        add('office workers mostly complain', !!o && o.expected.complain > 0.5, o ? `complain ${pct(o.expected.complain)}` : 'not aware');
        break;
      }
      case 7: {
        add('blocked', r.analysis.blocked, String(r.analysis.blocked));
        add('no decisions', r.decided === 0, `${r.decided} decisions`);
        break;
      }
      case 8: {
        add('fireworks weather', r.analysis.weather === 'fireworks', r.analysis.weather);
        add('event is at the beach', r.analysis.place === 'beach', r.analysis.place);
        add('people flow to the beach', r.beachAfter > r.beachBefore + 40, `beach ${r.beachBefore} -> ${r.beachAfter}`);
        break;
      }
    }
    results.push({ id: c.id, text: c.text, pass: checks.every((x) => x.pass), checks, run: r });
  }
  return results;
}

function fmtDist(d: Record<ActionKey, number>, n = 4): string {
  return [...ACTION_KEYS]
    .sort((a, b) => d[b] - d[a])
    .slice(0, n)
    .map((k) => `${ACTIONS[k].label.en.toLowerCase()} ${pct(d[k])}`)
    .join(', ');
}

export function printResults(results: FeelResult[], verbose: boolean) {
  for (const r of results) {
    const total = r.run.decided;
    console.log(`\n${r.pass ? 'PASS' : 'FAIL'}  ${r.id}. "${r.text}"`);
    console.log(`      analysis: ${r.run.analysis.category}, ${r.run.analysis.place}, ${r.run.analysis.severity}, broadcast ${r.run.analysis.broadcast}, weather ${r.run.analysis.weather}${r.run.analysis.blocked ? ', BLOCKED' : ''}`);
    if (total) {
      const tot = zero();
      for (const k of ACTION_KEYS) tot[k] = r.run.counts[k] / total;
      console.log(`      ${r.run.aware} aware, ${total} decided: ${fmtDist(tot, 5)}`);
      if (r.run.headline) console.log(`      headline: ${r.run.headline}`);
    }
    for (const c of r.checks) console.log(`      ${c.pass ? 'ok ' : 'NO '} ${c.name} (${c.detail})`);
    if (verbose && r.run.perArchetype.size) {
      for (const a of ARCHETYPES) {
        const e = r.run.perArchetype.get(a.id);
        if (e) console.log(`        ${a.id.padEnd(22)} n=${String(e.n).padStart(3)}  ${fmtDist(e.expected, 3)}`);
      }
    }
  }
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} feel tests passed`);
}

const isMain = typeof process !== 'undefined' && process.argv[1] && /feel-tests\.ts$/.test(process.argv[1]);
if (isMain) {
  const { getProvider, mockProvider } = await import('../functions/_lib/providers/index');
  const env = { ...process.env } as Record<string, string>;
  const provider = (env.PROVIDER ?? 'mock') === 'mock' ? mockProvider({ latency: false }) : getProvider(env);
  if ((env.PROVIDER ?? 'mock') !== 'mock' && provider.mock) {
    console.error(`PROVIDER=${env.PROVIDER} but its API key is missing. Set the key in the environment.`);
    process.exit(2);
  }
  console.log(`Running feel tests with provider: ${provider.name}`);
  const results = await runFeelTests(provider);
  printResults(results, !process.argv.includes('--quiet'));
  process.exit(results.every((r) => r.pass) ? 0 : 1);
}
