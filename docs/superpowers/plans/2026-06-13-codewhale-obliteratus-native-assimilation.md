# CodeWhale + OBLITERATUS Native Assimilation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CodeWhale-aligned runtime authority and continuity to the active Nexus agent path, and add an OBLITERATUS-inspired passive local safety-evaluation contract to Model Lab.

**Architecture:** A focused `lib/runtimeAuthority.ts` module will own authority order, protected invariants, harness posture, lifecycle reconciliation, prompt injection, and completion receipts consumed by `lib/agent.ts`. A focused `lib/modelSafetyEvaluation.ts` module will own passive Model Lab guardrails and derived evaluation manifests consumed by the existing model-lab route and persisted run types. Source parity and focused checks will prove the adaptation and exclusions.

**Tech Stack:** Next.js 15 route handlers, TypeScript, Zustand run artifacts, Zod validation, Node assertion/static validation scripts.

---

### Task 1: Add Failing Assimilation Gates

**Files:**
- Create: `scripts/check-codewhale-obliteratus-runtime.mjs`
- Create: `scripts/validate-codewhale-obliteratus-native-assimilation.mjs`
- Modify: `package.json`

- [x] Create a runtime assertion script that imports `lib/runtimeAuthority.ts` and `lib/modelSafetyEvaluation.ts`, then asserts authority order, stale-run interruption, evidence receipts, passive-only manifests, and prohibited capabilities.
- [x] Create a static validator that requires the spec, helpers, agent integration, model-lab integration, route policy, parity matrices, and package scripts while rejecting unsafe model-mutation or telemetry behavior.
- [x] Add `source:codewhale-obliteratus:runtime:check` and `source:codewhale-obliteratus:check` scripts and wire the combined check into `verify`.
- [x] Run `npm run source:codewhale-obliteratus:check` and confirm it fails because the production helpers do not exist.

### Task 2: Implement Runtime Authority And Continuity

**Files:**
- Create: `lib/runtimeAuthority.ts`
- Modify: `lib/agent.ts`
- Modify: `store/useStore.ts`

- [x] Define the Nexus source-authority order, protected invariants, harness profiles, lifecycle states, stale reconciliation, prompt block, and evidence-first continuity receipt builder.
- [x] Inject the authority prompt block into the active Nexus agent prompt before every runtime dispatch.
- [x] Extend `AgentRunArtifact` with a continuity receipt and construct it from run status, verification, provider, tool traces, risks, and blockers.
- [x] Run the focused runtime check and confirm the runtime-authority assertions pass.

### Task 3: Implement Passive Model Safety Evaluation

**Files:**
- Create: `lib/modelSafetyEvaluation.ts`
- Modify: `lib/assimilation/types.ts`
- Modify: `lib/assimilation/contracts.ts`
- Modify: `lib/assimilation/seeds.ts`
- Modify: `app/api/model-lab/route.ts`

- [x] Define passive safety metrics, immutable prohibited capabilities, manifest construction, and deterministic local scoring.
- [x] Extend model-lab run and variant types with optional backward-compatible passive evaluation evidence.
- [x] Validate Model Lab POST bodies with the existing Zod request schema and create only passive local evaluation runs.
- [x] Mark the seeded Model Lab run with the same passive-only contract.
- [x] Run the focused runtime check and confirm passive-evaluation assertions pass.

### Task 4: Complete Source Parity And Documentation

**Files:**
- Create: `docs/ideas/source-parity/codewhale.json`
- Create: `docs/ideas/source-parity/obliteratus.json`
- Modify: `tasks/todo.md`
- Modify: `docs/SYSTEM_STATE.md`

- [x] Inventory CodeWhale capabilities and mark each as implemented, adapted, or explicitly excluded with proof.
- [x] Inventory OBLITERATUS capabilities and exclude every safeguard-removal or model-mutation capability while proving passive safety-evaluation adaptations.
- [x] Record the completed Nexus-native assimilation in task and system state.
- [x] Run `npm run source:parity:check`.

### Task 5: Verify And Publish

**Files:**
- Modify only files required by verification findings.

- [x] Run `npm run source:codewhale-obliteratus:check`.
- [x] Run `npm run type-check`.
- [x] Run `npm run verify`.
- [x] Run `git diff --check` and inspect the changed sections.
- [ ] Commit and push the completed source assimilation without touching unrelated Dependabot exports.
