# Security Infrastructure Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden Nexus Prime's dependencies, security gates, runtime boundaries, and release infrastructure without widening product scope or publishing sensitive local information.

**Architecture:** Add repo-native audit scripts and validators first, then make small targeted fixes only when a verifier proves the risk. Evidence stays sanitized under `docs/metrics`, project truth stays in `tasks/todo.md` and `docs/SYSTEM_STATE.md`, and `npm run verify` remains the release-quality gate.

**Tech Stack:** Node.js ESM scripts, Next.js App Router, TypeScript, existing security modules under `lib/security`, existing npm verification scripts, Husky pre-push hooks, sanitized JSON artifacts.

---

## Future-Proofing Rules

- Every new hardening idea must become a repeatable check, policy helper, or sanitized metric before it becomes a one-off manual note.
- Do not upgrade packages until the dependency audit classifies blast radius and verifies the change with `npm run verify`.
- Do not read, print, copy, or commit `.env.local` values, auth headers, cookies, tokens, private LAN IPs, local home paths, receipt/payment/account data, or raw asset intake.
- Prefer additive validators over broad refactors. If a high-risk module needs cleanup, add the verifier first, watch it fail, then make the smallest fix.
- Any route/API hardening change must preserve current local-first behavior: protected APIs may return `401 AUTH-PROTECTED` from raw shell and still be healthy.
- Infrastructure evidence must use placeholders and repo-relative paths only.

## File Map

- Modify: `package.json` — add hardening commands after the scripts exist.
- Create: `scripts/infra-hardening-audit.mjs` — orchestrates security, dependency, route, runtime, and release-prereq posture into one sanitized artifact.
- Create: `scripts/dependency-risk-posture.mjs` — summarizes package/lockfile risk without requiring GitHub connectivity.
- Create: `scripts/validate-security-boundaries.mjs` — checks protected routes, route policy files, middleware, no-store helpers, and risky endpoint exposure.
- Create: `scripts/validate-infra-hardening.mjs` — static validator that proves the hardening scripts and docs are wired.
- Modify: `scripts/dependabot-security-audit.mjs` — enrich current metadata starter with local package ownership and upgrade queue fields.
- Modify: `scripts/readiness-rollup.mjs` — include latest infra hardening and dependency posture artifacts.
- Modify: `.husky/pre-push` — add the new hardening validator before slower type/lint gates after it is stable.
- Modify: `tasks/todo.md` — make security/infrastructure hardening the active top task.
- Modify: `docs/SYSTEM_STATE.md` — record current hardening posture and remaining blockers.
- Optional create: `docs/security/dependency-hardening-runbook.md` — operator runbook for future dependency upgrades after classification.

## Task 1: Promote Hardening To The Active Workstream

**Files:**
- Modify: `tasks/todo.md`
- Modify: `docs/SYSTEM_STATE.md`

- [ ] Step 1: Add `SECURITY-INFRASTRUCTURE-HARDENING` as the top active task in `tasks/todo.md`.
- [ ] Step 2: Move phone/PWA acceptance below hardening without marking it complete.
- [ ] Step 3: Add guardrails: no secret printing, no package upgrades during audit, no auth loosening, no public route widening, no RPG/drone scope.
- [ ] Step 4: Update `docs/SYSTEM_STATE.md` so the active priority is project security, vulnerability protection, infrastructure validation, and optimization.
- [ ] Step 5: Run `npm run publication:safety:check`.
- [ ] Step 6: Expected result: publication safety passes before any wider hardening work starts.

## Task 2: Add Local Dependency Risk Posture

**Files:**
- Create: `scripts/dependency-risk-posture.mjs`
- Modify: `package.json`

