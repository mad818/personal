# Cyber and Intel Bundle Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Defer inactive Cyber and Intel render trees while preserving all route behavior and protecting the remaining operational routes with production budgets.

**Architecture:** Keep URL synchronization, store state, data loaders, focus handling, and default surfaces in the page files. Extract only hidden render trees into `CyberDeferredChamber` and `IntelDeferredSegment`, load those boundaries with `next/dynamic`, and use the existing performance validator and E2E suite as the regression contract.

**Tech Stack:** Next.js app router, React, TypeScript, Playwright, existing Node performance validator.

---

### Task 1: Add the failing boundary contract

**Files:**
- Modify: `scripts/validate-shell-performance.mjs`
- Modify: `tests/e2e/shell-performance.spec.ts`

- [x] Require `app/cyber/page.tsx` to dynamically import `CyberDeferredChamber`.
- [x] Require `app/intel/page.tsx` to dynamically import `IntelDeferredSegment`.
- [x] Add focused deep-link assertions for Cyber evidence/review and Intel world/sweeps.
- [x] Run `npm run performance:check` and confirm it fails on the missing boundaries.

### Task 2: Extract Cyber hidden chambers

**Files:**
- Create: `components/cyber/CyberDeferredChamber.tsx`
- Modify: `app/cyber/page.tsx`

- [x] Move Matrix, Review, Evidence, and Drone render trees into `CyberDeferredChamber`.
- [x] Keep child panels dynamically loaded inside the boundary.
- [x] Keep Triage, route state, evidence selection, URL synchronization, loaders, and store reads in the page.
- [x] Run `npm run performance:check`, `npm run type-check`, and `git diff --check`.

### Task 3: Extract Intel hidden segments

**Files:**
- Create: `components/intel/IntelDeferredSegment.tsx`
- Modify: `app/intel/page.tsx`

- [x] Move World, Markets, and Sweeps render trees into `IntelDeferredSegment`.
- [x] Move Alpha Earth into the deferred World segment.
- [x] Keep News, route state, URL synchronization, loader, and store reads in the page.
- [x] Run `npm run performance:check`, `npm run type-check`, and `git diff --check`.

### Task 4: Measure and lock the result

**Files:**
- Modify: `scripts/validate-shell-performance.mjs`
- Modify: `specs/features/cyber-intel-bundle-isolation.md`
- Modify: `tasks/todo.md`

- [x] Run a fresh production build.
- [x] Measure Cyber, Intel, Alpha, and Recon route-owned app chunks.
- [x] Add conservative production budgets above achieved sizes.
- [x] Run or attempt focused browser acceptance without bypassing local browser policy.
- [x] Record exact results and proof.

### Task 5: Close verification

**Files:**
- Modify: generated handoff files through `npm run handoff:write`.

- [x] Run `npm run build:verified`.
- [x] Run `npm run handoff:write`, `npm run handoff:check`, and `git diff --check`.
- [x] Attempt git staging without including raw Dependabot exports. Git could not create `.git/index.lock` because access was denied; the raw exports remain untracked and unstaged.
