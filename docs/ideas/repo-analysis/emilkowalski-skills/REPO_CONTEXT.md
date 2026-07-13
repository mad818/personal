# REPO_CONTEXT.md

## What this is

`emilkowalski/skills` is a small MIT collection of Markdown agent skills for design engineers. It focuses on animation judgment, strict review, codebase-wide motion audits, precise animation vocabulary, and Apple-inspired interaction principles translated to the web. It is design guidance, not an application runtime or a replacement for Nexus's taste contract.

## Stack

- Markdown `SKILL.md` packages under `skills/`.
- No application source tree, package manifest, server, provider runtime, or build dependency.
- Distributed through the cross-host `skills` CLI.

## Skill map

- `skills/emil-design-eng/SKILL.md` — primary UI and animation decision guidance.
- `skills/review-animations/SKILL.md` — strict review of an implementation or diff.
- `skills/improve-animations/SKILL.md` — codebase-wide, evidence-led audit that can write selected implementation plans without changing source code.
- `skills/animation-vocabulary/SKILL.md` — maps vague motion descriptions to precise terms.
- `skills/apple-design/SKILL.md` — fluid, physical, interruptible, accessible web interaction guidance.
- `README.md` — install command and collection overview.
- `LICENSE` — MIT terms.

## Entry point

- Cross-host install: `npx skills@latest add emilkowalski/skills`.

## Nexus fit

- Primary department: Design, owned by EL with NOVA/MAX support.
- Useful patterns: frequency-aware animation decisions, deliberate easing/duration, origin-aware transforms, interruptibility, performance, reduced motion, evidence-led review, and plan-only handoff.
- Existing Nexus authority: `docs/NEXUS_TASTE_CONTRACT.md`, `lib/nexusTasteContract.ts`, current Tailwind/motion conventions, and route-specific visual language.

## Plan

### To use / integrate

1. Keep the collection review-first and optional; do not bulk-install it into Nexus.
2. Use selected skills for bounded Codex design reviews when they do not conflict with the Nexus taste contract.
3. Treat audit findings as proposals that require confirmation against actual file lines and current interaction frequency.
4. Preserve reduced-motion support and existing project tokens.

### To extend / adapt

1. Translate only accepted animation rules into the existing taste contract and validators.
2. Keep codebase-wide audits read-only until Mario selects findings for implementation.
3. Avoid hard-coding an external aesthetic or importing examples wholesale.
4. Verify every accepted change visually and with the normal Nexus type/lint gates.

## Open questions

- Whether Mario wants the collection installed as a Codex skill or used only as a linked review reference.
- Which motion rules should eventually become Nexus-owned automated checks after real UI review.
