# Desktop SBOM Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create and maintain a deterministic offline CycloneDX SBOM for the Nexus desktop release lane.

**Architecture:** A dependency-free Node script reads the committed npm and Cargo lockfiles, normalizes unique package-version components, and writes one canonical CycloneDX JSON artifact. A separate validator checks structure, safety boundaries, package-script wiring, and byte-for-byte freshness. The existing desktop trust-chain status reads the canonical artifact as SBOM proof.

**Tech Stack:** Node.js ESM scripts, CycloneDX 1.5 JSON, npm `package-lock.json`, Cargo.lock.

---

### Task 1: Contract And Red Validator

**Files:**
- Create: `specs/features/desktop-sbom-generator.md`
- Create: `docs/superpowers/plans/2026-06-06-desktop-sbom-generator.md`
- Create: `scripts/validate-desktop-sbom.mjs`
- Modify: `package.json`
- Modify: `tasks/todo.md`

- [x] **Step 1: Write the feature contract and implementation plan**

Document the deterministic offline SBOM scope and no-network guardrails.

- [x] **Step 2: Write the failing validator**

Require the generator, canonical artifact, package scripts, verify wiring, npm/Cargo ecosystems, and freshness check.

- [ ] **Step 3: Run the validator red**

Run: `node scripts/validate-desktop-sbom.mjs`

Expected: fail on missing `scripts/generate-desktop-sbom.mjs`.

### Task 2: Deterministic CycloneDX Generator

**Files:**
- Create: `scripts/generate-desktop-sbom.mjs`

- [ ] **Step 1: Parse committed lockfiles without network access**

Inventory npm packages from `package-lock.json` and Rust crates from `desktop/src-tauri/Cargo.lock`.

- [ ] **Step 2: Normalize CycloneDX components**

Deduplicate by ecosystem/name/version, preserve available integrity hashes, and add deterministic metadata plus a combined lock digest.

- [ ] **Step 3: Add write and check modes**

`npm run desktop:sbom` writes the canonical artifact. `--check` compares generated output to the committed artifact without writing.

### Task 3: Artifact And Trust Chain

**Files:**
- Create: `docs/metrics/desktop-sbom.cdx.json`
- Modify: `scripts/desktop-trust-chain-status.mjs`
- Modify: `scripts/validate-desktop-trust-chain-status.mjs`

- [ ] **Step 1: Generate the current artifact**

Run: `npm run desktop:sbom`

- [ ] **Step 2: Report canonical SBOM proof**

Expose component counts and lock digest in desktop trust-chain status.

- [ ] **Step 3: Run focused checks**

Run: `npm run desktop:sbom:check` and `npm run desktop:trust-chain:check`.

### Task 4: Verification And Handoff

**Files:**
- Modify: `docs/SYSTEM_STATE.md`
- Modify: `tasks/todo.md`

- [ ] **Step 1: Run full proof**

Run `npm run publication:safety:check`, `npm run security-scan`, `npm run verify`, `npm run build`, and `git diff --check`.

- [ ] **Step 2: Record shipped state and regenerate handoff**

Mark the task complete, update system state, run `npm run handoff:write`, and run `npm run handoff:check`.

- [ ] **Step 3: Commit and push attempt**

Commit the scoped files and attempt `git push`.
