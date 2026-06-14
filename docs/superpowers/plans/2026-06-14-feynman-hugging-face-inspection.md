# Feynman Hugging Face Inspection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure bounded public Hugging Face model/dataset inspection and use it as direct Feynman evidence when relevant.

**Architecture:** Build one focused server-safe inspection module with injected fetch behavior, expose it through the existing protected networked tool route, and add an optional relevant-reference lane to the existing Feynman progressive collector. Keep all reads unauthenticated, main-revision-only, text-only, and strictly bounded.

**Tech Stack:** TypeScript, Next.js protected tools route, existing Feynman engine, Node runtime validation.

---

### Task 1: Lock The Inspection Contract

**Files:**
- Create: `scripts/check-feynman-hugging-face-runtime.mjs`
- Create: `scripts/validate-feynman-hugging-face-inspection.mjs`
- Modify: `package.json`

- [ ] Write runtime assertions for reference normalization, dataset structure, access posture, bounded files, safe text reads, byte caps, and relevant-only Feynman integration.
- [ ] Write structural assertions for module, route, agent catalog, capability policy, parity proof, and package wiring.
- [ ] Run `npm run feynman:huggingface:check` and confirm it fails because the inspection module is missing.

### Task 2: Build The Bounded Inspector

**Files:**
- Create: `lib/huggingFaceInspection.ts`

- [ ] Define normalized references, inspection results, limits, and injected fetch contracts.
- [ ] Implement public model/dataset metadata, top-level file listing, and dataset split/schema inspection.
- [ ] Implement safe main-revision text paths and a streaming 64 KiB byte limit.
- [ ] Format normalized inspection receipts and preserve partial failures as warnings.
- [ ] Run the focused runtime check until the inspector tests pass.

### Task 3: Expose And Integrate The Capability

**Files:**
- Modify: `app/api/tools/route.ts`
- Modify: `lib/agent.ts`
- Modify: `lib/security/toolCapabilityPolicy.ts`
- Modify: `lib/feynmanProgressiveResearch.ts`
- Modify: `scripts/check-feynman-runtime.mjs`

- [ ] Expose `huggingface_inspect` through the protected connected-network tool boundary.
- [ ] Advertise it only for explicit Hugging Face intent.
- [ ] Run relevant repository inspection concurrently with the first Feynman collection wave.
- [ ] Count the normalized receipt as one directly read source inside the existing hard read budget.
- [ ] Run focused checks and type-check.

### Task 4: Close Parity And Project State

**Files:**
- Modify: `docs/ideas/source-parity/feynman.json`
- Modify: `scripts/validate-feynman-native-assimilation.mjs`
- Modify: `tasks/todo.md`
- Modify: `docs/SYSTEM_STATE.md`

- [ ] Mark only `hugging-face-inspection` adapted with proof.
- [ ] Keep Feynman source parity `in_progress` with remaining useful capabilities.
- [ ] Run source parity, security boundaries, and full verification.
- [ ] Regenerate/check handoff files, commit intended files, and attempt push.
