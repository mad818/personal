# REPO_CONTEXT.md

## What this is

`ayghri/i-have-adhd` is a small MIT response-shaping skill for making agent output easier to start, scan, resume, and finish. It changes presentation—action first, short numbered steps, one concrete next move, visible progress, and matter-of-fact recovery—not the model, provider, task runtime, or medical state.

## Stack

- Markdown skill instructions under `skills/i-have-adhd/`.
- No application server, provider integration, database, or runtime dependency required by Nexus.
- Repository-level README and MIT license.

## Important behavior

- Lead with the requested action or answer.
- Use short numbered sequences and keep lists bounded.
- Suppress non-blocking tangents and end with one concrete next action.
- Restate current state after interruption, make wins visible, and avoid invented estimates.

## Nexus fit

- Primary surface: the existing opt-in HQ Direct persona in `lib/personaEngine.ts`.
- Benefit: lower scan and resumption cost without creating another persona system.
- Boundary: Nexus does not infer a diagnosis, persist a health label, or globally rewrite every answer.

## Plan

1. Adapt the useful output rules into Direct mode.
2. Preserve existing Formal and Deep modes.
3. Keep estimates evidence-based and errors matter-of-fact.
4. Prove the response contract with the focused Nexus validator.

## Exclusions

- No external skill installation or package dependency.
- No diagnosis inference, demographic profiling, or hidden global mode.
- No separate application or provider call.
