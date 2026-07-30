# System State Latest-Shipped Compaction

## Objective

Make the canonical system-state context useful at runtime by keeping `docs/SYSTEM_STATE.md` → `## Latest Shipped` focused on genuinely recent non-RPG work instead of carrying a 203-entry historical log into every full-state or latest-slice context read.

## Evidence

- Before compaction, `Latest Shipped` contains 203 top-level bullets and 243,475 characters.
- The section consumes 90.9% of the 267,715-character canonical state file.
- `lib/contextSpine.ts` and `/api/project?section=state&slice=latest` return the section directly, so the historical log increases context cost and obscures current operational truth.
- The file's own contract says it is not for long historical batch logs.

## Contract

- Retain no more than 12 top-level `Latest Shipped` entries.
- Keep the section at or below 24,000 characters.
- Preserve newest-first order and exact parity between the first shipped identifier and the first top-level completed `Next Up` identifier.
- Keep current proof, benefits, and boundaries for retained entries.
- Remove older entries from the live canonical file; Git history remains the historical archive.
- Reject a future count or character-budget regression through `npm run docs:stack:check`.

## Boundaries

- No route, API, runtime behavior, provider, dependency, phone/PWA, or RPG implementation change.
- Do not create a second tracked historical log that restores the same context burden.
- Do not delete current blockers, release posture, environment issues, verification checklist, or Next Up sections.

## Acceptance

- The real `Latest Shipped` section has at most 12 top-level entries and at most 24,000 characters.
- The first retained identifier matches the newest completed top-level task.
- Context extraction returns the compact section without losing its heading boundaries.
- Documentation, context, publication, handoff, diff, and tracked-plus-untracked zero-phone/PWA/RPG path checks pass.
