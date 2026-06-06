# Local Recovery Bundle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an offline, checksummed backup and guarded restore command for Nexus-owned private local state.

**Architecture:** A dependency-free Node ESM module owns the allowlist, bundle creation, verification, listing, and restore plan/apply behavior. Bundles live under the already-ignored `.nexus/backups/` directory, contain a manifest plus copied files, and never include arbitrary workspace paths. A functional validator uses temporary fixture roots to prove create, list, tamper detection, dry-run, confirmation, conflict, and applied-restore behavior.

**Tech Stack:** Node.js ESM, built-in filesystem APIs, SHA-256, JSON manifests.

---

### Task 1: Contract And Red Functional Validator

**Files:**
- Create: `specs/features/local-recovery-bundle.md`
- Create: `docs/superpowers/plans/2026-06-06-local-recovery-bundle.md`
- Create: `scripts/validate-local-recovery-bundle.mjs`
- Modify: `package.json`
- Modify: `tasks/todo.md`

- [x] **Step 1: Write the feature contract and implementation plan**

Document the explicit local-state allowlist, manifest contract, restore confirmation, overwrite rule, and no-network/no-secret boundaries.

- [x] **Step 2: Write the failing functional validator**

Require the recovery runner, package scripts, verify wiring, and fixture-based create/list/verify/tamper/dry-run/apply behavior.

- [ ] **Step 3: Run the validator red**

Run: `node scripts/validate-local-recovery-bundle.mjs`

Expected: fail because `scripts/local-recovery-bundle.mjs` is missing.

### Task 2: Recovery Bundle Runtime

**Files:**
- Create: `scripts/local-recovery-bundle.mjs`

- [ ] **Step 1: Implement allowlisted snapshot creation**

Discover only the documented Nexus local-state paths, reject symlinks, copy files into a new bundle, hash them, and atomically write `manifest.json`.

- [ ] **Step 2: Implement listing and verification**

Resolve bundle IDs or paths only inside the configured backup root, summarize manifests, and reject malformed, missing, extra, modified, symlinked, or unsafe bundle content.

- [ ] **Step 3: Implement guarded restore**

Verify first, return a no-write dry-run plan by default, require the exact apply confirmation, require `--overwrite` for conflicts, and use temporary sibling files plus rename for writes.

- [ ] **Step 4: Run the functional validator green**

Run: `npm run local:recovery:check`

Expected: pass with create/list/verify/tamper/dry-run/apply coverage.

### Task 3: Operator Proof And Documentation

**Files:**
- Create: `docs/deployment/local-recovery-bundles.md`
- Modify: `docs/SYSTEM_STATE.md`
- Modify: `tasks/todo.md`

- [ ] **Step 1: Exercise the real operator-safe commands**

Run `npm run local:recovery -- list` and confirm it handles an empty backup directory without reading or printing private contents.

- [ ] **Step 2: Run full proof**

Run `npm run publication:safety:check`, `npm run security-scan`, `npm run type-check`, `npm run verify`, `npm run build`, and `git diff --check`.

- [ ] **Step 3: Record shipped state and regenerate handoff**

Mark the task complete, update system state, run `npm run handoff:write`, and run `npm run handoff:check`.

- [ ] **Step 4: Commit and push attempt**

Commit only the scoped feature files and attempt `git push`.
