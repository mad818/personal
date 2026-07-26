# REPO_CONTEXT.md

## What this is

`Imbad0202/academic-research-skills` is a prompt-driven academic workflow suite covering research, writing, peer review, revision, integrity checking, and publication preparation. Nexus uses it only as a reviewed pattern source and independently adapts compatible evidence contracts into the existing Feynman runtime.

## Stack

- Markdown skill and agent contracts for Claude Code and Claude Science.
- Python validators and optional hooks for deterministic contract enforcement.
- Shell/plugin packaging for Claude-specific installation and dispatch.
- Optional Pandoc and Tectonic document export tooling.

## How it works

The upstream suite separates deep research, academic writing, peer review, and a ten-stage orchestrator. It passes structured artifacts such as evidence records, review reports, integrity checks, and a Material Passport between human-confirmed stages. Current v3.19 documentation also exposes data-access/task annotations, claim-level source checks, reviewer calibration, reproducibility metadata, experiment provenance intake, model tiering, and cross-model handoff receipts.

Nexus does not import the upstream runtime. Existing protected Feynman workflows already provide bounded source collection, Writer/Verifier/Reviewer stages, claim verdicts, review findings, local continuity artifacts, and approval gates. The remaining useful fit is stronger deterministic integrity accounting around those live seams.

## File map

- `README.md` — v3.19.0 feature, mode, licensing, and human-in-the-loop overview.
- `docs/ARCHITECTURE.md` — stage, agent, artifact, data-access, and gate matrix.
- `MODE_REGISTRY.md` — canonical research, writing, and review mode inventory.
- `deep-research/SKILL.md` — eight-mode research workflow.
- `academic-paper/SKILL.md` — eleven-mode writing and revision workflow.
- `academic-paper-reviewer/SKILL.md` — six-mode review and calibration workflow.
- `academic-pipeline/SKILL.md` — human-confirmed pipeline orchestration.
- `shared/handoff_schemas.md` — Material Passport and experiment-provenance contracts.
- `shared/cross_model_verification.md` — optional cross-model handoff envelope.
- `shared/artifact_reproducibility_pattern.md` — reproducibility metadata without false replay guarantees.
- `LICENSE` — Creative Commons Attribution-NonCommercial 4.0.

## Entry points

- Human workflow entry: the four top-level `SKILL.md` files.
- Pipeline entry: `academic-pipeline/SKILL.md`.
- Architecture truth: `README.md`, `docs/ARCHITECTURE.md`, and `MODE_REGISTRY.md`.

## Dependencies

- Claude Code/Claude Science for the upstream prompt runtime.
- Optional Python for validators and write-scope hooks.
- Optional Pandoc/Tectonic for DOCX/PDF export.
- Optional external model routing for cross-model checks.

## Plan

### To use / integrate

1. Keep upstream content external because its CC BY-NC license is incompatible with copying into Nexus MIT source.
2. Translate only general workflow ideas into Nexus-owned contracts.
3. Extend the existing Feynman result with a deterministic research-integrity passport.
4. Reuse existing protected tools, local continuity storage, claim audits, and operator approval gates.
5. Record every upstream capability as adapted, excluded, or pending with reachable proof.

### To extend / modify

1. Add a pure integrity-passport module beside `lib/feynmanResearch.ts`.
2. Pass optional bounded experiment declarations through the existing protected tool.
3. Downgrade unsupported experiment-backed claims before report formatting.
4. Persist the passport in the existing continuity provenance sidecar.
5. Add focused runtime fixtures and wire them into `npm run feynman:check`.

## Open questions

- The repository is active beyond its v3.19.0 release marker; current main includes unreleased reviewer-contract changes. Nexus pins reviewed evidence to commit `1faf13affb74fb9b1c8598b0ad0cf3a2d7fc4279` and must refresh the matrix before claiming later-version parity.
