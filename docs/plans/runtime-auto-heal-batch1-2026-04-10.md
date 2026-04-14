# Runtime Auto-Heal Batch 1 — 2026-04-10

## Summary

Fixed the local `ERR_CONNECTION_REFUSED` recovery path so Nexus can heal a dead web runtime on `127.0.0.1:3000` and reopen HQ only after `/api/health` is live again.

## What changed

- Added [`scripts/runtime-auto-heal.mjs`](/C:/Users/mario/Desktop/personal/scripts/runtime-auto-heal.mjs) as the supported local runtime healer.
- Added package entrypoints in [`package.json`](/C:/Users/mario/Desktop/personal/package.json):
  - `npm run runtime:heal`
  - `npm run hq:open`
- Hardened the Windows background launch path so the healer uses a real `Start-Process` detach instead of a short-lived child process that could exit when the parent shell closed.
- Kept the safety boundary:
  - reuse a healthy runtime when one already exists
  - refuse to blindly replace a different process occupying port `3000`
  - rebuild and retry once when the standalone build is missing or stale
- Documented the operator flow in:
  - [`docs/deployment/README.md`](/C:/Users/mario/Desktop/personal/docs/deployment/README.md)
  - [`docs/deployment/web-operator-runbook.md`](/C:/Users/mario/Desktop/personal/docs/deployment/web-operator-runbook.md)

## Verification

- `npm run handoff:pull` still fails on this machine because GitHub credentials are missing (`SEC_E_NO_CREDENTIALS`), which remains the known `FD1C` blocker.
- `npm run type-check` passed after the healer fix.
- `npm run runtime:heal` now reports a healthy runtime and leaves the server reachable after the command exits.
- `http://127.0.0.1:3000/api/health` returned `200`.
- `http://127.0.0.1:3000/hq` returned `200`.

## Operator outcome

When the browser shows `ERR_CONNECTION_REFUSED` against the local Nexus runtime:

```bash
npm run runtime:heal
```

To heal and reopen HQ in one step:

```bash
npm run hq:open
```
