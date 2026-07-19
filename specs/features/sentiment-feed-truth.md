# Sentiment Feed Truth

## Objective

Make Fear & Greed availability truthful across the active COMMAND surface: missing evidence must remain unknown, verified evidence must survive refresh failure, and Nexus must not issue duplicate provider requests through competing loaders.

## Server contract

- Browser code calls only same-origin `/api/fear-greed` through `apiFetch`.
- Nexus owns one fixed Alternative.me request for the current value plus bounded history; a refresh does not make separate current and history provider calls.
- Upstream reads have fixed time and response-size ceilings. A response is accepted only when it contains at least one normalized entry with a finite integer value from `0` through `100`, a non-empty classification, and a valid timestamp.
- Successful output is a Nexus-owned `{ ok, current, history }` contract. Malformed records are not forwarded.
- Provider HTTP, network, size, JSON, or total payload-shape failure returns a fixed safe non-2xx response without raw upstream details.
- The route uses a protected no-store response, a short internal server cache, and a per-route rate limit.

## Client contract

- One dedicated sentiment hook validates `response.ok` plus the success contract, then updates both `fearGreed` and `signals.fg` from the same verified snapshot.
- The generic global-data batch no longer fetches Fear & Greed, eliminating competing requests and store writes.
- Refresh failure preserves both existing sentiment stores, ignores stale/unmounted completions, and records a fixed error in `feedStatus.fearGreed`.
- COMMAND renders missing sentiment as unknown rather than substituting `50` in the heatmap or system score.
- When the feed fails, COMMAND exposes an accessible retained/unavailable message and local retry. A prior verified value may remain visible only with retained-data disclosure.

## Non-goals

- No provider, key, dependency, paid service, alert engine, persistence layer, dead component redesign, or synthetic sentiment history.
- No live provider request in deterministic validation.
- No phone/PWA acceptance or RPG work.

## Acceptance evidence

- Deterministic fixtures cover a valid snapshot, invalid entries, malformed JSON, oversized response, upstream HTTP/network failure, single provider call, normalized timestamps, and fixed safe errors.
- Static checks cover same-origin access, `response.ok`, payload validation, shared store updates, stale-completion protection, global-loader deduplication, feed status, no neutral fallback, unknown rendering, accessible retry, route limits, and canonical verification wiring.
- TypeScript, zero-warning lint, formatting, publication/security checks, one canonical verification run, one production build, and final diff/handoff checks pass.
