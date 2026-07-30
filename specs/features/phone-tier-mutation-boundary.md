# Phone-Tier Mutation Boundary

## Status

Complete.

## One-sentence outcome

Phone-token sessions can read Nexus and use local AI, governed tools, and acceptance receipts, but every other API mutation is denied centrally before route code runs.

## Confirmed symptom and root cause

- `middleware.ts` currently reduces a valid session to one boolean, so master and phone sessions receive the same generic API authorization.
- The repository currently exposes 29 `POST`/`PUT`/`PATCH`/`DELETE` handlers: one public login, three phone workflows that must remain usable, and 25 mutation handlers that should require the master session.
- Settings, verification, sweeps, and selected tools add route-level phone checks, but workflow, registry, memory, telemetry, experiment, second-brain, and other mutations do not share one complete tier boundary.
- `/api/ai` follows the network/provider policy only; in an internal or connected runtime a phone session could select a cloud provider even though the phone-token promise is HQ chat plus local AI.

## Required behavior

1. Keep public route handling unchanged so `/api/token` can create either session tier.
2. Keep internal server-to-server requests authorized by the master internal header outside the phone restriction.
3. Resolve the signed session once in middleware. After generic authorization succeeds, apply the phone-tier policy only when the session tier is `phone` and internal master authentication did not also succeed.
4. Allow `GET`, `HEAD`, and `OPTIONS` for phone sessions subject to the existing network, connector, route, and authentication policies.
5. Default-deny every other method for a phone session with HTTP 403, `code: phone_token_limited`, a non-secret recovery message, no-store headers, and a stable policy header.
6. Preserve only these exact mutation exceptions:
   - `POST /api/ai` for local AI.
   - `POST /api/tools` for the existing capability policy, which independently blocks phone networked, mutate, and exec tools while allowing read/analyze tools.
   - `POST /api/phone-acceptance/receipt` for sanitized acceptance evidence.
7. Exact means exact: `/api/ai/batches`, child paths, alternate methods, and similarly prefixed routes are not implied exceptions.
8. Force phone sessions on `/api/ai` to the Ollama/TurboQuant local-only provider chain in every network mode. An explicit cloud provider must return `phone_token_limited` rather than falling through to paid/BYOK policy.
9. Preserve the current master-session behavior and the route-level step-up/master guards as defense in depth.
10. Add the authenticated tier to auth diagnostics so operators can see `master`, `phone`, or `null` without exposing a credential.
11. Keep the change dependency-free, middleware-compatible, and outside every RPG path.

## Edge cases

- No configured master token: retain the current local unauthenticated development behavior; no valid phone session can exist without the signed master-key contract.
- Phone cookie plus valid internal master header: treat the request as internal master traffic.
- Invalid/expired phone cookie: return the existing 401 path, not a tier-policy response.
- Public login POST: remains public and never reaches phone-session evaluation.
- Lowercase or unexpected methods: normalize before evaluation; unknown methods are mutations and default to blocked.
- Trailing or child paths: do not inherit exact mutation exceptions.
- Phone AI request without an explicit provider: use only the local provider chain.
- Phone AI request with an unknown provider string: never widen to cloud; local-only filtering remains authoritative.

## Verification contract

- Add a pure runtime policy matrix covering read methods, the three exact exceptions, child paths, alternate methods, cloud/local AI providers, and default-deny behavior.
- Add a static validator that inventories every active `app/api/**/route.ts` unsafe-method export, identifies the public login separately, and proves each protected handler resolves either to one approved exact exception or the default phone block.
- Protect middleware ordering, full session resolution, internal-master bypass, 403 body/header/no-store posture, AI local-only enforcement, auth diagnostics, package scripts, canonical verification wiring, docs, task state, and the zero-RPG boundary.
- Run focused phone/security gates, `npx tsc --noEmit`, lint, formatting, canonical `npm run verify`, production build, publication safety, handoff checks, diff checks, and zero-RPG-path audit.

## Benefits

- One future-proof boundary replaces incomplete route-by-route phone guarding.
- A stolen or intentionally shared phone token cannot mutate workflows, memory, telemetry, settings, integrations, experiments, or other operator state.
- Phone access still supports the actual acceptance path and useful local assistant workflow.
- Master and internal automation behavior remain compatible.
- Operator diagnostics explain the active tier without exposing token material.

## Out of scope

- Changing master-session route behavior.
- Expanding the phone token into a general remote administration credential.
- Reclassifying individual tool capabilities.
- Physical phone/PWA acceptance proof.
- Nonce CSP, SRI, dependency upgrades, or new UI.
- Any RPG route, component, library, documentation, asset, test, or validator change.

## Completion evidence

- The active-route inventory classifies all 29 unsafe handlers as one public login, three exact phone-session exceptions, and 25 protected mutations that default to the central 403 boundary.
- The runtime matrix covers reads, exact-path/method exceptions, child paths, alternate methods, future unknown mutations, phone-local Ollama/TurboQuant selection, explicit cloud-provider denial, and unchanged master-provider access.
- Focused phone/security gates, explicit TypeScript, zero-warning lint, formatting, 180.2-second canonical verification, 60.0-second production build, publication safety, and zero-RPG-path review passed.
