# Nexus Runtime Assimilation Plan (Purpose-Driven Innovation)

> Status: Approved planning baseline.
> Date: 2026-03-31.
> Principle: Directly assimilate open-source building blocks, then evolve them into Nexus-native capabilities with measurable operator impact.

---

## 1) Decision Lock

We are not collecting ideas passively. We are adopting an external `claude-code`-style runtime baseline and integrating it into Nexus Prime's existing multi-tab intelligence platform.

This plan defines **why each imported system exists**, **what product outcome it must improve**, and **how we evolve beyond upstream parity**.

---

## 2) Strategic Goal

Build a Nexus-native agent runtime that is:

1. **Operator-first**: faster mission execution from HQ.
2. **Auditable**: every action replayable and attributable.
3. **Cost-efficient**: reduced repetitive token spend.
4. **Safer-by-default**: policy-gated tools and explicit risk metadata.
5. **Continuously improving**: eval + tuning loop with tracked lift.

---

## 3) Assimilation Architecture (Target)

### Core layers

1. **Runtime Layer (Nexus runtime baseline)**
   - ReAct loop, planning/execution/finalization workflow, task orchestration.
2. **State Layer (AgentFS-inspired)**
   - Session filesystem + structured run history + replay artifacts.
3. **Efficiency Layer (Prompt Caching + Batch)**
   - Cached static prompt segments + asynchronous high-volume jobs.
4. **Security Layer (Cybersecurity Skills + policy)**
   - Tool risk tiers, gated write actions, ATT&CK-tagged skill packs.
5. **Intelligence Layer (TimesFM + research adapters)**
   - Forecasting and evidence-backed research augmentation.
6. **Ops Layer (IRONSIGHT-inspired UX)**
   - Real-time situational pane with confidence and source lineage.

### Integration rule

Every imported idea must map to one of the above layers and ship with:
- an owner,
- a measurable KPI,
- a rollback condition.

---

## 4) Source-to-Purpose Map

| Source | Assimilate into Nexus | Purpose in product | Evolution beyond source |
|---|---|---|---|
| External runtime baseline | Runtime engine, CLI discipline, task orchestration | Establish fast baseline for reliable agent operations | Nexus-specific routing, UI telemetry, policy hooks |
| Polymarket CLI | Command ergonomics + output contracts | Deterministic automation and scriptability | Unified command semantics across HQ and APIs |
| Anthropic Cybersecurity Skills | Skill-pack structure and security workflows | Harden cyber and recon workflows with repeatable procedures | Nexus risk-scored execution + operator approval gates |
| turbo | plan/implement/finalize operating cadence | Enforce delivery discipline and cleaner run lifecycle | Mission-specific phase templates per agent role |
| build123d | Optional CAD/generative design module | Expand to engineering/design missions | Isolated plugin w/ mission gating and vault artifacting |
| IRONSIGHT | Real-time fused intelligence display patterns | Better incident and world-event situational awareness | Nexus-native data blend (world risk + cyber + markets) |
| agent-lightning | Training/optimization framework concepts | Improve policy/prompt/runtime behavior over time | Eval-gated tuning with category thresholds already in Nexus |
| agentfs | Durable filesystem-backed agent memory | Reproducibility + state continuity | Run replay + memory-diff hooks in HQ |
| Self-evolving Claude Code guide | Runtime governance, rule verification, correction-to-lesson loop | Reduce repeated operator corrections and improve session continuity | Approval-gated rule graduation; no autonomous mutation of core runtime rules |
| TimesFM | Time-series forecasting adapter | Better foresight for market/risk scheduler decisions | Ensemble + confidence controls + fallback heuristics |
| Claude prompt caching docs | Cache breakpoints and prompt reuse | Lower latency and token cost in repeated runs | Adaptive cache strategy per agent profile |
| Claude batch processing docs | Async bulk generation and processing patterns | Higher throughput for nightly/recurring missions | Batch-aware scheduler missions with reporting |
| TurboQuant / KV-cache compression | Efficiency layer and local inference capability tracking | Lower latency/cost for long-context local runs when upstream runtimes support it | Capability-aware routing + measured benchmarks before rollout |

---

## 5) Implementation Tracks (parallelizable)

## Track A — Baseline Runtime Assimilation (Week 1)

