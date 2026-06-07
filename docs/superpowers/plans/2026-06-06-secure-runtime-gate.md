# Secure Runtime Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fail-closed, efficient startup command that launches Nexus in a locked-down production profile.

**Architecture:** A dependency-light Node ESM launcher loads the existing local environment, resolves one of two secure profiles, validates token/build posture, runs a bounded safety gate, and delegates only the final foreground runtime process to the existing `start-runtime.mjs`. A separate validator tests policy behavior without launching services and checks package/verify wiring.

**Tech Stack:** Node.js ESM, dotenv, built-in child process and filesystem APIs, existing npm security gates.

---

### Task 1: Contract And Red Validator

**Files:**
- Create: `specs/features/secure-runtime-gate.md`
- Create: `docs/superpowers/specs/2026-06-06-secure-runtime-gate-design.md`
- Create: `docs/superpowers/plans/2026-06-06-secure-runtime-gate.md`
- Create: `scripts/validate-secure-runtime-gate.mjs`
- Modify: `package.json`
- Modify: `tasks/todo.md`

- [x] **Step 1: Write the design, feature contract, and plan**
- [x] **Step 2: Write a functional validator for profiles, token posture, build detection, and wiring**
- [ ] **Step 3: Run the validator red**

Run: `node scripts/validate-secure-runtime-gate.mjs`

Expected: fail because `scripts/secure-runtime-gate.mjs` is missing.

### Task 2: Secure Profile And Launch Runtime

**Files:**
- Create: `scripts/secure-runtime-gate.mjs`

- [ ] **Step 1: Implement profile, token policy, and explicit local token initialization**
- [ ] **Step 2: Implement production-build inspection and fast/full gates**
- [ ] **Step 3: Implement check-only and guarded foreground launch modes**
- [ ] **Step 3a: Forward shutdown signals through the secure and existing runtime launchers**
- [ ] **Step 4: Run `npm run secure:start:check` green**

### Task 3: Operator Documentation And Proof

**Files:**
- Create: `docs/deployment/secure-runtime-gate.md`
- Modify: `docs/SYSTEM_STATE.md`
- Modify: `tasks/todo.md`

- [ ] **Step 1: Document local, tailnet, check-only, full-verify, and recovery flows**
- [ ] **Step 2: Run check-only proof against the current host**
- [ ] **Step 3: Run full verification, production build, and diff checks**
- [ ] **Step 4: Record shipped state and regenerate handoff**
- [ ] **Step 5: Commit and attempt push**