- [ ] Step 1: Write a failing validator expectation in `scripts/validate-infra-hardening.mjs` for the package script `dependency:risk:posture`.
- [ ] Step 2: Run `node scripts/validate-infra-hardening.mjs`; expected failure: missing script or missing dependency posture file.
- [ ] Step 3: Create `scripts/dependency-risk-posture.mjs` to read `package.json` and `package-lock.json`, count direct/runtime/dev/transitive packages, detect missing lockfile, detect duplicate direct dependency declarations, flag lifecycle scripts in installed package metadata where available, and write `docs/metrics/dependency-risk-posture-*.json`.
- [ ] Step 4: Sanitize all paths to repo-relative paths and avoid printing package manager tokens or env values.
- [ ] Step 5: Add `dependency:risk:posture` to `package.json`.
- [ ] Step 6: Run `npm run dependency:risk:posture`; expected result: a JSON artifact with `riskReady`, `blocked`, `packageGraph`, and `upgradeQueue`.
- [ ] Step 7: Run `node scripts/validate-infra-hardening.mjs`; expected result: the dependency posture script is detected.

## Task 3: Upgrade Dependabot Audit From Starter To Classifier Shell

**Files:**
- Modify: `scripts/dependabot-security-audit.mjs`
- Create: `docs/security/dependency-hardening-runbook.md`

- [ ] Step 1: Add a failing check to `scripts/validate-infra-hardening.mjs` that requires Dependabot artifacts to expose `classification.runtimeCritical`, `classification.devOnly`, `classification.transitive`, `classification.blockedDeferred`, `upgradePolicy`, and `metadataSource`.
- [ ] Step 2: Run `node scripts/validate-infra-hardening.mjs`; expected failure: missing enriched fields in latest audit behavior.
- [ ] Step 3: Extend `scripts/dependabot-security-audit.mjs` to merge the known GitHub warning with local package graph summary from Task 2.
- [ ] Step 4: Add `upgradePolicy` with exact rules: runtime-critical first, one upgrade batch at a time, no major-version sweep without verifier, run `npm run verify` after each batch.
- [ ] Step 5: Add `metadataSource` with `githubReachable`, `localGraphAvailable`, and `manualMetadataRequired`.
- [ ] Step 6: Write `docs/security/dependency-hardening-runbook.md` with the upgrade order and rollback commands using `npm run git:safe -- status --short --branch`.
- [ ] Step 7: Run `npm run dependabot:audit:classify`; expected result: sanitized artifact, no package upgrades.

## Task 4: Add Security Boundary Validator

**Files:**
- Create: `scripts/validate-security-boundaries.mjs`
- Modify: `package.json`

- [ ] Step 1: Add a failing `security:boundaries` script expectation in `scripts/validate-infra-hardening.mjs`.
- [ ] Step 2: Run `node scripts/validate-infra-hardening.mjs`; expected failure: missing `security:boundaries`.
- [ ] Step 3: Create `scripts/validate-security-boundaries.mjs` to verify middleware exists, `lib/security/routePolicy.ts` exists, protected-action helpers exist, rate limit helpers exist, and known sensitive API directories are not added to a public allowlist.
- [ ] Step 4: The validator must treat `401`/`403` protected raw-shell responses as healthy when route policy marks the endpoint protected.
- [ ] Step 5: Add `security:boundaries` to `package.json`.
- [ ] Step 6: Run `npm run security:boundaries`; expected result: prints route/security boundary OK or exact missing file/policy failures.

## Task 5: Add Infrastructure Hardening Audit Rollup

**Files:**
- Create: `scripts/infra-hardening-audit.mjs`
- Modify: `package.json`
- Modify: `scripts/readiness-rollup.mjs`

- [ ] Step 1: Add failing expectations in `scripts/validate-infra-hardening.mjs` for `infra:hardening:audit` and latest `docs/metrics/infra-hardening-*.json`.
- [ ] Step 2: Run `node scripts/validate-infra-hardening.mjs`; expected failure: missing audit script/artifact.
- [ ] Step 3: Create `scripts/infra-hardening-audit.mjs` to run or summarize `publication:safety:check`, `security-scan`, `security:tauri`, `security:boundaries`, `dependency:risk:posture`, `dependabot:audit:classify`, `phone:lan:check`, and release prerequisite status.
- [ ] Step 4: The script must continue after non-critical blocked checks and record `blocked` instead of crashing unless publication safety or security scan fails.
- [ ] Step 5: Write `docs/metrics/infra-hardening-*.json` with `capturedAt`, `checks`, `blocked`, `criticalFailures`, `hardeningReady`, and `nextActions`.
- [ ] Step 6: Add `infra:hardening:audit` to `package.json`.
- [ ] Step 7: Update `scripts/readiness-rollup.mjs` so it links the latest infra hardening artifact.
- [ ] Step 8: Run `npm run infra:hardening:audit`; expected result: sanitized artifact with no token/LAN/home-path leaks.

