# A-Evolve Assimilation Plan

> Status: Planning baseline.
> Date: 2026-04-01.
> Source: [A-EVO-Lab/a-evolve](https://github.com/A-EVO-Lab/a-evolve) and public summary coverage.
> Product invariant: Nexus Prime stays **free (MIT)**, remains a **central hub for information**, and does **not** charge users. Paid providers remain **BYOK** and optional.

---

## 1) Decision lock

We are **not** importing a self-modifying agent that rewrites Nexus without supervision.

We are assimilating the useful parts of A-Evolve:
- benchmark-gated improvement,
- reproducible mutations,
- measurable retention of wins,
- bring-your-own model/runtime flexibility,
- and explicit separation between the agent, the environment, and the evolution strategy.

We are rejecting the unsafe interpretation:
- autonomous mutation of production behavior,
- hidden prompt drift,
- benchmark gaming without operator review,
- or any change that conflicts with Nexus's free-information-hub mission.

---

## 2) What A-Evolve contributes

### Core ideas worth assimilating

1. **Mutation surfaces**
   - prompts,
   - skills,
   - memory,
   - tools,
   - and runtime policies can all be improved iteratively.

2. **Measured retention**
   - a change survives only if it improves benchmarked behavior.

3. **Reproducibility**
   - every mutation is tracked and reversible.

4. **BYOA / BYOE / BYO-Algo**
   - the system should work across providers and environments instead of depending on one model vendor.

### Nexus translation

For Nexus, this means:
- evolve the **runtime and operator workflows**, not the brand promise;
- score changes against **real Nexus missions**;
- keep all changes **approval-gated** before they become durable defaults;
- and optimize for **free signal aggregation**, **safety**, and **operator trust**.

---

## 3) Non-negotiable constraints

### Product constraints

1. Nexus is a **central hub for information**, not a paid agent platform.
2. Nexus does **not** charge users.
3. Free/public APIs are preferred by default.
4. Paid APIs are allowed only as **optional BYOK integrations**.
5. Any evolution work must improve one of:
   - information coverage,
   - operator speed,
   - reliability,
   - source traceability,
   - token/cost efficiency,
   - or safety.

### Security constraints

1. No autonomous high-risk writes to production prompts/tools.
2. No autonomous expansion into offensive actions.
3. No benchmark-only tuning that weakens real-world safety or observability.
4. No mutation of billing/product guarantees.

---

## 4) What to assimilate vs what to reject

| A-Evolve idea | Assimilate? | Nexus-native interpretation |
|---|---|---|
| Evolver agent that proposes changes | **Yes, adapted** | Approval-gated “runtime improver” workflow that proposes prompt/tool/skill changes |
| Mutating prompts and skills | **Yes, adapted** | Test candidate prompt/skill variants in eval harness before promotion |
| Mutating tools | **Yes, limited** | Tool metadata, routing, caching, and connector selection may evolve; tool scope and risk boundaries stay fixed |
| Mutating memory | **Yes, limited** | Improve summaries, learned rules, and retrieval heuristics; do not silently rewrite historical truth |
| Benchmark-gated retention | **Yes** | Changes graduate only if Nexus eval and mission KPIs improve |
| Git-tracked reproducibility | **Yes** | Mutation proposals must produce diff artifacts and rollback paths |
| Fully autonomous self-modification | **No** | All durable changes require operator approval |
| Benchmark-first optimization without product goals | **No** | Nexus uses mission-aware evals tied to real tabs and workflows |

---

## 5) Tab-by-tab assimilation map

This is the most important section: where the ideas actually land in Nexus.

### HOME / HQ

**Purpose**
- Primary surface for runtime evolution visibility and operator approval.

**Assimilate**
- Evolution status card: current runtime version, latest experiment result, last promoted improvement.
- “Proposed improvement” panel for prompt/skill/tool mutations before adoption.
- Runtime telemetry overlays for:
  - eval grade,
  - token savings,
  - benchmark delta,
  - regression warnings.
- One-click compare between baseline and candidate runtime behavior.

**Why it belongs here**
- HQ is the operator’s control room. A-Evolve’s core value is supervised improvement, so the approval surface belongs in HQ.

### COMMAND

**Purpose**
- Mission scheduling, experiment orchestration, and controlled rollouts.

**Assimilate**
- Scheduled evolution jobs for non-interactive benchmarking.
- Rollout controls:
  - baseline only,
  - candidate only,
  - shadow mode,
  - promote on approval.
- Mission templates that define which eval suite to run for each domain.
- Experiment cooldowns and failure backoff.

**Why it belongs here**
- COMMAND is already the operational backbone. A-Evolve-style loops become operational jobs, not hidden magic.

### INTEL

**Purpose**
- Strategic understanding of what is improving and why.

**Assimilate**
- Runtime research brief cards:
  - what prompt variant improved,
  - what failure mode it fixed,
  - what tradeoff it introduced.
- “Evolution thesis” board:
  - source coverage lift,
  - citation quality lift,
  - decision-lift trends,
  - token efficiency trends.
- Governance notes for which external ideas are adopted, adapted, deferred, or rejected.

**Why it belongs here**
- INTEL is where Nexus explains the system to the operator, not just runs it.

### ALPHA

**Purpose**
- Finance/market-specific decision-lift measurement.

**Assimilate**
- Domain eval set for market summaries, thesis generation, catalyst extraction, and filing digestion.
- Track whether a candidate runtime improves:
  - signal quality,
  - source citation,
  - latency,
  - hallucination resistance.
- Optional BYOK market intelligence adapters remain optional and never become required for basic use.

**Why it belongs here**
- A-Evolve says improvements must be benchmarked. ALPHA gives a concrete mission class where improvement can be measured.

### CYBER

**Purpose**
- Security-specific skill hardening and safe evaluation.

**Assimilate**
- Cyber skill-pack evaluation:
  - triage accuracy,
  - citation quality,
  - false-positive reduction,
  - exploit-stage framing quality.
- Adversarial prompt red-team tests for CIPHER and security workflows.
- Mutation targets limited to:
  - prompts,
  - taxonomies,
  - triage formatting,
  - source weighting.

**Not allowed**
- No autonomous offensive expansion.
- No exploitation workflows added by evolution.

### RECON

**Purpose**
- Connector quality and free-source coverage.

**Assimilate**
- Evaluate which free/public sources improve RECON coverage the most.
- Optimize:
  - source routing,
  - dedupe logic,
  - connector fallback order,
  - result formatting for OSINT panels.
- Maintain strict free-first policy:
  - free APIs default,
  - BYOK where unavoidable,
  - no lock-in to paid providers.

**Why it belongs here**
- RECON is the clearest place where “central hub for information” matters. Evolution should widen coverage, not narrow it behind paid walls.

### VAULT

**Purpose**
- Durable memory and experiment archive.

**Assimilate**
- Store experiment reports, approved mutations, rejected mutations, benchmark histories, and lesson summaries.
- Track:
  - what changed,
  - why it was proposed,
  - what benchmark improved,
  - why it was accepted or rejected.
- Add retrieval over prior experiments so Nexus does not repeat failed mutations.

**Why it belongs here**
- A-Evolve’s reproducibility maps naturally to Nexus’s memory/archive layer.

---

## 6) System architecture mapping

| A-Evolve concept | Nexus file/module target | Notes |
|---|---|---|
| Evolver loop | `lib/agent.ts`, future runtime improver module | Candidate runtime should stay behind explicit experiment mode |
| Mutation targets: prompts | `components/home/office/prompts.ts`, `CLAUDE.md`, `.claude/*` | Candidate variants only; never silent overwrite |
| Mutation targets: memory | `lib/liveContext.ts`, `tasks/lessons.md`, Vault artifacts | Improve memory summaries and learned-rule retrieval |
| Mutation targets: tools | `app/api/tools/route.ts`, tool metadata schemas | Optimize routing/caching/safe composition, not risk expansion |
| Benchmark harness | `scripts/eval-agent-runtime.js`, `docs/metrics/*`, `/api/metrics/runtime-eval*` | Extend existing harness, do not create a parallel untracked evaluator |
| Reproducibility | git diff + `docs/metrics/*` + Vault experiment records | Every candidate needs rollback path and artifact trail |
| Approval gate | HQ UI + settings/store + task workflow | Promotion must remain operator-controlled |

---

## 7) Phased implementation plan

## Phase A — Planning and governance

### Goal
- Add A-Evolve as a formal external pattern in the docs and lock down rules.

### Deliverables
- Dedicated assimilation plan.
- Adopt/adapt/reject matrix.
- Mission-specific KPI definitions.
- Free/BYOK constraints documented in the plan.

### Acceptance
- Every future A-Evolve-inspired task can point to one planning baseline.

## Phase B — Evaluation-first evolution layer

### Goal
- Extend the existing runtime eval system so it can compare baseline vs candidate prompt/runtime variants.

### Deliverables
- Candidate runtime mode in eval harness.
- Side-by-side scoring output:
  - baseline score,
  - candidate score,
  - per-category delta,
  - token/latency delta.
- Regression guard: candidate must not reduce safety or observability below threshold.

### Acceptance
- One candidate prompt/runtime variant can be tested without becoming default.

## Phase C — Mutation proposal workflow

### Goal
- Let Nexus propose improvements without auto-promoting them.

### Deliverables
- Mutation proposal schema:
  - mutation target,
  - rationale,
  - diff summary,
  - benchmark result,
  - rollback note.
- HQ proposal panel.
- VAULT archival of accepted/rejected proposals.

### Acceptance
- Operator can inspect and approve or reject a candidate change from HQ.

## Phase D — Domain-specific evaluators

### Goal
- Tie evolution to real tab outcomes, not generic benchmarks alone.

### Deliverables
- ALPHA eval pack.
- CYBER eval pack.
- RECON coverage/connector eval pack.
- INTEL citation-quality and synthesis-quality eval pack.

### Acceptance
- At least one candidate improvement can be scored by tab-specific KPIs.

## Phase E — Controlled automation

### Goal
- Add scheduled benchmarking and shadow experiments through COMMAND.

### Deliverables
- Nightly or operator-triggered experiment jobs.
- Shadow-mode rollout.
- Failure backoff and cooldown policy.

### Acceptance
- Nexus can run improvement experiments safely without changing default behavior.

---

## 8) KPI framework

Every A-Evolve-inspired change must move one or more of these:

1. **Information coverage**
   - more relevant sources surfaced per query or mission.

2. **Source traceability**
   - higher citation rate and cleaner provenance display.

3. **Runtime reliability**
   - fewer failed tool runs, fewer dead ends, fewer manual rescues.

4. **Token efficiency**
   - lower token cost through better context assembly, caching, or routing.

5. **Operator speed**
   - less time from question to useful answer.

6. **Domain lift**
   - better ALPHA, CYBER, RECON, or INTEL outcomes on tab-specific eval sets.

7. **Safety**
   - no increase in risk-tier violations or degraded trust signals.

---

## 9) Free-usage policy for evolution work

This must remain explicit.

### Default rule

Evolution work should prefer improvements that increase value using:
- free public APIs,
- existing local models,
- existing BYOK providers,
- and local caching/routing gains.

### What counts as acceptable

- Better free-source routing in RECON.
- Better RSS/GDELT/article synthesis in INTEL.
- Better prompt caching and context compaction in HQ.
- Better local-model routing and mission scoping in COMMAND.

### What does not count as acceptable

- Requiring paid APIs to unlock basic product usefulness.
- Building “premium intelligence” tiers inside Nexus.
- Measuring success by revenue extraction rather than information utility.

---

## 10) Recommended next backlog

### P0
- Add A-Evolve to ecosystem mapping docs.
- Extend eval harness to support baseline vs candidate runtime comparison.
- Add a candidate-mutation artifact format in VAULT.

### P1
- Add HQ “proposed runtime improvement” panel.
- Add COMMAND experiment job type and shadow-mode runner.
- Add RECON connector coverage score and ALPHA decision-lift score.

### P2
- Add per-tab evolution scorecards in INTEL.
- Add prompt/skill candidate promotion flow with operator approval.
- Add historical experiment retrieval in VAULT.

---

## 11) Final recommendation

**Verdict: ADAPT, not adopt wholesale.**

A-Evolve is valuable for Nexus because it gives us a disciplined model for:
- improving prompts, skills, tools, and memory,
- measuring improvements before promotion,
- and keeping a reproducible audit trail.

It is **not** valuable as a justification for autonomous self-rewriting.

For Nexus, the right move is:
- benchmark-gated improvement,
- operator approval,
- tab-specific evaluation,
- free-first source strategy,
- and zero conflict with the “central hub for information, no charging” mission.
