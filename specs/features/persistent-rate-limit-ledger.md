# Persistent Rate-Limit Ledger

## Status

Complete.

## One-sentence outcome

Nexus rate-limit windows survive local Node-process restarts through a bounded private ledger, while LAN startup fails early if that protection cannot be established.

## Current evidence

- `lib/security/rateLimit.ts` keeps every attempt window in one process-local `Map`, so a restart clears all limits.
- The shared helper protects AI, tools, settings, verification, sweeps, network-health, readiness, and other authenticated routes.
- `phone:lan:start` deliberately binds Nexus to `0.0.0.0`, making restart-resistant enforcement most important on that path.
- `.nexus/` is already ignored and is the established location for private local runtime state.

## Surface and data

- Server-only implementation under `lib/security/`; no client state or UI is introduced.
- Default ledger: `.nexus/rate-limit-ledger.json` beneath the runtime working directory.
- Optional operator override: `NEXUS_RATE_LIMIT_LEDGER_PATH`.
- Optional explicit ephemeral mode: `NEXUS_RATE_LIMIT_PERSISTENCE=memory`.
- The protected `/api/status` response and normal rate-limit headers expose only the storage posture, never the path, bucket keys, IP addresses, bearer values, or error details.

## Required behavior

1. Preserve the existing `checkRateLimit()` and `applyRateLimitHeaders()` call contracts so current routes do not need individual rewrites.
2. Persist only the existing bucket name plus SHA-256 request identity, count, and reset timestamp; raw client addresses and bearer tokens must never reach disk.
3. Load and validate a versioned ledger lazily, discard expired entries, and recover from an interrupted write through one bounded previous snapshot.
4. Write accepted attempts synchronously through a temporary file and replace sequence so the next request cannot race ahead of persistence in the single-process local runtime.
5. Bound the store at 10,000 active windows. When capacity is reached, deny a previously unseen identity until the earliest active window expires instead of evicting a protected identity.
6. If ordinary persistence becomes unavailable, keep the current process protected in memory and report `memory_degraded`; do not crash unrelated API routes.
7. When persistence is explicitly disabled, report `memory_disabled` rather than implying durable protection.
8. `phone:lan:start` must prove the configured ledger directory is writable before exposing the runtime to the LAN and stop with an actionable error when it is not.
9. The production container must provide a writable `.nexus` directory for its non-root runtime user. Persistence across container replacement still requires an operator-mounted volume and must not be overclaimed.
10. Keep the implementation server-only, dependency-free, and outside every RPG path.

## Edge cases

- Missing ledger or directory: create both on first use.
- Expired entries: prune before evaluating capacity or the requested bucket.
- Invalid, oversized, or unsupported ledger: start from an empty in-memory set, repair on the next successful write, and expose a non-secret degraded/recovery posture.
- Interrupted replacement: prefer a valid current snapshot, otherwise recover one valid previous snapshot.
- Unwritable path: preserve process-local limiting; LAN launcher refuses to start.
- Multiple Node processes or replicas sharing one file: unsupported. Use one Nexus runtime per ledger or a future coordinated datastore.
- Serverless/ephemeral deployments: select `memory` explicitly or provide durable storage; the status contract remains honest either way.

## Verification contract

- Add a focused static/runtime validator that compiles and exercises the real TypeScript store.
- Prove accepted attempts survive construction of a fresh store instance, the next attempt is blocked, and expiry opens a new window.
- Prove corrupt-current/valid-previous recovery, invalid-ledger repair, unavailable-path degradation, explicit memory mode, and capacity denial without eviction.
- Prove no raw fixture address or bearer token appears in the persisted ledger.
- Protect the `.env.example`, LAN launcher, Docker ownership, status payload, header, package script, and canonical `verify` wiring.
- Run the focused validator, `npx tsc --noEmit`, lint, canonical `npm run verify`, production build, publication safety, handoff checks, and a zero-RPG-path diff audit.

## Benefits

- LAN abuse windows no longer disappear when the dev/runtime process restarts.
- Existing protected routes gain durability through one shared seam.
- Operators can see whether protection is durable or degraded without exposing private identity material.
- Storage growth and corruption behavior are bounded and deterministic.
- The change remains local-first, free, dependency-free, and compatible with the current route API.

## Out of scope

- Distributed or multi-replica rate limiting.
- Redis, SQLite, hosted coordination, or new packages.
- Changing route-specific limits or authentication policy.
- Nonce CSP, TradingView SRI, or the separate phone-tier route audit.
- Any RPG route, component, library, documentation, asset, test, or validator change.
