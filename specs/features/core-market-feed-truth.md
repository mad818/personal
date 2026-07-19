# Core Market Feed Truth

## Objective

Keep the active crypto-price and Polymarket surfaces useful during provider failure without presenting an outage, malformed response, or invented neutral probability as verified data.

## Server contract

- Browser code calls only same-origin `/api/prices` and `/api/polymarket` routes through `apiFetch`.
- Nexus owns the fixed CoinGecko and Polymarket provider URLs. `COINGECKO_KEY` remains server-only.
- Price mode is limited to `markets` or `sparklines`. Coin identifiers are deduplicated, syntax-checked, and capped before an upstream URL is built.
- Upstream requests use fixed time and response-size ceilings. JSON is parsed only after the bounded read completes.
- Successful responses contain non-empty, normalized records with finite values. Malformed records are never forwarded as quotes or probabilities.
- Polymarket events without a valid first outcome probability are omitted rather than assigned a neutral `50%` fallback.
- Total provider, HTTP, response-size, JSON, or payload-shape failure returns a fixed safe non-2xx response without raw upstream details.
- Both routes use protected no-store JSON responses and per-route rate limits.

## Client contract

- Price markets and sparkline history settle independently. A chart-history failure does not erase newly verified prices, and a price failure does not clear prior verified prices.
- Price refresh state is recorded in the existing `feedStatus.prices` lane. ALPHA renders accessible retained/unavailable feedback and a local retry.
- Polymarket validates the normalized success contract before replacing local data, retains the last verified events on failure, ignores stale/unmounted completions, and exposes loading, error, retained-data, and retry states.
- Verified empty and unavailable are not interchangeable. A successful response must contain at least one verified record.

## Non-goals

- No new data provider, key, dependency, paid service, alerting engine, trading action, persistence layer, or server-side cache.
- No live provider request in deterministic validation.
- No phone/PWA acceptance or RPG work.

## Acceptance evidence

- Deterministic fixtures cover valid results, invalid input, malformed JSON and values, oversize responses, HTTP/network failure, server-only key handling, and safe error bodies.
- Static checks cover same-origin clients, `response.ok`, payload guards, settled independent price sources, retained data, stale-completion protection, accessible feedback/retry, route limits, canonical verification wiring, and forbidden path boundaries.
- TypeScript, zero-warning lint, formatting, publication/security checks, one canonical verification run, one production build, and final diff/handoff checks pass.
