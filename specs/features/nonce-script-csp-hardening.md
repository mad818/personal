# NONCE-SCRIPT-CSP-HARDENING

## Status

Complete on 2026-07-14.

## Problem

The active web application emits three intentional inline boot scripts, while
`next.config.js` permits every inline script through
`script-src 'unsafe-inline'`. That exception weakens the browser boundary: an
unexpected injected script can execute without being one of the scripts Nexus
authorized for the current response.

The current CSP is also static. It cannot authorize the application boot
scripts individually or give Next.js a request nonce for framework scripts.

## Outcome

Every matched web document receives a fresh, unpredictable nonce. Middleware
places the same normalized policy on the render request and response, Next.js
uses it for framework scripts, and the root layout places it on the three
intentional Nexus boot scripts. The web `script-src` directive no longer
contains `'unsafe-inline'`.

## Security contract

1. Generate at least 128 bits of randomness per matched request with Web
   Crypto; never derive a nonce from a token, cookie, URL, clock, or process
   counter.
2. Accept only a bounded base64-compatible nonce value before interpolating it
   into a header.
3. Put `Content-Security-Policy` and `x-nonce` on the request headers passed to
   Next.js rendering, and put the identical CSP on the response.
4. Use `script-src 'self' 'nonce-<value>' 'strict-dynamic'`; retain
   `'unsafe-eval'` only for development tooling and retain the TradingView host
   as a compatibility fallback.
5. Preserve the existing style, image, font, media, connect, frame, object,
   base, and form directives. In particular, this tranche does not claim to
   remove the separate `style-src 'unsafe-inline'` exception.
6. Preserve the complete API authentication, route-policy, connector-policy,
   and phone-tier decision order. API early responses must keep the CSP too.
7. Exclude static Next.js assets, image optimization, common metadata assets,
   and router-prefetch traffic from nonce generation while retaining the
   existing `/api/*` gateway matcher.
8. Keep the root layout dynamically rendered. It already reads the signed
   session cookie and must also read the request nonce.

## Implementation map

- `lib/security/contentSecurityPolicy.ts` owns nonce generation, nonce
  validation, and the canonical policy builder.
- `middleware.ts` attaches request/response CSP state without changing gateway
  authorization outcomes.
- `app/layout.tsx`, `PersistedShellStateBootScript`, and
  `SurfaceMotionBootScript` attach the request nonce to the three intentional
  raw script elements.
- `next.config.js` retains the other static security headers and stops emitting
  a static CSP that would conflict with the request policy.
- Focused static and runtime validators protect nonce entropy, policy
  directives, middleware propagation, layout coverage, matcher scope,
  documentation truth, and canonical verification wiring.

## Compatibility and boundaries

- No route, provider, storage, UI, or product behavior changes.
- Modern browsers use nonce trust propagation through `'strict-dynamic'`;
  existing host sources remain as compatibility fallbacks.
- TradingView SRI remains a separately scoped backlog item because its remote
  embed scripts are not versioned with stable integrity metadata here.
- The Tauri shell's own static CSP is a separate desktop boundary and is not
  represented as fixed by this web-response change.
- No private RPG path is read for implementation or changed.

## Required proof

- Baseline `npx tsc --noEmit` before edits.
- Focused policy runtime matrix and static integration validator.
- `npx tsc --noEmit`, zero-warning lint, formatting, security-boundary checks,
  canonical `npm run verify`, and production `npm run build`.
- Production response proof showing two requests receive different nonces, the
  CSP has no script `'unsafe-inline'`, and every intentional inline script has
  the matching nonce.
- Handoff freshness, publication safety, diff checks, local commit, push
  attempt, and a zero-RPG-path changed-file audit.

## Completion evidence

- Baseline and post-change TypeScript checks passed; active-scope ESLint passed
  with zero warnings and the non-RPG formatter gate stayed clean.
- The focused static/runtime gate proved 64 unique 128-bit nonces, exact
  production and development directives, invalid nonce/port rejection, all
  three active raw script sites, middleware propagation, and verification
  wiring.
- The API gateway, phone-tier, security-boundary, publication-safety, and
  security-scan gates passed without policy-order drift.
- `npm run build` passed in 82.1 seconds and classified every application page
  as dynamically rendered.
- `npm run security:csp:production:check` passed in 6.6 seconds against a
  temporary production server: two document responses and the health API had
  distinct nonces, every rendered script matched its response, production had
  no script inline/eval escape, and the existing security headers remained.
- The final corrected `npm run verify` completed in 169.1 seconds. Its first
  pass exposed an existing rate-limit adjacency assertion; CSP wiring moved
  before that protected pair and all three focused gates plus the full rerun
  passed.
- The final changed-file inventory contained 19 paths and zero RPG paths.
