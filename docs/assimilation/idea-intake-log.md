# Idea Intake Log (External Sources)

This log captures external ideas we are assimilating into the product roadmap and execution system.

## Thread 1 — Blue Ocean Strategy Prompt (Rimsha)

**Status:** Assimilated into strategy workflow design.

### Core takeaway

Compete less on saturated factors and design for non-customers using the ERRC framework:

- Eliminate
- Reduce
- Raise
- Create

### Product translation

- Add a "Red Ocean vs Blue Ocean" section to feature proposals.
- Require each major feature ticket to identify:
  - existing competitive factors we are ignoring,
  - non-customer segment targeted,
  - 30-day test move,
  - explicit red-ocean trap to avoid.

## Thread 2 — Token Efficiency Habits

**Status:** Assimilated into runtime cost policy.

### Core takeaway

Token waste is mostly context-reload waste; mitigate with chat compaction, batching, model routing, and feature gating.

### Product translation

- Add token-budget controls:
  - soft context-length warning at 15–20 turns,
  - summarize-and-branch action,
  - model routing tiers (cheap/default/deep),
  - tool toggles off by default unless needed.

## Thread 3 — Weekly AI Papers Digest

**Status:** Assimilated into agent architecture roadmap.

### Core takeaway

Most practical gains come from workflow design (agent graph, eval harness, memory, red-teaming), not model choice alone.

### Product translation

- Build role-specialized agent graph (Planner/Researcher/Verifier/Executor).
- Add turn-based benchmark harness and regression suite.
- Add automated red-team loop with measurable attack-success tracking.
- Add agent-agnostic memory distillation backlog item.

## Thread 4 — Self-Evolving Claude Code System

**Status:** Partially assimilated into runtime governance; **adapt selectively**, do not copy wholesale.

### Core takeaway

A coding runtime improves fastest when it has:

- a pre-edit decision framework,
- role-specialized agents,
- path-scoped rules,
- correction capture,
- and a review loop that turns repeated lessons into durable guidance.

The useful part is the **discipline + verification loop**, not blind self-modification.

### Product translation

- Keep the existing `CLAUDE.md` + `tasks/todo.md` + `tasks/lessons.md` + handoff loop as the primary operating system.
- Add an explicit session boot / verification sweep pattern for learned rules and runtime invariants.
- Add a small always-on "core invariants" layer for high-cost mistakes that must survive context drift.
- Add an `/evolve`-style review flow that proposes promotions/pruning of rules, but requires operator approval before changing durable guidance.
- Treat correction capture as a signal source; do **not** allow autonomous mutation of core runtime behavior without review.

## Thread 5 — TurboQuant / KV-Cache Compression

**Status:** Assimilated as an infrastructure watchpoint; **defer direct implementation** until the local/runtime stack supports it.

### Core takeaway

Long-context inference is often **memory-bound**, not compute-bound. The important product lesson is not "ship this exact paper," but:

- reduce context waste,
- reuse prompt/context aggressively,
- and track local-runtime features that cut KV-cache cost for long runs.

### Product translation

- Continue prioritizing prompt caching, dynamic context assembly, conversation compaction, batching, and read caching as immediate wins.
- Treat KV-cache compression as a **runtime capability flag**, not a Nexus UI feature.
- When local providers/runtimes expose this class of optimization, benchmark it against real Nexus missions before enabling or advertising it.
- Do not claim paper-level gains (for example, 6x memory or 8x speed) unless measured on the actual models and runtimes Nexus uses.

## Thread 6 — 2026-04-22 GitHub Ecosystem Batch

**Status:** Consolidated into the canonical master backlog in [`../plans/nexus-ideas-assimilation-master-backlog.md`](../plans/nexus-ideas-assimilation-master-backlog.md).

### Core takeaway

The strongest value in the latest GitHub batch is not a new tab or a flashy feature. It is a tighter **agent platform**:

- correction memory with provenance
- eval-first improvement loops
- stronger privacy shielding for cloud-bound requests
- isolated execution for higher-risk tool classes
- safer artifact and repo intelligence

### Product translation

- Prioritize platform seams before widening visible surfaces.
- Keep the current UXA3 merged-main queue separate from this ecosystem roadmap.
- Treat the new GitHub batch as raw intake in `docs/ideas/external-links-mapping.md`, curated fits in `docs/ideas/assimilated-ecosystem.md`, and execution order in the master backlog.
- Keep offensive or automation-heavy security repos out of implementation scope.

## Thread 7 — 2026-05-03 Source-Intelligence Batch

**Status:** Assimilated into the Homefront source-intelligence pass.

### Core takeaway

The new link list is valuable because it makes Homefront's intake posture more explicit:

- external repos are studied before they are absorbed,
- autonomous/security ideas need approval gates and auditability,
- OSINT/security toolkits become passive taxonomy first,
- design/taste references become local visual contracts,
- sprite/asset tooling stays private and optional.

### Product translation

- Public landing gains a `Source Intelligence` section that states the operating rule: No vendoring, Passive-first, operator-approved, proof kept.
- Protected non-HQ shell surfaces gain a compact source-intake rail so logged-in operators see the same posture while working.
- `docs/ideas/external-links-mapping.md` records every supplied repo/X batch item before anything becomes implementation.
- `docs/ideas/assimilated-ecosystem.md` promotes only the strongest fits: APTS governance, AgentShield-style permission review, OSINT taxonomy, design.md visual contracts, and guarded private sprite tooling.
- Offensive automation, unreviewed dependencies, and public game-lane positioning remain out of scope.

## Existing idea links retained for final synthesis

- https://github.com/motiful/cc-gateway
- https://github.com/banteg/bn
- https://github.com/siddharthvaddem/openscreen
- https://github.com/VoltAgent/awesome-design-md
- https://github.com/shanraisshan/claude-code-best-practice
- https://github.com/Yeachan-Heo/oh-my-codex
- https://github.com/MervinPraison
- https://github.com/sherlock-project/sherlock
- https://github.com/rtk-ai/rtk
- https://github.com/HurtzDonutStudios/ai-forge-mcp
- https://github.com/Z4nzu/hackingtool
- https://github.com/vxcontrol/pentagi
- https://github.com/liquidslr/interview-company-wise-problems
