# Audit Priority Batch 15 — VAULT graph utils + controls extraction

Date: 2026-04-08
Owner: Codex

## Why this batch

After the recent HQ and scheduler decompositions, `app/vault/page.tsx` is the next concentrated UI/orchestration hotspot.

Two clear issues are sitting in the same file:

- the compiled-memory graph summary contract is duplicated locally and again in `VaultGraphFocusPanel.tsx`
- the graph controls/legend/export toolbar is still a long inline render block inside the route component

Both are safe seams because they are local-only, client-side, and do not require changing the graph-building or protected-route contracts.

## Goals

1. Move the VAULT graph page’s shared types/constants/helpers into a dedicated module.
2. Eliminate the duplicated compiled-memory summary interface between the page and the graph focus panel.
3. Move the graph controls, presets, filters, export actions, and legend UI into a dedicated component.
4. Re-verify code gates and live browser reachability on `127.0.0.1:3000`.

## Constraints

- No graph algorithm changes.
- No backend/API changes.
- Keep free-first/local-first defaults unchanged.
- Keep the live site running while verifying.

## Expected outcome

- Smaller `app/vault/page.tsx` with clearer route-level orchestration.
- Shared VAULT graph page contract used by both the page and graph focus panel.
- Easier follow-up split for the remaining graph data/fetch orchestration.
