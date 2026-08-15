# Evaluation harness

This harness compares three editorial strategies on the same shoots:

- `low-only` — every image at low detail, no inspection tool
- `full-high` — every image at high detail, no inspection tool
- `adaptive` — low-detail overview + selective `inspect_photos` (budget 8)

## Hypothesis

Can agent-controlled selective inspection recover most of the editorial quality of exhaustive high-detail analysis while using fewer high-detail inspections?

Do not assume the answer. Run the experiment.

## Ground truth

Create ground truth **before** looking at model outputs.

Ground truth is intentionally incomplete and partly subjective:

- `mustInclude` — photographs that almost any strong edit should keep
- `mustExclude` — photographs that should not appear in a careful edit
- `acceptable` — optional strong alternatives

Sequence quality still requires blind human judgment. Selection overlap is only a coarse proxy.

## Setup

1. Copy `manifest.example.json` to `manifest.json`
2. Put 12–20 JPEGs in each shoot directory
3. Fill ground-truth filename lists carefully
4. Ensure `.env.local` has `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`)
5. Run:

```bash
pnpm eval -- --manifest evals/manifest.json
```

## Metrics reported

- Selected filenames
- Must-include recall
- Must-exclude violations
- Simple selection overlap vs union of mustInclude+acceptable
- Unique high-detail inspections
- Latency
- Token usage when the SDK exposes it

## Blind judgment

For sequence quality, compare strategy outputs without labels when possible. Prefer human preference over pretending the metrics are objective truth.
