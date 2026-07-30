# Agent Instruction Path Truth

## Goal

Make the root project instructions executable and current so future Codex/editor sessions do not follow nonexistent `.Codex` paths, an obsolete framework version, or the retired `/home` route model.

## Scope

- Update `AGENTS.md` to describe the active Next.js 15 / React 19 app without pinning an exact patch release that will quickly drift.
- Align the GA surface map with the canonical release matrix: `/hq`, `/command`, `/intel`, `/alpha`, `/cyber`, `/recon`, `/vault`, and `/resources`.
- Point project skill entries at the tracked `.agents/skills/*/SKILL.md` files that actually exist.
- Remove nonexistent `.Codex/rules/*` auto-load claims and state the real authority chain.
- Keep `.claude/rules/*` explicitly legacy/non-canonical because their React/framework/route guidance is stale.
- Make the generated canonical handoff derive the active Next/React majors from `package.json` and keep the archived HTML boundary current.
- Add `npm run agent:instructions:check` and wire it into canonical verification.

## Guardrails

- No edit to `.agents`, `.codex`, `.claude`, runtime code, UI, APIs, providers, dependencies, state, or RPG files.
- No copying stale Claude rule bodies into current Codex instructions.
- No second instruction hierarchy or generated agent system.
- Root `AGENTS.md`, `SECOND_BRAIN.md`, the canonical handoff, current manifests, release matrix, task queue, and lessons remain the authority chain.

## Acceptance

- The focused validator proves the root and generated-handoff framework lines, archived HTML boundary, canonical GA routes/page files, existing skill entrypoints, absence of `.Codex` references, legacy-rule boundary, package wiring, and canonical verify coverage.
- Every skill path named in the root table exists in the repository.
- `npm run agent:instructions:check`, canonical verification, production build, handoff checks, publication safety, and diff checks pass.
- Zero RPG path is modified.
