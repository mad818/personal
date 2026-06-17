# FEYNMAN-WORKFLOW-OUTPUT-CONTRACTS

## Goal

Close the safe Feynman parity gap for workflow-specific output behavior by giving each Nexus-native Feynman workflow a concrete artifact contract instead of relying only on shared purpose text.

## Scope

- Add a typed workflow contract registry for `deepresearch`, `lit-review`, `review`, `audit`, `replicate`, `recipe`, `compare`, `draft`, `autoresearch`, and `watch`.
- Each contract defines required report sections, Writer instructions, Verifier checks, Reviewer checks, acceptance checks, and an approval boundary.
- Inject the contract into the Writer, Verifier, and Reviewer prompts.
- Add a `## Workflow Contract` section to every Feynman report so the expected artifact shape is visible to the operator.
- Mark `workflow-specific-output-contracts` as adapted in the Feynman source-parity matrix while leaving execution-heavy rows pending.

## Guardrails

- No execution, package installation, training, Docker runs, paid compute, provider changes, public routes, scheduler enablement, external writes, telemetry, copied upstream prompt bodies, or raw upstream code vendoring.
- Replication, autoresearch, and watch contracts remain plan/review-gated only.
- Contracts must improve output shape without claiming paper-code audit, local execution, Docker isolation, measured autoresearch, or recurring watches are complete.

## Acceptance

- `node scripts/validate-feynman-workflow-contracts.mjs` fails before implementation, then passes.
- `npm run feynman:workflow-contracts:check` passes.
- `npm run feynman:check`, `npm run source:parity:check`, `npm run type-check`, `npm run lint`, and `npm run verify` pass.
