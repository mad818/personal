# Feynman Progressive Research Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bounded parallel wide-to-narrow source collector with explicit evidence-quality coverage to every Feynman workflow.

**Architecture:** Create one focused progressive-research module that builds structured query waves, runs settled parallel searches and reads, assesses coverage, and performs at most one refinement wave. Integrate its receipt into the existing Feynman report, continuity notebook, validators, and source-parity matrix.

**Tech Stack:** TypeScript, existing Feynman engine, injected guarded search/fetch dependencies, Node runtime checks.

---

### Task 1: Lock the progressive-research contract

**Files:**
- Create: `scripts/check-feynman-progressive-research-runtime.mjs`
- Create: `scripts/validate-feynman-progressive-research.mjs`
- Modify: `package.json`

- [ ] Write runtime assertions for 2–4 initial lanes, parallel settlement, distinct refinement, recency/domain qualifiers, hard caps, and honest coverage degradation.
- [ ] Write structural assertions for module, engine integration, report receipt, parity proof, and package wiring.
- [ ] Run `npm run feynman:progressive:check` and confirm it fails because the module is missing.

### Task 2: Build the bounded collector

**Files:**
- Create: `lib/feynmanProgressiveResearch.ts`

- [ ] Define query, policy, coverage, collection result, dependency, and progress contracts.
- [ ] Build varied initial query plans with structured recency/domain metadata.
- [ ] Assess discovered, direct-read, and high-confidence coverage.
- [ ] Build distinct refinement queries from gaps and discovered terminology.
- [ ] Run settled parallel paper/search/read passes with hard limits and one refinement wave.
- [ ] Run the focused runtime check until it passes.

### Task 3: Integrate collection and receipts

**Files:**
- Modify: `lib/feynmanResearch.ts`
- Modify: `scripts/check-feynman-runtime.mjs`

- [ ] Replace sequential collection with the progressive collector.
- [ ] Preserve existing research input and downstream Writer/Verifier/Reviewer contracts.
- [ ] Add coverage receipt fields to the final report and continuity progress.
- [ ] Degrade the Researcher stage when final coverage remains insufficient.
- [ ] Run Feynman focused checks and type-check.

### Task 4: Close parity and project state

**Files:**
- Modify: `docs/ideas/source-parity/feynman.json`
- Modify: `scripts/validate-feynman-native-assimilation.mjs`
- Modify: `tasks/todo.md`
- Modify: `docs/SYSTEM_STATE.md`

- [ ] Mark only `parallel-progressive-research` adapted with proof.
- [ ] Keep Feynman source parity `in_progress` with the remaining useful capabilities.
- [ ] Record focused and full verification truth.
- [ ] Regenerate and check handoff files.
- [ ] Commit intended files and attempt push.
