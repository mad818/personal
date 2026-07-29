# AURORA-WHOLE-PRODUCT-VISUAL-AND-FETCH-RELIABILITY

## Outcome

Nexus Prime presents one sharper Homefront Aurora operating system across every
GA route and tells the truth about live data. A feed outage can never masquerade
as a verified empty result, cannot erase previously verified data, and remains
visible through one restrained global signal horizon.

## Visual thesis

A liquid-glass data plane floats above a near-black command surface. Editorial
route type establishes the active mission, while live state reads like
calibrated instrumentation rather than a mosaic of equal-weight dashboard
cards.

## Reference adaptation

Mario's supplied full-viewport portfolio brief contributes the near-black
canvas, oversized but calm heading scale, asymmetric three-column rhythm,
rounded liquid-glass material, fine noise, media-led depth, and small sparkle
cues. Nexus adapts those ideas through the existing route plate, workplane,
support rail, continuity strip, shared buttons, and signal horizon.

The portfolio identity, biography, client quote, fundraising claim, contact
details, third-party videos, decorative software-icon marquees, and perpetual
auto-scrolling motion are not product content and are not copied. Existing
local route art supplies the visual anchor, and feed state supplies the proof.

## Operator benefit

- Every route inherits the same high-contrast workplane hierarchy, quieter
  support rails, deliberate typography, and surface-aware light treatment.
- The global shell communicates whether evaluated feeds are live, retained,
  unavailable, or still awaiting their first sweep without taking over the
  primary task.
- Previously verified data stays useful through temporary upstream failure.
- Verified-empty results remain distinguishable from provider or network
  failure.
- Optional provider keys stay server-side; no browser request exposes a BYOK
  credential.

## Content and interaction plan

1. Keep the slim global navigation rail as the route/orientation layer.
2. Add one compact signal horizon below it for evaluated feed posture and
   freshness.
3. Let the route header establish the active question and route identity.
4. Make the first workplane visually dominant; rails and continuity strips stay
   quieter and subordinate.
5. Morph loading, verified, retained, unavailable, and verified-empty states
   without replacing the entire layout or causing large jumps.
6. Keep common hover, focus, and state changes at or below 180ms and ambient
   motion at or below the existing 300ms interaction ceiling.

## Interaction thesis

- The existing route-plate sweep supplies the media-led atmospheric motion.
- Workplane then support-rail entrance order communicates hierarchy once per
  route transition.
- Liquid controls and fields lift by one pixel on hover or focus, while feed
  posture changes color without auto-scrolling or rearranging the page.

## Functional contracts

1. `/api/news`, `/api/cves`, `/api/conflict`, `/api/earthquakes`,
   `/api/defi`, `/api/hacker-news`, `/api/sec-filings`, and
   `/api/threat-intel` return a non-2xx response when every applicable upstream
   source fails and no verified fallback data exists.
2. A verified fallback may return `200` with explicit source/degraded metadata.
   A successful reachable source may return a verified empty collection.
3. Empty or failed fallbacks are not cached as successful data.
4. Article, CVE, OTX, conflict, global-data, price, and sentiment clients check
   `response.ok`, validate payload shape, ignore stale completions, preserve
   prior verified store data on failure, and record feed status.
5. Repeated global-data batches cancel or supersede the earlier batch. Abort
   signals are passed to the actual requests rather than created and ignored.
6. Concurrent GET deduplication never lets one caller's abort signal cancel a
   different caller's request.
7. Guardian enrichment runs only through the server news route and reads
   `GUARDIAN_KEY` from the server environment.
8. The signal horizon derives only from the existing local Zustand feed status,
   exposes no secrets or response bodies, remains keyboard accessible, and
   reports retained data separately from unavailable data.
9. Shared Aurora styling affects HQ plus `/command`, `/intel`, `/alpha`,
   `/cyber`, `/recon`, `/vault`, and `/resources` without replacing their
   content, routing, state, or task behavior. The shared material contract
   includes a near-black viewport, editorial route header, rounded liquid-glass
   workplane and rail hierarchy, fine non-image texture, pill actions, and a
   compact signal horizon.
10. Reduced-motion, focus-visible, contrast, and responsive source contracts
    remain intact. Physical phone/PWA acceptance stays deferred.

## Source truth and ownership

- `DESIGN.md` remains the palette, type, spacing, density, and motion authority.
- `components/nav/Nav.tsx` owns the global rail seam.
- `components/ui/FeedSignalHorizon.tsx` owns compact whole-product feed posture.
- `components/ui/shell.tsx` and `app/globals.css` own shared Aurora hierarchy.
- `lib/apiFetch.ts` owns authenticated client request behavior and safe GET
  deduplication.
- `hooks/useArticles.ts`, `hooks/useCVEs.ts`, `hooks/useOTX.ts`,
  `hooks/useGlobalData.ts`, and `components/ui/DataLoader.tsx` own client feed
  lifecycle and retained-data behavior.
- The affected `app/api/*/route.ts` files own upstream truth at the proxy
  boundary.
- Focused validators and canonical verification own regression proof.

## Implementation slices

### Slice 1 — Proxy truth

- Add focused failing fixtures for total upstream failure, verified fallback,
  and verified-empty behavior.
- Correct the eight proxy routes without changing providers or request policy.
- Prove no total failure returns a successful empty payload.

### Slice 2 — Client retention

- Add reusable response-shape and abort helpers only where they reduce repeated
  failure-prone logic.
- Repair article, CVE, OTX, conflict, and global-data lifecycle handling.
- Prove stale requests cannot win and failed requests do not erase store data.

### Slice 3 — Whole-product visual system

- Add the shared signal horizon to the authenticated global shell.
- Refine common workplane, rail, field, callout, empty, input, focus, and
  transition styling through the existing Aurora primitives.
- Update the most ambiguous empty states to read feed posture truthfully.

### Slice 4 — Release proof

- Run focused fixtures, design and accessibility guards, type-check, lint,
  format checks, production build, canonical verification, authenticated route
  smoke, handoff checks, and exact-scope Git review.
- Browser automation is unavailable under the current local-URL policy and is
  recorded as unavailable rather than passed. Mario's future visual inspection
  remains the acceptance path for visual nuance.

## Boundaries

- No new tab, route, provider, dependency, persistent data, telemetry, external
  asset or video, portfolio identity/content, product charge, deployment, or
  phone/PWA acceptance.
- No direct provider call from a browser component or hook.
- No fabricated placeholder values, neutral sentiment defaults, or
  outage-as-empty rendering.
- No provider-account diagnosis from a sandboxed runtime alone.
- No broad formatting, unrelated cleanup, `main.bat`, `git add .`, or staging
  of status-only paths.
- No claim of automated Browser QA while local-page inspection remains blocked
  by policy.

## Verification matrix

- focused proxy failure fixtures
- focused client fetch-contract fixtures
- signal-horizon static and accessibility proof
- `npm run design:check`
- `npm run surface:polish:check`
- `npm run shell:accessibility:check`
- `npm run type-check`
- `npm run lint`
- exact changed-file formatting check
- `git diff --check`
- `npm run publication:safety:check`
- `npm run security-scan`
- `npm run verify`
- production build
- authenticated smoke across all eight GA routes
- owned runtime shutdown and independent port-release proof

## Rollback

Keep this tranche isolated from operator data and schema migrations. Reverting
the exact implementation commit restores the prior shell and feed lifecycle
without data conversion.
