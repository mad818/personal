# Active Dependency Security Patches Implementation Plan

> **For agentic workers:** Apply each dependency batch narrowly and verify the
> lockfile after every batch.

**Goal:** Patch the actionable active npm and Tauri dependency advisories while
preserving current application behavior and documenting the incompatible glib
finding honestly.

**Architecture:** Add a lockfile-level security floor gate, use npm overrides
for vulnerable transitive copies, and consume the verified Dependabot Tauri
lockfile update.

**Tech Stack:** Node.js validation scripts, npm package-lock v3, Cargo.lock,
existing Dependabot classification tooling.

---

### Task 1: Lock The Security Contract

- [x] Add the active dependency security feature spec.
- [x] Add a lockfile-level validator and package script.
- [x] Run the validator and confirm it fails on remaining vulnerable transitive
      copies.

### Task 2: Patch The npm Dependency Graph

- [x] Keep root `postcss` at `8.5.10`.
- [x] Force nested `postcss` and `prismjs` copies to their patched floors.
- [x] Keep `brace-expansion` `5.x` at `5.0.6` without forcing incompatible old
      major consumers to version 5.
- [x] Re-run the focused security gate and npm dependency tree checks.

### Task 3: Patch The Desktop Dependency Graph

- [x] Merge verified Dependabot PR 53 for `tauri 2.11.2`.
- [x] Confirm vulnerable `rand 0.7.3` and `rand 0.8.5` copies are removed.
- [x] Record the incompatible GTK3/glib migration finding without falsifying
      the lockfile.

### Task 4: Verify And Publish

- [x] Run focused dependency, Tauri, and infrastructure security gates.
- [x] Run full project verification.
- [x] Prepare task and handoff state for publication.
