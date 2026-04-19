# M2 Fresh Mainline Replay Stack

This document supersedes the older `uxs45` replay plan for active mainline migration work.

The preserved branch `codex/preserve-main-2026-04-11` remains the source of truth.

Do not merge the preserved branch directly.

## Goal

Move the accepted UXS6 / UXS7 preserved-branch state onto `main` through a clean 3-slice replay stack:

1. shared shell + taste primitives
2. HQ + route interior completion
3. trust/auth/protected-action substrate

The older `codex/uxs45-slice-a-main-replay` branch and `uxs45` manifests remain historical reference only and must not be extended further.

## Branches

Create fresh `main`-based replay branches for the new stack:

- `codex/m2-shell-taste-replay`
- `codex/m3-hq-route-replay`
- `codex/m4-trust-substrate-replay`

Use a fresh branch from `main` for each slice. Do not branch a later slice from the preserved branch or the old `uxs45` replay branch.

## Slice 1 — Shared Shell + Taste Primitives

Replay only the stable shared visual substrate listed in:

- `docs/plans/m2-shell-taste-replay-paths.txt`

Intent:

- land the Nexus taste contract on `main`
- land the shared shell/workplane/rail/continuity grammar
- land the Satellite Ops route-plate asset set and shared CSS needed for the colder command material language

Rules:

- keep the replay limited to shared shell/page chrome, not HQ-specific composition
- do not replay `components/nav/Nav.tsx` here; the current global toprail is trust-coupled and remains deferred
- treat Slice 1 acceptance as route shell / page header / stage parity, not full toprail parity

## Slice 2 — HQ + Route Interior Completion

Replay the preserved-branch browser-facing surface completion listed in:

- `docs/plans/m3-hq-route-replay-paths.txt`

Intent:

- land the accepted HQ 3D command-table surface
- land COMMAND / SECURITY / SKILLS / VEHICLE / RESOURCES / VAULT first-view interior parity
- carry the last visible copy and chrome cleanup that makes the browser match UXS6 / UXS7

Rules:

- preserve all existing continuity contracts such as routes, workflow IDs, exact-session behavior, and compatibility tokens like `view=doctrine`
- route-level trust rails may land here only as UI/support surfaces; middleware, step-up, and protected-route enforcement stay deferred
- this slice is the manual browser-acceptance gate for replay work; do not start Slice 3 until `/hq?focus=hq-chronicle` and the core route interiors are visually accepted

## Slice 3 — Trust/Auth/Protected-Action Substrate

Replay the backend and shell trust chain listed in:

- `docs/plans/m4-trust-substrate-replay-paths.txt`

Intent:

- land `/api/auth-diagnostics` as the shared visible trust-state source
- land cookie-only auth/session + step-up + protected-action posture alignment
- land the toprail trust strip and the full protected-action substrate for `/api/tools`, `/api/settings`, and `/api/verify`

Rules:

- keep public routes and API paths unchanged
- include the trusted-origin internal fetch chain and the known routes/helpers that already depend on it
- do not widen this slice into staging/deployment proof, FD2 work, or unrelated preserved-branch experiments

## Replay-Time Harmonization Rules

- If a slice exposes a missing dependency that belongs to a later slice, stop and move that file into the later slice instead of widening the current slice ad hoc.
- If a visual surface depends on trust data but can degrade safely without the backend chain, keep the UI-side surface in the earlier slice and defer the backend source to Slice 3.
- Update `docs/SYSTEM_STATE.md` and `tasks/todo.md` on each replay branch only after that slice passes verification.
- Regenerate compatibility handoff mirrors only after slice verification passes.

## Verification

Every slice must run:

- `npm run type-check`
- `npm run auth:e2e`
- `npm run hq:e2e`
- `npm run route:e2e`
- `npm run tabs:e2e`

Additional acceptance:

- Slice 1: shared shell/page chrome reads as Satellite Ops without the trust-strip chain
- Slice 2: manual IAB/browser check confirms HQ and the core route interiors match the accepted preserved-branch surfaces
- Slice 3: trust rails resolve from `/api/auth-diagnostics`, cookie-only auth remains intact, and protected-action posture is aligned across tools/settings/verify
