# REPO_CONTEXT.md

## What this is

`UditAkhourii/adhd` is an MIT TypeScript/Node skill, CLI, and library for divergent ideation: independent agent calls explore different frames, then a critic scores, clusters, and narrows the results. Its README discloses a much larger upstream call pattern—roughly ten agent calls—than Nexus should run by default.

## Stack

- TypeScript/Node library and CLI.
- Agent skill instructions under `skills/adhd/`.
- External multi-call orchestration supplied by the upstream package.

## Important behavior

- Select materially different frames before generating answers.
- Keep each generation isolated so branches do not converge prematurely.
- Use a separate critic to score, cluster duplicates, identify traps, and choose non-obvious options.
- Treat the method as expensive and explicit, not a default response path.

## Nexus fit

- Primary surface: existing opt-in HQ Council mode.
- Adaptation: exactly three existing Council calls under evidence-auditor, inversion, and zero-budget frames.
- Merge: one optional pinned JANSKY critic call, preventing a second Council fan-out.
- Benefit: wider option coverage with a visible and predictable usage ceiling.

## Plan

1. Require Council mode plus an explicit divergence phrase.
2. Reuse the existing three-member parallel dispatch.
3. Preserve each frame on the result card.
4. Pin merge/adopt drafts to JANSKY.

## Exclusions

- No upstream CLI/library dependency or provider runtime.
- No broad automatic trigger, fifteen-frame catalog, or ten-call loop.
- No hidden chain-of-thought capture or unbounded recursive critique.
