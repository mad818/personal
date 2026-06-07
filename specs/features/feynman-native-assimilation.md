# FEYNMAN-NATIVE-ASSIMILATION

## Objective

Implement the first native Feynman research foundation inside Nexus Prime using the existing agent, tool, scheduler, and VAULT architecture. Full source parity is tracked separately in `docs/ideas/source-parity/feynman.json`.

## Required Workflows

`deepresearch`, `lit-review`, `review`, `audit`, `replicate`, `recipe`, `compare`, `draft`, `autoresearch`, `watch`, and `outputs`.

## Required Runtime Contract

- Four explicit stages: Researcher, Writer, Verifier, Reviewer.
- Direct source URL evidence ledger.
- Claim-level verdicts: supported, partial, conflicting, unsupported, unverifiable.
- Severity-graded review findings.
- Provenance and coverage status.
- Approval gate for replication, autoresearch, package installation, execution, training, paid compute, and external writes.
- Durable VAULT compiled pages for research outputs.
- Real VAULT-backed `/outputs` index.

## Guardrails

- No direct provider calls.
- No paid dependency or required cloud service.
- No upstream runtime, prompt-pack, auth-store, or CLI vendoring.
- No silent execution, package installation, training, or paid compute.
- No public route, auth bypass, security-policy bypass, visual redesign, or ARPG work.
- Do not mark Feynman complete while useful capabilities remain pending in the source-parity matrix.

## Verification

- `npm run feynman:check`
- `npm run source:parity:check`
- `npm run feynman:smoke`
- `npm run type-check`
- `npm run verify`
- `npm run build`
