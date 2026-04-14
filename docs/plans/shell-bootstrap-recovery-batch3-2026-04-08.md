# Shell Bootstrap Recovery Batch 3 — pre-hydration self-heal

## Why

The current shell recovery path starts too late. `ShellHealthGuard` only helps after React hydrates, but the reported failure mode is worse: the operator can end up on a half-broken shell where the starfield and raw top rail render while the main React shell never fully mounts.

That means Nexus needs a bootstrap-stage recovery layer, not just a client-side post-hydration guard.

## Goals

1. Add critical-shell fallback styling that keeps the top rail and base shell readable even if the full CSS/runtime path stalls.
2. Add an inline bootstrap guard that detects missing hydration, auto-reloads once, and then exposes an emergency recovery overlay.
3. Add a hydration beacon so the bootstrap guard knows when the real shell took over successfully.
4. Add a browser regression that simulates broken chunk hydration and proves the fallback recovery appears.

## Constraints

- Do not replace the existing `ShellHealthGuard`; this should complement it.
- Keep the fix local-first and free-first.
- Avoid backend changes; this is a bootstrap/runtime UX resilience problem.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run hq:e2e`
- `npm run handoff:write`
- live reachability:
  - `http://127.0.0.1:3000/hq`

## Outcome

- `scripts/stage-runtime-assets.mjs` now stages `.next/static` and `public` into `.next/standalone` during both `build` and `start`, so the standalone runtime no longer serves HTML that points at missing hashed CSS/JS assets.
- `lib/shellBootstrapGuard.ts` now survives emitted inline-script serialization, marks failed shell assets without a regex-literal footgun, and treats a shell that never hydrates as unhealthy even if the critical top rail CSS keeps the page partially readable.
- `tests/e2e/hq-shell.spec.ts` now reproduces shell asset failure in a fresh authenticated browser context, which proves the recovery overlay instead of accidentally reusing warmed asset cache from an already-good page.
