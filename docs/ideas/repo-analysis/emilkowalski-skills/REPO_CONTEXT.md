# REPO_CONTEXT.md

## What this is

`emilkowalski/skills` is a small MIT collection of Markdown agent skills for design engineers. It focuses on animation judgment, strict review, codebase-wide motion audits, opportunity discovery, precise animation vocabulary, Apple-inspired interaction principles, and UI-library selection. It is design guidance, not an application runtime or a replacement for Nexus's taste contract.

## Stack

- Markdown `SKILL.md` packages under `skills/`.
- No application source tree, package manifest, server, provider runtime, or build dependency.
- Distributed through the cross-host `skills` CLI.

## Skill map

- `skills/emil-design-eng/SKILL.md` — primary UI and animation decision guidance.
- `skills/review-animations/SKILL.md` — strict review of an implementation or diff.
- `skills/improve-animations/SKILL.md` — codebase-wide, evidence-led audit that can write selected implementation plans without changing source code.
- `skills/find-animation-opportunities/SKILL.md` — identifies motion opportunities after reading the real product surface.
- `skills/animation-vocabulary/SKILL.md` — maps vague motion descriptions to precise terms.
- `skills/apple-design/SKILL.md` — fluid, physical, interruptible, accessible web interaction guidance.
- `skills/pick-ui-library/SKILL.md` — recommends a library based on product and interaction needs.
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

1. Keep the collection external; the selected rules are now project-owned, so do not bulk-install it into Nexus.
2. Use `lib/nexusMotionTaste.ts` for the frequency, purpose, input-mode, and duration decision.
3. Use `npm run motion:taste:check` for high-confidence active non-RPG anti-patterns.
4. Preserve reduced-motion support and existing project tokens.

### To extend / adapt

1. Expand the validator only for deterministic, low-false-positive rules.
2. Keep subjective opportunity discovery human-reviewed and task-scoped.
3. Avoid hard-coding an external aesthetic or importing examples wholesale.
4. Verify every accepted change visually and with the normal Nexus type/lint gates.

## Decision

Nexus adapted the bounded, deterministic motion rules into its own contract and validator. The external pack remains a cited reference; full installation, ambient opportunity generation, and UI-library selection are excluded because they duplicate project authority or add unnecessary dependency churn.
