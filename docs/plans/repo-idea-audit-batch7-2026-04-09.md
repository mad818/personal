# Repo Idea Audit Batch 7 — shared exact-session action clusters

## Why

The repo-idea audit flow is now strong enough that most Resources consoles and VAULT stewardship expose the same shape of follow-on action:

- one compact row of repair buttons
- one detail grid explaining each session
- one clear distinction between `Exact panel` and broader route landings

That pattern was already useful, but it had started to duplicate across multiple consoles.

The remaining gap was maintenance risk:

- Playbooks, System Design, and Surfaces had already moved to a shared action cluster
- `Impact` and VAULT stewardship still hand-rolled the same exact-session UI
- the shared cluster also defaulted to showing raw hrefs, which adds noise to already dense audit surfaces

## Scope

In scope:

- Make the shared `ActionSessionCluster` the quiet default for audit/repair consoles
- Migrate `ProjectImpactConsole` to the shared action-cluster pattern
- Migrate `VaultStewardshipPanel` repair actions to the same shared action-cluster pattern
- Refresh task tracking and handoff

Out of scope:

- Adding new repair destinations or changing the existing focused-session routing model
- Reworking subsection cards that intentionally keep custom per-surface layouts
- Changing the underlying impact or stewardship heuristics

## Implementation plan

1. Make `ActionSessionCluster` default to lower-noise rendering for audit consoles
2. Replace duplicated `Impact` repair action rendering with the shared cluster
3. Replace duplicated VAULT stewardship repair action rendering with the shared cluster
4. Refresh task tracking and handoff docs
5. Re-run verification and live route checks

## Done when

- `Impact`, Playbooks, System Design, Surfaces, and VAULT stewardship all use the same shared exact-session action cluster where appropriate
- Raw href display is opt-in instead of the noisy default
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass
- Live `127.0.0.1:3000` checks succeed on `/resources?view=playbooks`, `/resources?view=system`, `/resources?view=surfaces`, `/resources?view=impact`, and `/vault?focus=vault-stewardship`
