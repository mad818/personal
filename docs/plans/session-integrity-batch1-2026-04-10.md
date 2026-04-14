# Session Integrity Batch 1 — 2026-04-10

## Objective

Strengthen Nexus route continuity by adding one canonical exact-session link contract, quiet route-level self-heal, and normalized launcher behavior so stale links and malformed focus params recover automatically.

## Why this matters

- Audit consoles, playbooks, finder results, and repair views now rely heavily on exact deep links.
- Those links will drift as route names, focus ids, and repair filters evolve unless they share one normalization layer.
- Quiet auto-heal is better UX than expanding the UI with more “open the right place” buttons.

## Planned implementation

1. Centralize path aliases, focus-to-view ownership, and repair-filter associations in `lib/exactSessionLinks.ts`.
2. Add a route-level auto-heal hook that normalizes stale query params on load without operator input.
3. Normalize launcher targets before navigation from shared action clusters and Finder.
4. Expand the behavior-first roadmap with a dedicated BF6 safeguards/self-heal workstream.
5. Record the general rule in `tasks/lessons.md` so future session-link changes stay centralized.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- Live route probes for canonical and stale-link repair cases:
  - `/resources?view=playbook&playbook=safe-refactor`
  - `/resources?view=system&system=vehicle-readiness`
  - `/vault?compiledFilter=route-less`
  - `/recon?focus=recon-binary`
  - `/cyber?focus=cyber-drone`
