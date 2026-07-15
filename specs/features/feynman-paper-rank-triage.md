# Feynman PaperRank triage

## Goal

Help an operator decide which already gathered papers to read first. Nexus scores two to twenty-five supplied candidates with a deterministic, inspectable adaptation of Feynman's PaperRank weighting model and returns the ranked order, every available component, and the evidence that is still missing.

## Operator flow

1. Start the `Paper rank` HQ workflow or ask NOVA/JANSKY to rank papers.
2. Supply a topic and a JSON array containing direct paper metadata. The agent must not invent missing metadata.
3. The existing protected `/api/tools` route calls `feynman_paper_rank`.
4. Nexus returns a Markdown read-order report with a ranked table, component audit, missing signals, formula, and limitations.

## Input contract

- `topic`: 1-240 characters.
- `candidates_json`: a JSON array of 2-25 objects.
- Required candidate field: `title`.
- Optional direct evidence: `id`, `abstract`, `url`, `year`, `citationCount`, `graphPrestige`, `codeUrl`, `dataUrl`, `methodologyText`, and `reproducibilityText`.
- Long text and URLs are bounded. Invalid JSON, invalid ranges, or unknown object shapes fail with a generic corrective message.

## Scoring contract

The available-signal score uses Feynman's published weights:

| Signal               | Weight | Nexus evidence                                                     |
| -------------------- | -----: | ------------------------------------------------------------------ |
| Topical relevance    |   0.30 | Token overlap between the topic and supplied title/abstract        |
| Citation impact      |   0.20 | Log-normalized supplied citation count within the candidate set    |
| Graph prestige       |   0.20 | Explicit caller-supplied 0-100 graph signal only                   |
| Citation velocity    |   0.10 | Supplied citations divided by paper age, normalized within the set |
| Methodology evidence |   0.10 | Transparent marker screening in supplied abstract/methodology text |
| Reproducibility      |   0.10 | Supplied code/data links and reproducibility markers               |

Missing components are excluded from that paper's denominator and listed in the report. Ties preserve input order. Methodology markers are evidence-screening clues, not a scientific-quality judgment.

## Boundaries

- Fully local and deterministic after metadata is supplied.
- No fetch, provider call, API key, dependency, installation, file write, experiment, training, or paid compute.
- No paper text is treated as trusted instructions.
- No claim of peer review, truth, replication success, or calibrated researcher preference.
- The tool prioritizes reading; it does not replace reading.

## Acceptance

- Pure engine validates input, computes every score component, excludes missing signals correctly, sorts stably, and produces an honest report.
- `feynman_paper_rank` is tier 0 with the `analyze` capability and dispatches only through the existing protected tools route.
- HQ exposes `Paper rank`, with NOVA/JANSKY intent routing and a directive not to invent metadata.
- Focused runtime/static checks, `npx tsc --noEmit`, and `npm run verify` pass.
- The Feynman source-parity matrix references reviewed `v0.3.5` evidence and records PaperRank as adapted without closing unrelated parity gaps.
