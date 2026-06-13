# Vault and Command Bundle Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Defer Vault's hidden Relations and Publish chambers while preserving behavior and lock Vault and Command route bundle budgets.

**Architecture:** Keep all Vault state, graph derivation, URL synchronization, and callbacks in `app/vault/page.tsx`. Move only the hidden chamber render trees into focused components, load those components through `next/dynamic`, and extend the existing shell performance validator and browser acceptance suite.

**Tech Stack:** Next.js 14/15 app router, React, TypeScript, Playwright, existing Node performance validator.

---

### Task 1: Add the failing performance contract

**Files:**
- Modify: `scripts/validate-shell-performance.mjs`
- Modify: `tests/e2e/shell-performance.spec.ts`

- [x] Add Vault dynamic-boundary requirements for `VaultRelationsChamber` and `VaultPublishChamber`.
- [x] Add Command regression requirements for its existing deferred route modules.
- [x] Add focused browser assertions for Vault Relations, Vault Publish, and Command collapsed diagnostics.
- [x] Run `npm run performance:check` and confirm it fails because the Vault chamber boundaries do not exist.

### Task 2: Extract the hidden Vault chambers

**Files:**
- Create: `components/vault/VaultRelationsChamber.tsx`
- Create: `components/vault/VaultPublishChamber.tsx`
- Modify: `app/vault/page.tsx`

- [x] Move the Relations render tree into `VaultRelationsChamber` with explicit data and callback props.
- [x] Move the Publish render tree into `VaultPublishChamber` with explicit data and callback props.
- [x] Dynamically import both chambers from `app/vault/page.tsx` with `ssr: false`.
- [x] Keep Archive immediate and keep all route state and effects unchanged.
- [x] Run `npm run performance:check`, `npm run type-check`, and `git diff --check`.

### Task 3: Measure and lock the result

**Files:**
- Modify: `scripts/validate-shell-performance.mjs`
- Modify: `specs/features/vault-command-bundle-isolation.md`
- Modify: `tasks/todo.md`

- [x] Run a fresh production build.
- [x] Measure Vault and Command route-owned app chunks.
- [x] Add conservative production budgets above achieved sizes.
- [x] Attempt focused browser acceptance for the deferred surfaces; record the in-app browser policy block and use production artifact proof without an alternate browser workaround.
- [x] Record exact results and proof.

### Task 4: Close verification

**Files:**
- Modify: `docs/AGENT_HANDOFF.md` through the handoff generator when task state changes.

- [x] Run `npm run build:verified`.
- [x] Run `npm run handoff:write`, `npm run handoff:check`, and `git diff --check`.
- [x] Attempt narrow git staging without including raw Dependabot exports or unrelated local work; record the Windows `.git/index.lock` permission denial without staging anything.
