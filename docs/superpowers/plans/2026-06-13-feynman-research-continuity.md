# Feynman Research Continuity Implementation Plan

**Goal:** Complete the search/resume, lab notebook, intermediate artifact, provenance sidecar, and local preview/PDF tranche of Feynman source parity.

**Architecture:** Extend the existing Feynman tools path with one bounded local continuity store. Preserve VAULT compiled pages as final outputs and expose continuity through `feynman_outputs` plus one protected local-only artifact route.

---

### Task 1: Lock the continuity contract

**Files:**
- Create: `specs/features/feynman-research-continuity.md`
- Create: `scripts/check-feynman-continuity-runtime.mjs`
- Create: `scripts/validate-feynman-research-continuity.mjs`
- Modify: `package.json`
- Modify: `tasks/todo.md`

- [ ] Add failing runtime and structural gates for collision-safe IDs, search/resume, artifacts, PDF output, protected route policy, and tool wiring.
- [ ] Confirm the focused gate fails before implementation.

### Task 2: Implement local continuity

**Files:**
- Create: `lib/feynmanContinuity.ts`
- Create: `lib/feynmanContinuityStore.ts`
- Modify: `lib/feynmanResearch.ts`

- [ ] Add pure search, resume, preview, and PDF helpers.
- [ ] Add bounded local session persistence and fixed artifact reads.
- [ ] Emit best-effort chronological progress events from the existing research engine.

### Task 3: Wire tools and protected export

**Files:**
- Modify: `app/api/tools/route.ts`
- Modify: `lib/agent.ts`
- Create: `app/api/feynman/artifacts/route.ts`
- Modify: `lib/security/routePolicy.ts`

- [ ] Start and complete continuity sessions around existing Feynman runs.
- [ ] Extend `feynman_outputs` with list, search, resume, and export actions.
- [ ] Serve fixed preview/export artifacts through the protected local-only route.

### Task 4: Close tranche parity and verify

**Files:**
- Modify: `docs/ideas/source-parity/feynman.json`
- Modify: `scripts/validate-feynman-native-assimilation.mjs`
- Modify: `tasks/todo.md`

- [ ] Mark only the five completed continuity/export capabilities implemented or adapted with proof.
- [ ] Keep Feynman source parity `in_progress` while other useful capabilities remain pending.
- [ ] Run focused checks, type-check, full verify, handoff checks, and diff checks.
- [ ] Commit intended files and attempt push.
