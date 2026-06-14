# Feynman Native Assimilation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete useful Feynman research-agent workflow family inside Nexus Prime.

**Architecture:** Add one focused typed research engine that gathers existing Nexus sources, runs Writer/Verifier/Reviewer stages through the internal AI boundary, and emits deterministic audited artifacts. Route the complete Feynman command family through one `feynman_research` tool, keep `/deepresearch` compatible, and reuse the existing scheduler and VAULT compiled-page paths.

**Tech Stack:** Next.js, TypeScript, existing `/api/tools`, internal AI route, HQ workflow registry, VAULT memory pages, Node structural validator.

---

### Task 1: Lock the full contract

**Files:**
- Create: `specs/features/feynman-native-assimilation.md`
- Create: `scripts/validate-feynman-native-assimilation.mjs`
- Modify: `package.json`
- Modify: `tasks/todo.md`

- [ ] Write the structural validator for required engine types, workflows, tool wiring, safety language, and verify wiring.
- [ ] Run `npm run feynman:check` and confirm it fails because the engine is missing.

### Task 2: Build the typed Feynman engine

**Files:**
- Create: `lib/feynmanResearch.ts`

- [ ] Define workflow, stage, evidence, claim-verdict, review-severity, and run-result contracts.
- [ ] Add workflow-specific research queries, synthesis prompts, verification prompts, review prompts, deterministic fallbacks, and final markdown formatting.
- [ ] Keep execution-heavy modes approval-gated in all output paths.
- [ ] Run `npm run feynman:check` and confirm the engine portion passes.

### Task 3: Wire server tools and real outputs

**Files:**
- Modify: `app/api/tools/route.ts`
- Modify: `lib/agent.ts`

- [ ] Add `feynman_research` and `feynman_outputs` tier-zero tools.
- [ ] Delegate source gathering and Writer/Verifier/Reviewer stages through existing guarded helpers and `callInternalAi`.
- [ ] Make `deep_research` delegate to the shared Feynman engine.
- [ ] Make `/outputs` read real research compiled pages from VAULT.

### Task 4: Complete HQ workflow commands and durable artifacts

**Files:**
- Modify: `components/home/office/workflowCommands.ts`
- Modify: `components/home/office/prompts.ts`
- Modify: `components/home/office/officeCommandCenterPostRun.ts`
- Modify: `lib/memoryPagesStore.ts`

- [ ] Add every missing Feynman command, aliases, directives, routes, output posture, and scheduler defaults.
- [ ] Route explicit commands to the shared Feynman tool.
- [ ] Preserve source refs, Feynman tags, claim-audit tags, and research-workflow continuity in VAULT.
- [ ] Keep replication/autoresearch/watch human-gated.

### Task 5: Verify and publish state

**Files:**
- Modify: `docs/SYSTEM_STATE.md`
- Modify: `tasks/todo.md`

- [ ] Run `npm run feynman:check`.
- [ ] Run `npm run type-check`.
- [ ] Run `npm run verify`.
- [ ] Run `npm run build`.
- [ ] Update task and system state with honest proof.
- [ ] Run `npm run handoff:write` and `npm run handoff:check`.
- [ ] Commit intended files and attempt push.
