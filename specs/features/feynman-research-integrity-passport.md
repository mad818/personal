# Feynman Research Integrity Passport

## What it does

Adds one deterministic integrity passport to every live Feynman research result so evidence access, claim support, experiment provenance, reproducibility limits, cross-model posture, and blocking issues remain visible even when model stages degrade.

## Surface

- Existing protected `feynman_research` tool and its Researcher → Writer → Verifier → Reviewer pipeline.
- Existing Markdown report plus the local Feynman continuity `provenance.json` artifact.
- No new route, tab, panel, provider, scheduler, or execution surface.

## Data

- Existing bounded public-source ledger and progressive coverage receipt.
- Existing claim-audit verdicts and reviewer findings.
- Optional operator-supplied `experiment_intake_declaration`.
- Optional bounded `experiment_provenance_json`; it records evidence supplied by the operator and never runs or validates an experiment.

## Contract

The passport must record:

1. Workflow and task type.
2. Raw data-access posture plus a deterministic policy that only directly read source IDs may support claims.
3. Claim-verdict counts.
4. Explicit experiment intake as `undeclared`, `no_experiments_declared`, or `experiments_declared`.
5. Registered experiment IDs, evidence references, planned-versus-executed deviations, negative results, and limitations.
6. Reproducibility posture that distinguishes recorded configuration from replay proof.
7. Cross-model posture without implying an independent model was used.
8. Blocking issues and a final `pass`, `needs_review`, or `blocked` state.

Experiment-backed claims may carry `experimentIds`. The gate is fail-closed: those claims become `unverifiable` when the declaration is absent, says no experiments were declared, references an unknown experiment ID, or supplies an invalid provenance record. A missing declaration does not suppress a read-only report, but it blocks experiment-backed conclusions and every execution-capable follow-through remains operator-gated.

## Empty and degraded states

- No direct sources: retain a passport with zero read evidence and a blocking coverage issue.
- Writer/verifier/reviewer failure: build the passport from deterministic fallbacks.
- Invalid provenance JSON: reject it at the protected tool boundary with a safe fixed message.
- Declared experiments without records: keep the report available but mark the passport blocked.
- No cross-model request: record `not_requested`; never infer independence from multiple stages.

## Upstream boundary

Primary pattern source: `Imbad0202/academic-research-skills` README v3.19.0 and current main commit `1faf13affb74fb9b1c8598b0ad0cf3a2d7fc4279`.

The upstream repository is CC BY-NC 4.0. Nexus does not copy its prompts, templates, agent files, schemas, or Claude-specific hooks. This feature independently implements the useful evidence-accounting pattern through existing Nexus types and runtime behavior.

## Acceptance

- Every Feynman result includes a typed passport and visible `## Research Integrity Passport` report section.
- The continuity provenance artifact includes the same passport.
- Runtime fixtures prove complete, undeclared, declared-without-records, unknown-ID, no-experiments mismatch, invalid-input, and degraded-source behavior.
- Existing Feynman workflows and approval boundaries remain compatible.
- `npm run feynman:integrity:check`, `npm run feynman:check`, `npm run source:parity:check`, `npm run type-check`, `npm run lint`, and `npm run verify` pass.
- The exact changed-path audit contains no phone/PWA or private RPG implementation path and excludes the pre-existing design-shell worktree changes.
