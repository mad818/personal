# TRADINGVIEW-SANDBOX-ISOLATION

## Status

Complete on 2026-07-15.

## Problem

The ALPHA charts view currently creates TradingView `<script>` elements in the
Nexus document. `crossOrigin="anonymous"` changes fetch behavior but does not
verify the downloaded code without an `integrity` value, so the versionless
third-party script still executes with the Nexus document's origin authority.

TradingView's official widget documentation describes the classic widgets as
scripts that inject iframes and publishes unversioned embed URLs:

- [Widget formats](https://www.tradingview.com/widget-docs/widget-formats/)
- [Advanced chart embed](https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/)
- [Legacy ticker tape embed](https://www.tradingview.com/widget-docs/widgets/tickers/legacy-ticker-tape/)

Inference: a one-time SRI hash over a mutable, unversioned provider URL would
turn the next upstream update into a broken widget. Nexus should isolate that
code rather than claim durable integrity it cannot maintain.

## Outcome

The same ticker tape and BTC advanced chart remain available, but their remote
bootstrap scripts execute only inside a local, fixed-configuration document
that the browser treats as an opaque sandboxed origin. Normal Nexus documents
no longer authorize TradingView as a script or frame source.

## Security contract

1. `components/alpha/TradingViewMarkets.tsx` renders only same-origin iframes
   pointing at one fixed local embed route. It must not create or mutate script
   elements.
2. Each parent iframe uses `sandbox` with only `allow-scripts`, `allow-popups`,
   and `allow-popups-to-escape-sandbox`; `allow-same-origin`, top navigation,
   forms, downloads, storage access, and modals remain unavailable.
3. The iframe also uses `referrerPolicy="no-referrer"`, lazy loading, an exact
   accessible title, and a fixed `src` selected by Nexus rather than user input.
4. The local route accepts only `ticker` or `chart`. All widget script URLs,
   symbols, themes, and options are repository-owned constants; no query value
   is interpolated into HTML or a remote URL.
5. The route requires the middleware nonce, emits one nonce-bearing external
   script, escapes JSON for script-data context, returns HTML as `no-store`, and
   never contacts TradingView from the server.
6. The route-specific CSP adds the TradingView script/image/frame hosts plus
   `sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox` and
   `frame-ancestors 'self'`. It never adds `allow-same-origin`.
7. The default CSP removes TradingView from `script-src`, `frame-src`, and the
   TradingView-only `img-src` additions. Existing non-TradingView directives
   and development allowances remain unchanged.
8. Global pages keep `X-Frame-Options: DENY`; only the exact local embed route
   receives the later `SAMEORIGIN` override required for its Nexus parent.
9. The migration must preserve layout, attribution links, chart sizing, lazy
   loading, dark theme configuration, CSP nonce behavior, and all API gateway
   decisions.

## Implementation map

- `lib/security/tradingViewEmbed.ts` owns the two fixed configurations and
  nonce-bearing HTML builder.
- `app/embeds/tradingview/route.ts` validates the fixed kind and middleware
  nonce and returns the isolated no-store document.
- `components/alpha/TradingViewMarkets.tsx` becomes an iframe-only presentation
  component.
- `lib/security/contentSecurityPolicy.ts`, `middleware.ts`, and
  `next.config.js` scope TradingView authorization and framing to the route.
- Focused static/runtime validators protect the sandbox tokens, forbidden
  parent-origin capabilities, fixed configuration, policy scoping, response
  headers, documentation, and canonical verification wiring.

## Boundaries

- No TradingView code is copied, vendored, proxied, hashed, or executed by the
  Nexus server.
- No API key, provider, dependency, route-policy exception, persistence, user
  configuration, or background request is added.
- The frame still displays provider-controlled content and may open explicit
  user-initiated TradingView links; sandboxing contains that content but does
  not claim provider integrity.
- No private RPG path is read for implementation or changed.

## Required proof

- Baseline `npx tsc --noEmit` before edits.
- Focused executable HTML/CSP matrix plus active-source static inventory.
- Existing nonce-CSP, security-boundary, TypeScript, zero-warning lint,
  formatting, publication, and path-safety checks.
- Production build and HTTP proof for default-policy host removal, isolated
  route policy, nonce agreement, sandbox directives, framing headers, invalid
  kind rejection, and process cleanup.
- Canonical `npm run verify`, handoff freshness, diff checks, local commit, one
  push attempt, and a zero-RPG-path changed-file audit.

## Completed evidence

- `npm run security:tradingview`, `npm run security:csp`, and
  `npm run security:boundaries` passed their static and executable contracts.
- `npx tsc --noEmit`, zero-warning lint, formatting, and publication safety
  passed.
- The production build passed in 83.0 seconds. The 6.0-second loopback HTTP
  proof confirmed distinct widget nonces, exact framing headers, route-scoped
  hosts, sandbox tokens without `allow-same-origin`, default host removal, and
  invalid-kind rejection.
- Canonical `npm run verify` passed in 195.9 seconds. Its existing RPG validators
  ran read-only; the final changed-path audit contains no RPG path.
