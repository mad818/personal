# Local analytics and memory source closure

## Outcome

Close Plausible, Umami, agentmemory, and OpenHuman with a useful local-only
usage pulse, a measurable episodic retrieval benchmark, and explicit boundaries
against visitor tracking, hidden personal-data derivation, unsafe replay, and
unauthorized communication.

## Local usage analytics

- Track authenticated route views only.
- Validate event names and route paths; reject query strings and arbitrary
  metadata.
- Aggregate immediately by UTC day instead of keeping individual event rows.
- Retain at most 30 day buckets and 32 routes per bucket.
- Store no cookies, persistent visitor identifier, query text, IP address,
  provider call, or external request.
- Expose aggregate totals and top routes in COMMAND with an explicit clear
  action.

## Episodic memory benchmark

- Compare recency-only, keyword-only, and current hybrid retrieval.
- Use deterministic ORBIT, FLUX, CIPHER, NOVA, and JANSKY fixtures.
- Require the hybrid strategy to retrieve the expected memory for all cases and
  outperform recency-only retrieval.
- Do not create embedding vectors or send personal sessions to an embedding
  provider.

## OpenHuman adaptations

- Keep the operator-editable, human-owned Markdown second brain with immutable
  source lanes and explicit promotion.
- Treat DESIGN.md plus the runtime token exporter as the safe theme-edit/export
  workflow.
- Preserve existing governed connectors, local-only mode, explicit profile,
  goals, research, routing, and review-gated workflows.

## Explicit exclusions

- No public visitor analytics platform, multi-tenant analytics, ORM, or
  high-throughput event ingestion service.
- No semantic vector copy of all personal sessions without an encrypted vector
  lifecycle.
- No automatic scored memory tree, lossy tool-output compression, or stale
  multi-agent checkpoint resume.
- No meeting attendance/transcription, unsolicited messaging/email, unified
  media studio, or broad OS-keyring encryption claim.
- No deterministic replay of mutating tool effects or fabricated complete
  cross-provider cost reconstruction.

## Acceptance

- The four matrices are complete and reviewed on 2026-07-27.
- Local analytics runtime tests prove aggregation, bounds, invalid-metadata
  rejection, retention, and clear behavior.
- The five-case benchmark reports perfect hybrid accuracy and lower
  recency-only accuracy.
- The local metrics panel is reachable in COMMAND and the route tracker runs
  only inside the authenticated shell.
- `npm run analytics-memory:check`, `npm run source:parity:check`,
  `npm run type-check`, and focused lint pass.
