# Current System State Recency

## Objective

Keep the canonical `docs/SYSTEM_STATE.md` aligned with the newest completed non-RPG tranche recorded at the top of `tasks/todo.md` → `## Next Up`, and make that relationship executable through the existing documentation gate.

## Contract

- `docs/SYSTEM_STATE.md` is part of the current-documentation surface and must follow the same framework-version truth checks as README and architecture documentation.
- The first top-level completed task in `tasks/todo.md` → `## Next Up` is the newest locally shipped tranche.
- The first bullet in `docs/SYSTEM_STATE.md` → `## Latest Shipped` must name that exact task identifier.
- Unchecked tasks and indented subtasks must not become release evidence.
- Missing sections, missing completed work, malformed bullet identifiers, or mismatched identifiers fail `npm run docs:stack:check`.

## Current correction

- Record `FOCUS-MOTION-DIVERGENT-COUNCIL` as shipped with its actual behavior, benefits, proof, and explicit zero-phone/PWA/RPG boundary.
- Record this recency guard itself when the task closes so the first completed task and first shipped entry remain aligned.

## Boundaries

- No route, runtime, provider, dependency, phone/PWA, or RPG change.
- Do not infer completion from plans, nested checkboxes, or prose outside the authoritative sections.
- Do not rewrite historical shipped entries; prepend the missing current facts.

## Acceptance

- Focused fixtures prove unchecked and nested tasks are ignored and a top-level completed identifier is selected.
- Real repository sections resolve to the same identifier.
- `npm run docs:stack:check`, handoff freshness, publication safety, diff checks, and a tracked-plus-untracked zero-phone/PWA/RPG audit pass.
