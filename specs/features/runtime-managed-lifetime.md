# RUNTIME-MANAGED-LIFETIME

## Purpose

The managed `3100` runtime is the proof lane for desktop LAN, phone/iPad acceptance, and local-only operation. It must not report launch success from a process that exits immediately after first health.

## Requirements

- `npm run runtime:launch:3100` records the pid for the process that keeps the local Next standalone runtime alive.
- The standalone runtime is booted inside the managed process instead of spawning a short-lived wrapper around another Node process.
- The managed process keeps a ref'd lifetime handle open after requiring the standalone server.
- Launch success requires `/api/health` to be reachable and the recorded pid to remain alive through a stable-health window.
- If the runtime exits during startup or during the stability window, the pid file is removed and launch fails.
- Shutdown attempts the Windows process tree stop first, then falls back to a direct `Stop-Process` style pid kill before failing.
- The lane stays local-only and does not add network telemetry, provider calls, phone-proof simulation, screenshots, transcripts, or secrets to tracked artifacts.

## Acceptance

- `npm run runtime:lifetime:check` passes.
- `npm run runtime:launch:3100` stays healthy long enough for `npm run phone:acceptance:capture`.
- `npm run runtime:stop:3100` removes the managed runtime after proof.
- `npm run verify` includes the lifetime check.