### Objective
Integrate the external runtime baseline as first-class runtime substrate.

### Deliverables
- Runtime imported under a dedicated integration boundary.
- Nexus adapter contract to connect runtime outputs to existing HQ surfaces.
- Compatibility shim for current tools and prompts.

### Acceptance
- One end-to-end mission executes from HQ against the assimilated runtime.
- Existing high-risk write approval policy remains enforced.

---

## Track B — State + Replay (Week 1-2)

### Objective
Introduce AgentFS-style state durability and replayability.

### Deliverables
- Session artifact layout for prompts, tool calls, results, and summaries.
- Replay endpoint/utility for recent runs.
- Memory diff hook for next-session context.

### Acceptance
- Operator can inspect and replay the previous mission path.

---

## Track C — Efficiency (Week 2)

### Objective
Reduce cost and latency using cache/batch primitives.

### Deliverables
- Cache breakpoints applied to stable prompt prefixes.
- Batch pathway for non-interactive scheduled tasks.
- Efficiency telemetry panel fields (cache hit %, batch throughput).

### Acceptance
- Repeat runs show measurable token reduction and runtime improvement.

---

## Track D — Security + Skill Governance (Week 2-3)

### Objective
Assimilate cybersecurity skill patterns with strong governance.

### Deliverables
- Skill metadata schema includes risk, domain, and required approvals.
- ATT&CK-aligned cyber skill pack baseline.
- Approval and audit requirements for high-impact operations.

### Acceptance
- Cyber mission runs can be traced by skill, risk tier, and operator decision.

---

## Track E — Intelligence Evolution (Week 3-4)

### Objective
Transform imported capabilities into decision lift.

### Deliverables
- TimesFM adapter for forecast-enabled missions.
- Eval harness extension to score forecast utility and mission outcomes.
- Agent-lightning-inspired optimization backlog (prompt/policy first, RL later).

### Acceptance
- At least one mission class shows higher decision quality or lead-time.

---

## 6) Product KPIs (must move)

1. **Mission completion time** (median).
2. **Tool-call reliability** (success rate + retries).
3. **Token cost per mission** (before/after caching + batching).
4. **Operator intervention rate** (how often manual rescue is needed).
5. **Safety incidents prevented** (blocked risky actions + clear logs).
6. **Decision lift** (eval score trend and category thresholds).

If a new integration does not improve at least one KPI within two sprints, it should be downgraded or removed.

---

## 7) Assimilation Backlog (execution-ready)

### P0 — Must ship first
- [ ] Import and wire external runtime boundary.
- [ ] Define runtime adapter contract (`plan`, `implement`, `finalize`, status events).
- [ ] Persist run artifacts (inputs, tool traces, outputs, verification summary).
- [ ] Add rollout flag for old/new runtime switching.

### P1 — Must follow immediately
- [ ] Prompt caching integration for repeated system/context blocks.
- [ ] Batch mission path for scheduler-driven background tasks.
- [ ] Skill metadata enrichment: risk tier + approval requirement + domain tags.
- [ ] Cyber skill pack assimilation with operator approval by default.
- [ ] Add session boot + rule-verification flow with approval-gated graduation of repeated lessons.

### P2 — Evolution layer
- [ ] TimesFM forecasting adapter + confidence/fallback policy.
- [ ] IRONSIGHT-style fused ops pane for source-confidence monitoring.
- [ ] Agent-lightning-inspired optimization loop tied to runtime eval gates.
- [ ] Optional build123d plugin mission flow for engineering use-cases.
- [ ] Track local runtime capabilities (prompt cache, context length, KV-cache compression support) and benchmark before enabling provider-specific optimizations.

---

## 8) Governance and Sync Policy

1. Keep a documented upstream pin for each assimilated repo.
2. Track local deltas by category: bugfix, security, performance, product feature.
3. Maintain a periodic upstream sync window (weekly/biweekly).
4. Require verification + runtime eval pass before promoting to default runtime.

---

## 9) Definition of Done (Assimilation)

A source is considered *assimilated* only when all are true:

- Imported capability is live in a real Nexus workflow.
- KPI impact is measured and recorded.
- Security and audit requirements are satisfied.
- Operator documentation and rollback path exist.
- The feature is distinctly Nexus-native (not a loose bolt-on).
