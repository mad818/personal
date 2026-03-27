# Agent Ecosystem Patterns -> Nexus Blueprint

This document extracts high-value patterns from established agent ecosystems and translates them into concrete Nexus Prime implementation tracks.

Goal: improve quality, reliability, and operator trust **without removing existing features**.

---

## Source Signals Reviewed

- NVIDIA AI-Q blueprint and customization docs: [AI-Q Blueprint](https://build.nvidia.com/nvidia/aiq), [Developer Guide](https://docs.nvidia.com/aiq-blueprint/latest/get-started/developer-guide.html), [Prompt customization](https://docs.nvidia.com/aiq-blueprint/latest/customization/prompts.html)
- Anthropic Claude production and MCP practices: [Claude Code best practices](https://docs.anthropic.com/en/docs/claude-code/best-practices), [Computer use tool docs](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/computer-use-tool), [MCP server best practices](https://support.anthropic.com/en/articles/11596040-best-practices-for-building-mcp-servers)
- OpenAI Codex agent workflows and guardrails: [Codex best practices](https://developers.openai.com/codex/learn/best-practices), [Workflows](http://developers.openai.com/codex/workflows), [Long-horizon tasks](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex), [Approvals and sandbox](https://developers.openai.com/codex/sandbox), [Subagents](https://developers.openai.com/codex/multi-agent)
- Cursor context/indexing and rules workflows: [Cursor codebase indexing](https://cursor.com/docs/context/codebase-indexing)
- OpenClaw gateway and execution loop model: [Agent loop](https://openclaws.io/docs/concepts/agent-loop), [Gateway runbook](https://openclaws.io/docs/gateway/)
- OpenHands/OpenDevin open-source autonomous loop architecture: [OpenHands repo](https://github.com/OpenDevin/OpenDevin)

---

## Core Patterns to Adopt

## 1) Explicit Agent Control Loop (OpenClaw + OpenHands style)

### Pattern
- Make loop phases first-class and observable: intake -> context assembly -> infer -> tool run -> verify -> finalize.
- Serialize per-session runs to avoid race conditions and state corruption.

### Nexus mapping
- Keep using `lib/agent.ts` phase model, but add standardized lifecycle event emission to a single stream.
- Add per-run id and per-session queue diagnostics to `/api/status`.

## 2) Plan -> Execute -> Verify as Required Contract (Claude + Codex style)

### Pattern
- Reliability improves when verification is mandatory, not optional.
- Agent runs should define done criteria and test/validation evidence.

### Nexus mapping
- Require verification step before phase transitions to `done` for code-affecting tool runs.
- Add structured "verification result" payload in tool-step traces.

## 3) Config-Driven Agent Composition (NVIDIA AI-Q style)

### Pattern
- Keep behavior in configuration (YAML/JSON templates) rather than hardcoded branching where possible.
- Swappable model/tool prompts per role.

### Nexus mapping
- Move remaining hardcoded role and tool policy switches toward declarative config maps.
- Extend current shared model map to include role defaults and context budget policies.

## 4) Approval and Risk Tiering (Codex guardrails + Anthropic computer-use safety)

### Pattern
- High-risk actions require explicit approval.
- Tool classes should be risk-tiered and audited.

### Nexus mapping
- Introduce 3 risk tiers for tools:
  - Tier 0: read/search-only
  - Tier 1: local state mutation
  - Tier 2: project write/command execution
- Enforce explicit user approval for Tier 2 in UI and logs.

## 5) Context Discipline and Index Hygiene (Cursor style)

### Pattern
- Performance and quality depend on scoped context.
- Use indexing/rules to avoid token bloat.

### Nexus mapping
- Add context budget guardrails in prompt assembly.
- Prefer scoped retrieval and capped live-context sections when prompt is near budget.

## 6) Built-In Evaluation Harness (NVIDIA benchmark mindset)

### Pattern
- Mature agents ship with eval harnesses, not anecdotal testing.

### Nexus mapping
- Add benchmark task pack:
  - route intent classification accuracy
  - tool selection precision
  - answer grounding quality (live data citation adherence)
  - safe-write policy compliance

---

## Nexus Implementation Blueprint (Phased)

## Phase A — Governance and Safety (1-2 weeks)
- Add tool risk tiers and approval policy in orchestration layer.
- Add run-id, phase timing, and failure cause schema to logs.
- Expand `/api/status` with queue health and policy mode.

## Phase B — Reliability and Verification (2-3 weeks)
- Make verification mandatory on write-capable runs.
- Add standardized validation adapters (type-check, lint, route smoke).
- Add fallback-to-degraded UX badges where verification fails.

## Phase C — Context and Performance (1-2 weeks)
- Add token budget policy and context compaction thresholds.
- Add "context composition report" to debug panel for operator transparency.

## Phase D — Eval and Continuous Improvement (2 weeks)
- Ship a reproducible eval suite and weekly score trend report.
- Gate high-risk merges on minimum eval thresholds.

---

## High-Impact Backlog (No Feature Removal)

1. Tool risk-tier policy engine in `lib/agent.ts`.
2. Required verification adapter registry for write-impact runs.
3. Run diagnostics schema persisted to change log/store.
4. Prompt budget controller in `lib/ai.ts` + `lib/liveContext.ts`.
5. Eval harness scripts with CI summary output.
6. UX "Degraded / Verified" status chips in HQ and Home chat.

---

## Success Metrics

- +25% improvement in successful first-pass runs for multi-step tasks.
- -40% reduction in unsafe or rejected write proposals.
- <1% unclassified agent errors (all failures carry typed reason).
- Stable p95 response latency despite richer orchestration telemetry.
- Weekly eval score trend visible and improving.

---

## Decision Rule

Adopt patterns that improve:
1) reliability,
2) safety,
3) explainability,
4) iteration speed.

Do not adopt patterns that only add complexity without measurable gains.
