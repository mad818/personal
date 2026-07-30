# Market Rates Server Truth

## Objective

Make the active INTEL Market Rates panel fully same-origin, keep `FRED_KEY` on the server, and distinguish verified data, partial provider availability, retained data, and total unavailability.

## Problem

`MarketRates` currently reads `settings.fredKey` in browser state and embeds it in a direct FRED query-string request. The normal browser CSP therefore authorizes FRED and several other provider hosts even though Nexus already owns protected FX and commodity routes. The current routes also turn upstream errors into HTTP 200 plus empty objects, while the client silently catches combined failures; a provider outage can therefore look like an empty or incomplete verified market panel.

## Contract

- Browser code calls only protected same-origin `/api/fx` and `/api/commodities` routes through `apiFetch()`.
- `FRED_KEY` is read only from server environment and never returned, logged, or stored in client state.
- Provider endpoints are fixed server constants with bounded time and response size.
- FX validates a positive finite USD-rate record plus its update timestamp before returning HTTP 200; HTTP, network, body, JSON, or shape failure returns fixed HTTP 502 copy.
- Commodities evaluates metals and optional FRED energy independently. Each source reports `ok`, `partial`, `unconfigured`, or `unavailable`; verified quotes remain available when the other source fails.
- A commodities response is HTTP 200 when at least one source produced verified quotes and HTTP 502 only when no verified quote is available.
- Connector responses are protected/no-store and rate-limited.
- The client ignores stale completions, retains the last verified source data during refresh/failure, and exposes accessible loading, partial, retained, unconfigured, and unavailable states with local retry.

## Browser boundary

Once the direct FRED call is removed, the normal application CSP no longer needs provider API hosts for CoinGecko, NVD, Alternative.me, mempool.space, or FRED. These server-only/stale hosts are removed from `connect-src`; Mux media and development loopback WebSockets remain unchanged.

## Non-goals

- Adding or replacing market providers
- Changing route navigation or INTEL layout
- Paid API enablement by default
- Writing `.env.local` during validation
- Phone/PWA acceptance work
- RPG changes
- Live provider traffic during automated validation

## Acceptance

- `MarketRates` contains no third-party URL, `fredKey`, or `useStore` dependency.
- Client FRED defaults are removed while the legacy persistence scrub remains.
- Fixed fake-provider runtime fixtures cover valid FX, malformed FX, valid metals, partial FRED, missing key, total outage, rate limiting, response-size bounds, and secret non-disclosure.
- Static coverage proves protected/rate-limited routes, truthful UI states, CSP host removal, task/spec/lesson wiring, and canonical verification integration.
- Focused checks, TypeScript, lint, formatting, canonical verification, production build, publication safety, handoff checks, and changed-path boundary audit pass.
