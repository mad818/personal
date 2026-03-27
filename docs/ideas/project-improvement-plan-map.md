# Nexus Prime Improvement Plan Map

This is a comprehensive execution map for making Nexus Prime robust across:
- Website runtime (`Next.js` app)
- Agent runtime (`/api/ai`, `/api/tools`, HQ chat)
- External AI clients (Claude/Cursor/Codex rules + skills)

Use this as a living control panel, not a static document.

---

## Current State Snapshot

- **Strengths**
  - Strong product surface: multi-domain intelligence cockpit + HQ AI office.
  - Local-first strategy with cloud fallback is already in place.
  - Prompt/runtime wiring has improved (live context + capability injection + route fixes).
- **Main constraints**
  - Some docs still lag behind active architecture.
  - Reliability posture is uneven across APIs (contract drift and silent-failure behavior).
  - Test/CI depth is light for a system with many external dependencies.

---

## Interactive Strategy Map

```mermaid
flowchart TD
  A[North Star: Reliable Local-First Intelligence OS] --> B[Platform Integrity]
  A --> C[AI Orchestration Quality]
  A --> D[Data Reliability]
  A --> E[User Trust & UX Clarity]
  A --> F[Delivery Velocity]

  B --> B1[Contract schemas for API routes]
  B --> B2[Env-key normalization + startup validation]
  B --> B3[Path-safety and repo hygiene]

  C --> C1[Unified model routing map]
  C --> C2[Tool policy gates + audit trail]
  C --> C3[Prompt blocks: live intel + capabilities + memory]

  D --> D1[Polling dedupe + cache policy]
  D --> D2[Circuit breaker + retry/backoff]
  D --> D3[Freshness metadata on all critical widgets]

  E --> E1[IA cleanup (tab narrative + redirects)]
  E --> E2[Degraded-mode UX badges]
  E --> E3[Actionable error states]

  F --> F1[CI quality bars]
  F --> F2[Smoke/e2e for critical flows]
  F --> F3[Release checklist + runbooks]
```

---

## 90-Day Sophisticated Plan

## Phase 1 (Weeks 1-3): Platform Integrity First

### Objectives
- Make contracts explicit.
- Remove naming/config drift.
- Ensure failures are visible and actionable.

### Work packages
- **WP1: Route contract hardening**
  - Add typed response schemas and shared interfaces for `app/api/*`.
  - Start with high-traffic routes: `ai`, `tools`, `prices`, `threat-intel`, `settings`.
- **WP2: Environment contract normalization**
  - Align `.env.example`, route env reads, and settings UI labels.
  - Add startup diagnostics endpoint (safe, no secrets leaked).
- **WP3: Quality baseline automation**
  - CI gates: typecheck, lint, path-collision guard (already added), API smoke tests.

### Exit criteria
- No unresolved key-name drift.
- High-priority routes emit stable typed payloads.
- PRs blocked on quality checks.

---

## Phase 2 (Weeks 4-7): Reliability + Observability

### Objectives
- Reduce flaky external-data behavior.
- Make runtime health measurable.

### Work packages
- **WP4: Reliability primitives in production paths**
  - Integrate `lib/circuitBreaker.ts` into external-data API fetch layers.
  - Add retry/backoff policy by source class (market, intel, weather, threat).
- **WP5: Polling and loader consolidation**
  - Remove duplicate data-loader loops.
  - Introduce refresh budgeting and source-level cooldown windows.
- **WP6: Observability spine**
  - Structured logs with request IDs.
  - Route latency + error counters.
  - Dashboard-visible health summary for major APIs.

### Exit criteria
- Lower duplicate requests and fewer transient UI blanks.
- Clear p95/p99 latency and failure metrics by route.

---

## Phase 3 (Weeks 8-12): Product Refinement + AI Ops Excellence

### Objectives
- Improve operator trust and speed.
- Align AI experiences across website and external clients.

### Work packages
- **WP7: AI orchestration governance**
  - Single source of truth for task-to-model mapping.
  - Tool risk tiering and stronger policy for write-capable operations.
- **WP8: UX trust layer**
  - Freshness + degraded-mode indicators everywhere critical.
  - Better empty/error states with quick recovery actions.
- **WP9: Plan-execute-review operating cadence**
  - Weekly architecture delta review (`docs/architecture.md` + rules sync).
  - Monthly risk review against top failure modes.

### Exit criteria
- Consistent behavior between in-app agent and external AI workflows.
- Better user confidence under degraded conditions.

---

## Improvement Backlog Matrix (Impact x Effort)

| ID | Improvement | Impact | Effort | Priority |
|---|---|---:|---:|---:|
| I-01 | API contract schemas for core routes | 5 | 3 | P0 |
| I-02 | Env naming alignment + diagnostics endpoint | 5 | 2 | P0 |
| I-03 | CI quality bars (type/lint/path/smoke) | 5 | 2 | P0 |
| I-04 | Circuit breaker integration on external sources | 4 | 3 | P1 |
| I-05 | Loader dedupe and polling budget | 4 | 2 | P1 |
| I-06 | Route-level telemetry and health board | 4 | 3 | P1 |
| I-07 | Model routing single source of truth | 4 | 2 | P1 |
| I-08 | Tool policy gate + audit improvements | 4 | 3 | P1 |
| I-09 | Tab IA and redirect simplification | 3 | 2 | P2 |
| I-10 | Degraded-mode UX + freshness labels | 3 | 2 | P2 |

---

## KPI Control Board

Track these weekly:

- **Reliability**
  - API success rate by route (`>= 99%` for core routes)
  - External fallback frequency (trend down)
  - Time-to-recover from source outage (`< 5 min`)
- **Performance**
  - `p95` route latency for top endpoints
  - Home/HQ render responsiveness under live polling
  - Request volume reduction after loader dedupe
- **Quality**
  - CI pass rate
  - Regression escape count
  - Contract-change incidents caught before merge
- **AI trust**
  - Tool-call success rate
  - Invalid/unsafe write attempt rate
  - Response-grounding quality (live-data citation adherence)

---

## Decision Gates (Interactive Checklist)

- [ ] **Gate A (Platform Ready):** Contract schemas + env alignment + CI baseline complete.
- [ ] **Gate B (Reliability Ready):** Circuit breaker + polling dedupe + telemetry complete.
- [ ] **Gate C (AI Governance Ready):** Unified model routing + tool risk policy + audit events complete.
- [ ] **Gate D (UX Trust Ready):** Freshness/degraded states and recovery actions complete.

If a gate fails, do not advance phase; open corrective tasks first.

---

## Suggested First 10 Tickets

1. Shared `zod` route schema package for `app/api/*`.
2. Normalize `.env.example` to runtime env keys actually read.
3. Add `/api/status` diagnostics summary (non-secret).
4. Add API smoke tests for `ai`, `tools`, `prices`, `threat-intel`.
5. Integrate circuit breaker for 3 highest-failure external feeds.
6. Remove duplicate loader mount points and set polling ownership.
7. Add structured logging utility with request id propagation.
8. Move model task map to one shared module used by client+server.
9. Add tool-risk policy layer for write-capable tool calls.
10. Publish architecture update cadence and owner list.

---

## How to Run This Plan

- Weekly: pick 1 P0/P1 package, ship end-to-end with metrics.
- Bi-weekly: review gate status and architecture drift.
- Monthly: re-rank backlog by measured KPI movement, not intuition.

This map is intentionally execution-oriented: plan -> build -> verify -> learn -> update.
