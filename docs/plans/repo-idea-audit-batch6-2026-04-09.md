# Repo Idea Audit Batch 6 — Impact-to-repair continuity

## Why

Resources had become strong at explaining what to change and where to start, but `Impact` still stopped short of the last useful step.

The remaining gap was practical:

- `Impact` could show likely touched files without pointing at the best in-app repair session
- the archive’s own stewardship repair actions were already exact sessions, but they did not visibly use the same language as the newer audit consoles
- that meant the diagnose-to-fix pattern was close, but not fully consistent

## Scope

In scope:

- Add a lightweight file-to-repair-session map for the highest-value Nexus surfaces
- Surface those repair-session jump-offs inside `ProjectImpactConsole`
- Make VAULT stewardship repair actions visibly follow the same `Exact panel` language as the Resources consoles
- Refresh task tracking and handoff

Out of scope:

- Building a full static architecture index for every file in the repo
- Replacing the existing local import-based blast-radius heuristic
- Adding new focused-session destinations where none currently exist

## Implementation plan

1. Add a shared file-to-repair-session helper for the highest-value files and subsystems
2. Teach `Impact` to expose those repair sessions when the target or review-pack files match
3. Align VAULT stewardship repair action language with the same exact-session cues
4. Refresh task tracking and handoff docs
5. Re-run verification and live route checks

## Done when

- `Impact` can open the most relevant existing repair session for known high-value files
- VAULT stewardship clearly marks its repair links as exact-panel sessions
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass
- Live `127.0.0.1:3000` checks succeed on `/resources?view=impact`, the representative `Impact` file routes, and `/vault?focus=vault-stewardship`
