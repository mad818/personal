# Nexus Desktop Host (bootstrap)

This folder is the landing zone for the desktop host layer (Tauri-first) described in:
`docs/plans/desktop-app-secure-migration-map.md`.

## Current bootstrap

- Build standalone runtime:

```bash
npm run desktop:build-runtime
```

- Start local-only runtime (binds `127.0.0.1` by default):

```bash
npm run desktop:start-runtime
```

- Tauri shell (initial scaffold):

```bash
npm run desktop:tauri:dev
```

The runtime launcher uses the repo-root `.next/standalone/server.js`, and the Tauri shell consumes the same bundle via `../../.next/standalone` from `desktop/src-tauri/tauri.conf.json`.

It defaults to:
- `HOSTNAME=127.0.0.1`
- `PORT=3000`

## Security profile variables

Use with route policy controls:

- `NEXUS_NETWORK_MODE=isolated|internal|connected`
- `NEXUS_ENABLE_HIGH_RISK_TOOLS=true|false`

Recommended default for secured networks:

```bash
NEXUS_NETWORK_MODE=isolated
NEXUS_ENABLE_HIGH_RISK_TOOLS=false
```

For full operating procedure, see:
`docs/deployment/desktop-secured-runbook.md`

For Tauri-specific isolation/signing implementation tasks, see:
`docs/deployment/tauri-security-checklist.md`

Scaffolded files live in:
- `desktop/src-tauri/Cargo.toml`
- `desktop/src-tauri/tauri.conf.json`
- `desktop/src-tauri/capabilities/default.json`
