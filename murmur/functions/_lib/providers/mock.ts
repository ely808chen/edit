import type { ActionProbs, DecideContext, DecideRequest } from '../../../shared/types';
import { mockAnalysis, mockDecideContext, mockGroupLeans } from '../../../shared/mock';
import type { AnalyzeInput, AnalyzeOutput, Provider } from './types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function mockProvider(opts: { latency?: boolean } = {}): Provider {
  const latency = opts.latency ?? true;
  return {
    name: 'mock',
    mock: true,
    async analyze(input: AnalyzeInput): Promise<AnalyzeOutput> {
      const a = mockAnalysis(input.text, input.clickedPlace);
      if (latency) await sleep(60 + Math.random() * 90);
      return {
        blocked: false,
        category: a.category,
        place: a.place,
        severity: a.severity,
        broadcast: a.broadcast,
        weather: a.weather,
        groupLeans: input.withLeans ? mockGroupLeans(input.text, a, input.minute) : [],
        questions: 0,
      };
    },
    async decideBatch(req: DecideRequest, contexts: DecideContext[]): Promise<Map<string, ActionProbs>> {
      if (latency) await sleep(150 + Math.random() * 250);
      const out = new Map<string, ActionProbs>();
      for (const c of contexts) out.set(c.key, mockDecideContext(c, req.event, req.world));
      return out;
    },
  };
}
