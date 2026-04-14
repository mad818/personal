# Data Loader Auto-Heal Batch 1 — 2026-04-10

## Summary

Fixed the shared loading failure where many connector-backed boxes looked stuck or empty after the local runtime came back up. The root cause was a startup policy mismatch: the standalone runtime was booting without the saved `.env.local` network mode, so middleware defaulted to `isolated` and blocked connector routes on first load.

## What changed

- [`scripts/start-runtime.mjs`](/C:/Users/mario/Desktop/personal/scripts/start-runtime.mjs)
  - Now loads `.env.local` before spawning the standalone server, so the runtime inherits the saved `NEXUS_NETWORK_MODE` and related policy values immediately instead of silently falling back to the production default.
- [`components/ui/RuntimePolicyCookieSync.tsx`](/C:/Users/mario/Desktop/personal/components/ui/RuntimePolicyCookieSync.tsx)
  - Now emits a shared runtime-policy-refreshed browser event after `/api/settings` succeeds.
- [`components/ui/GlobalDataLoader.tsx`](/C:/Users/mario/Desktop/personal/components/ui/GlobalDataLoader.tsx)
  - Now re-runs the global feed bundle when the runtime policy refresh event fires.
- [`components/ui/DataLoader.tsx`](/C:/Users/mario/Desktop/personal/components/ui/DataLoader.tsx)
  - Visible polling loaders now retry immediately after the runtime policy refresh event instead of waiting for the next timed poll.
- [`lib/runtimePolicyEvents.ts`](/C:/Users/mario/Desktop/personal/lib/runtimePolicyEvents.ts)
  - Added one shared event constant so the retry path stays centralized.
- [`scripts/runtime-auto-heal.mjs`](/C:/Users/mario/Desktop/personal/scripts/runtime-auto-heal.mjs)
  - Fixed the Windows healer edge where the PowerShell wrapper was `await`ed and `unref()`d at the same time, which caused an unsettled top-level await warning during detached relaunch.

## Verification

- `npm run type-check` passed after the changes.
- The healed runtime now comes back on `127.0.0.1:3000` with a fresh boot id.
- Authenticated checks now return live connector data instead of `Blocked by network policy`:
  - `/api/prices`
  - `/api/news`
  - `/api/cves`
  - `/api/weather`
  - `/api/fear-greed`
- Authenticated `/api/settings` now reports:
  - `NEXUS_NETWORK_MODE = internal`
  - `NEXUS_ALLOW_PAID_APIS = false`

## Notes

- `tabs:e2e` is still red in this workspace, but the failures are stale redesign-era label assumptions in [`tests/e2e/tab-surfaces.spec.ts`](/C:/Users/mario/Desktop/personal/tests/e2e/tab-surfaces.spec.ts), not the connector/runtime bug that caused the boxes to look dead.
- `npm run handoff:pull` remains blocked on this machine by the known GitHub credentials issue (`SEC_E_NO_CREDENTIALS`).
