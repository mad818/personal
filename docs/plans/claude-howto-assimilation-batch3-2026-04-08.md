# Claude Howto Assimilation Batch 3 — focused route landing for playbooks

## Why

Batch 2 made the playbooks actionable, but some jump-offs still land at the top of a broad route. The next useful step is to make those links land closer to the exact working panel so the workflow feels like a real session handoff.

## Goals

1. Add a small reusable focus strip for route-level working sessions.
2. Add lightweight scroll-to-panel behavior for focused route links.
3. Teach COMMAND, RECON, and VAULT to honor focused query params on arrival.
4. Update the highest-value playbook actions to use focused links where that materially improves execution flow.

## Constraints

- No new backend routes.
- Keep the current IA intact; this is guidance and landing precision, not navigation replacement.
- Stay free-first and local-first.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- live reachability:
  - `http://127.0.0.1:3000/resources`
  - `http://127.0.0.1:3000/command`
  - `http://127.0.0.1:3000/recon`
  - `http://127.0.0.1:3000/vault`
