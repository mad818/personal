# Nonce-based web script CSP

Nexus generates its web `Content-Security-Policy` in `middleware.ts` for every
matched document request. The policy builder lives in
`lib/security/contentSecurityPolicy.ts`.

## What the boundary guarantees

- Each request receives a fresh 128-bit random nonce.
- The request passed to Next.js contains both `Content-Security-Policy` and
  `x-nonce`, allowing Next.js to nonce its framework scripts.
- The response carries the identical CSP.
- The three intentional Nexus inline boot scripts read `x-nonce` in the root
  layout and emit the same nonce attribute.
- Production `script-src` does not include `'unsafe-inline'` or
  `'unsafe-eval'`.
- Development adds only `'unsafe-eval'` and the two loopback WebSocket origins
  required by Next.js development tooling.

The policy keeps `'strict-dynamic'` plus the existing self and TradingView
sources. Modern browsers propagate trust from a nonce-bearing bootstrap script;
the host sources remain useful fallbacks for browsers without
`'strict-dynamic'` support.

This follows the [Next.js 15 nonce CSP
guide](https://nextjs.org/docs/15/app/guides/content-security-policy): the nonce
is generated in middleware, supplied on request headers before rendering, and
returned in the response policy.

## Verification

Run the focused gate:

```powershell
npm run security:csp
```

The gate executes the real TypeScript builder and also checks middleware,
layout, active inline-script inventory, matcher exclusions, static-header
ownership, documentation, and canonical verification wiring. `npm run verify`
includes the same gate.

After `npm run build`, run the real HTTP acceptance gate:

```powershell
npm run security:csp:production:check
```

It starts a temporary loopback-only production server on a random high port,
checks two rendered documents plus the health API, verifies header and rendered
nonce agreement, and always stops the temporary process tree.

For production acceptance, request a rendered page twice and confirm:

1. both responses contain `Content-Security-Policy`;
2. each `script-src` has exactly one nonce and no `'unsafe-inline'`;
3. the two response nonces differ; and
4. every intentional inline script in each response has that response's nonce.

## Troubleshooting

If the browser reports a blocked Nexus boot or framework script, compare its
`nonce` attribute with the nonce source in the response's `script-src`. Do not
restore `'unsafe-inline'`. Check that the document request passed through the
page matcher, the root layout received `x-nonce`, and any newly introduced raw
inline script also receives the layout nonce.

If a new external script is required, review whether it can be self-hosted or
loaded by a nonce-trusted bootstrap path before adding a host source. Keep
supply-chain integrity review separate from nonce authorization.

## Explicit boundaries

- `style-src 'unsafe-inline'` is unchanged; this work hardens scripts only.
- TradingView SRI remains a separate backlog item.
- The Tauri shell owns an additional static CSP and requires its own desktop
  hardening and packaged-shell proof.
