# Feynman Progressive Research Design

## Goal

Upgrade every Feynman workflow from a mostly sequential generic source pass to a bounded parallel, wide-to-narrow research strategy with explicit evidence-quality thresholds.

## Chosen Approach

Nexus will use a deterministic two-wave collector inside the existing Feynman engine:

1. Build up to four varied initial query lanes: broad landscape, workflow-specific evidence, counter-evidence, and authoritative/current sources.
2. Run the initial web lanes and existing paper lane concurrently.
3. Extract and deduplicate candidate URLs, then read up to eight candidates concurrently.
4. Assess discovered, directly read, and high-confidence directly read source coverage.
5. If coverage is weak, build up to three distinct refinement queries from the identified gaps and terminology discovered in the first wave.
6. Run that one refinement wave and one final bounded direct-read pass.
7. Record the complete coverage receipt in the final report and continuity notebook.

This approach was chosen over an unrestricted iterative researcher because it captures Feynman’s wide-to-narrow behavior while preserving Nexus’s free/local, predictable, and auditable runtime boundary. It was chosen over query-only parallelization because parallel speed without coverage evaluation would not complete the source capability.

## Components

`lib/feynmanProgressiveResearch.ts` owns query plans, query rendering, coverage assessment, refinement construction, and the bounded collection runner. It depends only on injected paper-search, web-search, fetch, and progress callbacks.

`lib/feynmanResearch.ts` remains the four-stage orchestration engine. It consumes the collector result, uses the existing source ledger and synthesis stages, degrades the Researcher stage when thresholds remain unmet, and formats the coverage receipt.

The tools route keeps its current guarded network and continuity dependencies. No route, UI, or tool-catalog expansion is required.

## Query And Filter Behavior

Recency and domain filters are represented as structured query metadata and rendered into ordinary search query qualifiers before calling the existing guarded `webSearch` helper. Fast-moving `watch` and broad `deepresearch` modes receive recency-qualified lanes. When high-confidence evidence is thin, refinement targets authoritative domains such as government, academic, standards, official documentation, and paper sources.

Refinement terms are extracted conservatively from first-wave result titles and snippets. Repeated queries are rejected after normalized comparison.

## Coverage Contract

The default successful pass requires:

- at least five discovered source URLs
- at least three directly read sources
- at least two high-confidence directly read sources

The receipt records thresholds, actual counts, query-wave count, initial/refinement query counts, whether refinement ran, and remaining gaps. Failing thresholds does not discard useful evidence; it marks the Researcher stage degraded and carries the gaps into synthesis and review.

## Failure Posture

All parallel work uses settled results so one failed lane cannot cancel the others. Failures are normalized into the existing collection-failure ledger. The collector has hard caps and no recursive behavior.

## Out Of Scope

- Complete paper inspection or Hugging Face repository inspection
- Workflow-specific artifact schemas
- Paper-to-code audits
- Local execution, Docker experiments, autoresearch loops, or recurring watch enablement
