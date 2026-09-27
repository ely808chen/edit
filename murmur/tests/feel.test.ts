import { describe, expect, it } from 'vitest';
import { runFeelTests } from '../eval/feel-tests';
import { mockProvider } from '../functions/_lib/providers/mock';

describe('feel tests (mock provider)', () => {
  it('passes all eight', async () => {
    const results = await runFeelTests(mockProvider({ latency: false }));
    const failures = results.filter((r) => !r.pass).map((r) => `${r.id}: ${r.checks.filter((c) => !c.pass).map((c) => `${c.name} (${c.detail})`).join('; ')}`);
    expect(failures).toEqual([]);
  }, 60_000);
});
