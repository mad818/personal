# Nexus Prime Regression Memory Checklist

Use this checklist whenever a major auth, shell, routing, or release update lands. These items exist because they already failed in real use and must not quietly return.

## Auth and session

- [ ] `Connect` button triggers the real auth path with mouse and Enter.
- [ ] Valid token unlocks the app.
- [ ] Invalid token produces a visible failure state.
- [ ] Auth does not sit forever in `Checking token...`.
- [ ] Protected APIs accept the same auth state that unlocked the app.
- [ ] Logout/reset clears both local and cookie-backed auth state.
- [ ] Hard refresh after login preserves the expected session state.

## Runtime freshness

- [ ] Only one intended local runtime is serving the app.
- [ ] The app on the active port matches the current code, not a stale bundle.
- [ ] Startup probes and warm-up paths do not block the real auth path.
- [ ] Release testing was run on a fresh runtime, not only a hot dev session.
- [ ] Clean build / standalone proof lanes are not run in parallel against the same `.next` directory.
- [ ] `npm run runtime:consistency` is green on the active runtime.
- [ ] `npm run runtime:fresh-proof` is green on an isolated clean runtime.

## Hydration and rendering

- [ ] HQ loads without hydration mismatch warnings.
- [ ] Always-mounted UI surfaces do not inject mismatched server/client text.
- [ ] Inline style or animation blocks render deterministically.
- [ ] Fresh page load and hard refresh behave the same way.

## Pointer, overlay, and interaction safety

- [ ] Decorative layers are click-through when non-interactive.
- [ ] Hidden overlays and drawers are inert when closed.
- [ ] Open overlays own z-index intentionally and return focus when closed.
- [ ] No floating panel or command surface blocks access to underlying controls.
- [ ] Shared controls expose distinct hover, focus, disabled, active, and loading states.

## Route and support contract

- [ ] `/` resolves to `/hq`.
- [ ] `/home` resolves to `/hq`.
- [ ] Legacy beta/internal aliases resolve correctly.
- [ ] Main nav shows only current GA surfaces.
- [ ] No GA affordance links directly to deprecated paths.

## Whole-app visual integrity

- [ ] Login, HQ, and GA tabs feel like one cinematic shell system.
- [ ] Backgrounds, spacing, panel hierarchy, and motion are consistent across GA surfaces.
- [ ] No visible clipping, overlap, or rail instability at supported widths.
- [ ] Empty, loading, and degraded states use the same visual grammar.

## Free-first product contract

- [ ] Supported GA tabs remain useful without paid providers.
- [ ] Optional BYOK providers degrade gracefully when missing.
- [ ] Paid APIs remain opt-in only.

## Release sign-off

- [ ] `npm run type-check`
- [ ] `npm run lint`
- [ ] `npm run verify`
- [ ] `npm run route:integrity`
- [ ] `npm run eval:agent-runtime:ci`
- [ ] `npm run release:smoke`
- [ ] `npm run auth:e2e`
- [ ] `npm run hq:e2e`
- [ ] `npm run route:e2e`
- [ ] `npm run runtime:consistency`
- [ ] `npm run runtime:fresh-proof`
