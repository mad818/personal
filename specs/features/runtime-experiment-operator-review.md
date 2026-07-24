# Runtime Experiment Operator Review

## Outcome

Complete the useful OpenEvolve-inspired review capability by adding an explicit human keep/reject/defer gate to Nexus's existing runtime experiment ledger.

## Existing Nexus seam

- `components/skills/BlacksiteLab.tsx` is the reachable SKILLS workbench for defining and comparing runtime variants.
- `lib/runtimeExperimentContracts.ts` validates experiment definitions, benchmark snapshots, and comparison recommendations.
- `lib/runtimeExperimentLedger.ts` persists local experiment evidence under `docs/metrics/`.
- `/api/metrics/runtime-experiments` is already protected as a local-only route.

## Contract

1. Record keep, reject, and defer decisions as separate append-only local audit evidence tied to a real experiment run.
2. Require a concise operator rationale for every decision.
3. Permit keep only when the benchmark result is an improved `candidate_win` with a positive score delta and no new, check, or category failures.
4. Permit reject or defer after any valid experiment result.
5. Treat keep as approval to preserve a candidate for manual follow-up only; never mutate prompts, routing, memory policy, tools, source, or the live runtime automatically.
6. Show the latest decision and benchmark-gate reason in the reachable Blacksite ledger.
7. Reject unknown run identifiers and malformed decisions without modifying the ledger.

## Benefits

- Turns existing benchmark evidence into a deliberate operator decision instead of an ambiguous recommendation badge.
- Prevents a regressed or unverified candidate from being marked keep.
- Preserves a local audit trail without granting autonomous mutation or deployment authority.
- Completes the feasible OpenEvolve pattern through an existing Nexus surface rather than restoring detached UI.

## Verification

- Focused runtime gate fixtures for keep, reject, defer, malformed input, and blocked promotion.
- Static route, ledger, UI, source-parity, and canonical-script wiring checks.
- `npm run source:parity:check`.
- `npm run type-check`.
- `npm run lint`.
- `npm run verify`.
- `npm run handoff:write` and `npm run handoff:check`.
- `git diff --check`.
