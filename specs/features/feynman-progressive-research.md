# FEYNMAN-PROGRESSIVE-RESEARCH

## Objective

Complete the Feynman parallel-progressive-research source-parity row inside the existing read-only Feynman engine.

## Runtime Contract

- Start with 2–4 varied-angle web queries plus the existing paper search.
- Run each query wave in parallel with `Promise.allSettled`.
- Run direct source reads in parallel after URL deduplication.
- Evaluate evidence coverage after the first wave.
- Run at most one refinement wave when minimum evidence or source-quality coverage is not met.
- Refinement queries must be distinct from initial queries and use discovered terminology, recency qualifiers, or authoritative-domain filters.
- Reports and continuity notebooks must state the query-wave count, evidence thresholds, actual coverage, gaps, and whether refinement was required.

## Bounded Defaults

- Initial web queries: maximum 4.
- Refinement web queries: maximum 3.
- Query waves: maximum 2.
- Direct source reads: maximum 8.
- Minimum discovered sources: 5.
- Minimum directly read sources: 3.
- Minimum high-confidence directly read sources: 2.
- Fast-moving workflows use a bounded recency qualifier.

## Guardrails

- Read-only research only; no execution, installation, paid compute, or external writes.
- No third search wave, recursive search loop, unbounded concurrency, or caller-controlled concurrency.
- No new provider, paid dependency, public route, visual redesign, or direct provider call.
- Partial search/read failures must be retained as coverage gaps without cancelling successful lanes.
- A weak collection pass must degrade the Researcher stage honestly.
- This tranche completes only `parallel-progressive-research`; remaining Feynman parity stays open.

## Verification

- `npm run feynman:progressive:check`
- `npm run feynman:check`
- `npm run source:parity:check`
- `npm run type-check`
- `npm run verify`
