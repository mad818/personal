# Nexus Prime desktop host

The desktop release uses Tauri 2 to host the same verified Next.js standalone
runtime as the web application. Windows and macOS are the supported release
targets. Linux bundles remain disabled until their dependency and signing
posture is separately approved.

## Build and run

- Build standalone runtime:

```bash
npm run desktop:build-runtime
```

- Start local-only runtime (binds `127.0.0.1` by default):

```bash
npm run desktop:start-runtime
```

- Open the Tauri development shell:

```bash
npm run desktop:tauri:dev
```

The runtime launcher uses `.next/standalone/server.js`. Tauri consumes that
same canonical output through `../../.next/standalone` in
`desktop/src-tauri/tauri.conf.json`. Generated frontend snapshots are not
tracked under `desktop/`; rebuild from the current source and lockfiles instead.

The runtime defaults to:

- `HOSTNAME=127.0.0.1`
- `PORT=3000`

## Release and security contract

The checked-in desktop inputs are limited to the Tauri manifest, Rust source,
capability policy, generated Tauri schemas, packaging templates, and required
icons. A release candidate must pass:

```bash
npm run security:tauri
npm run desktop:sbom:check
npm run desktop:isolation:check
npm run desktop:trust-chain:check
```

Signing identities and packaged installers are operator-supplied release
evidence. The repository does not claim a signed desktop release until those
artifacts exist and their checksums are recorded.

Use these profile variables with the centralized route policy:

Use with route policy controls:

- `NEXUS_NETWORK_MODE=isolated|internal|connected`
- `NEXUS_ENABLE_HIGH_RISK_TOOLS=true|false`

Recommended default for secured networks:

```bash
NEXUS_NETWORK_MODE=isolated
NEXUS_ENABLE_HIGH_RISK_TOOLS=false
```

For the full operating procedure, see
`docs/deployment/desktop-secured-runbook.md`.

For the Tauri isolation and signing checklist, see
`docs/deployment/tauri-security-checklist.md`.

Release-owned inputs include:

- `desktop/src-tauri/Cargo.toml`
- `desktop/src-tauri/tauri.conf.json`
- `desktop/src-tauri/capabilities/default.json`
