# FEYNMAN-NATIVE-ASSIMILATION

## Objective

Implement the complete useful Feynman research workflow family natively inside Nexus Prime using the existing agent, tool, scheduler, and VAULT architecture.

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

## Verification

- `npm run feynman:check`
- `npm run feynman:smoke`
- `npm run type-check`
- `npm run verify`
- `npm run build`
