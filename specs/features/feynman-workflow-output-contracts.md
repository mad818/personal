# Feynman workflow output contracts

## Goal

Give each of Nexus's ten research workflows a typed, inspectable artifact contract so the Writer, Verifier, Reviewer, and operator agree on required sections, checks, and approval boundaries.

## Surface and data

- Extend the existing Feynman research engine in `lib/feynmanResearch.ts`; add no route, panel, provider, or state slice.
- Define one native contract for `deepresearch`, `lit-review`, `review`, `audit`, `replicate`, `recipe`, `compare`, `draft`, `autoresearch`, and `watch`.
- Each contract owns its output mode, required sections, Writer instructions, Verifier checks, Reviewer checks, acceptance checks, and approval boundary.
- Inject the same rendered contract into the three AI-stage prompts and show a compact `## Workflow Contract` receipt in the final report.

## Benefits

- Makes outputs predictable enough to compare, reopen, and verify across sessions.
- Prevents a generic synthesis from silently omitting workflow-specific evidence or decision sections.
- Gives the verifier and reviewer the same criteria the writer received.
- Keeps execution-capable follow-through visibly operator-gated without another provider call or subsystem.

## Guardrails

- No execution, installation, training, Docker run, paid compute, provider change, scheduler enablement, external write, public route, dependency, telemetry, or copied upstream prompt body.
- Replication, autoresearch, and watch remain plan/proposal-only and require explicit operator approval before execution or enablement.
- An audit contract may require a claim-to-code trace but cannot claim line-by-line paper/code inspection when code was not directly read.
- This tranche does not complete paper retrieval, paper-code audit, replication execution, Docker isolation, measured autoresearch, or recurring watches.

## Acceptance

- The registry is exhaustive at compile time for all ten `FeynmanWorkflowId` values.
- Writer, Verifier, and Reviewer prompts contain the same workflow contract and approval boundary.
- Every final report includes the visible contract receipt and required-section vocabulary.
- Focused runtime/static checks prove all contracts, prompt injection, fallback behavior, and execution boundaries.
- `npm run feynman:check`, source parity, TypeScript, lint, and `npm run verify` pass while the broader Feynman matrix remains `in_progress`.