## Task 6: Wire Hardening Into Verification Safely

**Files:**
- Modify: `package.json`
- Modify: `.husky/pre-push`

- [ ] Step 1: Run `npm run infra:hardening:audit` and `npm run verify` before wiring anything into hooks.
- [ ] Step 2: If both pass, add `npm run security:boundaries` and `npm run dependency:risk:posture` to `npm run verify` near existing security gates.
- [ ] Step 3: Add `npm run infra:hardening:audit` to `.husky/pre-push` only if it is fast and deterministic; otherwise add `npm run validate:infra-hardening` and leave the full audit manual.
- [ ] Step 4: Run `npm run verify`; expected result: full repo verification passes.
- [ ] Step 5: Run `npm run publication:safety:check`; expected result: new artifacts remain publish-safe.

## Task 7: Optimization Pass By Evidence, Not Guesswork

**Files:**
- Create or modify only if a verifier identifies a target.
- Candidate read-only inputs: `docs/metrics/infra-hardening-*.json`, `docs/metrics/dependency-risk-posture-*.json`, `npm run verify` output, `scripts/*validate*.mjs`.

- [ ] Step 1: Use hardening artifacts to identify the top three optimization targets: slow gate, fragile gate, or high-risk unvalidated boundary.
- [ ] Step 2: For each target, add a validator assertion before changing implementation.
- [ ] Step 3: Make the smallest fix that turns the assertion green.
- [ ] Step 4: Do not refactor large runtime files unless the new validator points to a specific risk.
- [ ] Step 5: Run targeted script, then `npm run verify`.

## Task 8: Final Proof, Handoff, Commit, Push Attempt

**Files:**
- Modify: `tasks/todo.md`
- Modify: `docs/SYSTEM_STATE.md`
- Generated: `docs/AGENT_HANDOFF.md`
- Generated: `docs/CODEX_HANDOFF.md`

- [ ] Step 1: Run `npm run publication:safety:check`.
- [ ] Step 2: Run `npm run security-scan`.
- [ ] Step 3: Run `git diff --check`.
- [ ] Step 4: Run `rg -n "^<<<<<<<|^=======|^>>>>>>>" .`; expected result: no matches.
- [ ] Step 5: Run `npm run infra:hardening:audit`.
- [ ] Step 6: Run `npm run verify`.
- [ ] Step 7: Update `tasks/todo.md` and `docs/SYSTEM_STATE.md` with exact artifact filenames and honest blocked states.
- [ ] Step 8: Run `npm run handoff:write`.
- [ ] Step 9: Run `npm run handoff:check`.
- [ ] Step 10: Commit with `npm run git:safe -- commit -m "chore: harden security infrastructure"`.
- [ ] Step 11: Attempt `npm run git:safe -- push`; if GitHub 443 is blocked, leave the branch clean/ahead and document the exact normal PowerShell push command.

## Acceptance Criteria

- `npm run infra:hardening:audit` exists and writes a sanitized artifact.
- `npm run dependency:risk:posture` exists and works without GitHub access.
- `npm run security:boundaries` exists and validates core protected-route/security structure.
- Dependabot audit artifacts have upgrade policy and metadata-source fields.
- `npm run readiness:rollup` links the latest infra hardening artifact.
- `npm run verify` passes after the new gates are wired.
- No committed artifact contains real LAN IPs, token values, cookies, auth headers, home paths, receipt/payment/account metadata, or raw asset intake.
- Dependency upgrades remain separate until classification proves the safest next batch.
