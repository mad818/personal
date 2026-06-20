# CP2-LOCAL-RELEASE-GATES

Feature contract ID: **CP2-LOCAL-RELEASE-GATES**

## Purpose

Advance CP2 release-engineering checks that do not require a staged host or Docker environment. These gates provide a verifiable local proof of CP2.2, CP2.3, and CP2.4 readiness, leaving only CP2.1 (web/Docker rehearsal) and FD2 blocked until a real Coolify hostname exists.

## Scope — what is local-provable

| Check | Local? | Gate |
|-------|--------|------|
| CP2.2 — Desktop isolation: secure-runtime-gate enforces isolated profile, no paid-API enablement, no-outbound by default | Yes | `desktop:isolation:check` |
| CP2.3 — Desktop trust chain: checksum / signing / SBOM status, honest note on missing packaged artifacts | Yes | `desktop:trust-chain:check` |
| CP2.4 — Launch gate: type-check + lint + route:integrity + eval:agent-runtime:ci + release:smoke + auth check | Partial (server-required steps skipped, documented) | `cp2:local:launch-gate` |

## CP2.2 — Desktop Isolation Proof

The `scripts/secure-runtime-gate.mjs` module is the enforcer. The isolation check (`validate-desktop-isolation.mjs`) performs **static source analysis** and **programmatic profile verification** without starting a server:

- Source-level assertions: `NEXUS_NETWORK_MODE` is `"isolated"`, `NEXUS_ALLOW_PAID_APIS` is `"false"`, `NEXUS_ENABLE_HIGH_RISK_TOOLS` is `"false"`, `NEXUS_HIGH_RISK_WRITES_REQUIRE_APPROVAL` is `"true"`.
- No `0.0.0.0` binding without `confirm-private-network` safeguard present in source.
- Profile smoke: `buildSecureRuntimeProfile({ profile: "local", ... })` returns correct isolated env; `buildSecureRuntimeProfile({ profile: "tailnet", ... })` without flag is blocked.
- Documents no-outbound posture: the local profile binds `127.0.0.1` only; Tailscale/tailnet binding requires explicit operator opt-in.

**No-outbound guarantee**: the gate runtime sets `NEXUS_NETWORK_MODE=isolated` and `NEXUS_ALLOW_PAID_APIS=false` at process startup. Any `callAI()` call under this profile receives env flags that signal the provider layer to reject or skip paid requests. No outbound call is initiated to paid inference endpoints unless the user explicitly supplies BYOK keys and overrides the profile env.

## CP2.3 — Desktop Trust Chain (honest artifact status)

The `desktop:trust-chain:check` gate documents the current state honestly:

- `desktop/dist` is empty (no packaged Tauri artifacts yet) — this is expected pre-release and is explicitly recorded as a blocker, not a failure.
- Checksum file (`SHA256SUMS.txt`) cannot exist until artifacts do — noted.
- Signing posture is read from committed `tauri.conf.json` only; no secrets are read.
- SBOM is tracked in `docs/metrics/desktop-sbom.cdx.json`.

Remaining work for full CP2.3 sign-off: build Tauri release artifacts, run `npm run release:checksums`, configure signing identities.

## CP2.4 — Launch Gate Bundle

`scripts/cp2-local-launch-gate.mjs` runs the following checks sequentially:

| Step | Mode | Skip condition |
|------|------|---------------|
| `type-check` (`tsc --noEmit`) | Always runs | None |
| `lint` | Always runs | None |
| `route:integrity` | Server-required | Skipped if `NEXUS_RELEASE_BASE_URL` is unreachable; documented |
| `eval:agent-runtime:ci` | Runs locally | Continues on partial score if baseline CI flags are absent |
| `release:smoke` | Server-required | Skipped unless `NEXUS_RELEASE_BASE_URL` env is set and reachable |
| Auth regression (`auth-regression.mjs`) | Token + server required | Skipped if `NEXUS_TOKEN` is absent or server is unreachable |

Static checks (`type-check`, `lint`) always run. Server-required checks are skipped with a documented `SKIPPED (server-required)` label. The gate exits 0 if all non-skipped checks pass and all skipped checks are properly documented.

`scripts/validate-cp2-local-launch-gate.mjs` is the static validator (no server needed) — it confirms the gate script exists, references all required checks, and is wired into npm scripts.

## npm scripts

```
npm run desktop:isolation:check   # CP2.2 static isolation proof (no server)
npm run desktop:trust-chain:check # CP2.3 trust chain status (no server)
npm run cp2:local:launch-gate     # CP2.4 full launch gate (server-required steps skip gracefully)
npm run cp2:local:launch-gate:check # CP2.4 static validator (no server)
```

`desktop:isolation:check` and `cp2:local:launch-gate:check` are wired into `npm run verify` since they are static and have no side effects.

`cp2:local:launch-gate` is intentionally **not** wired into `verify` — it runs live checks that require a running server for full coverage.

## Acceptance criteria

- `npm run desktop:isolation:check` exits 0 and prints isolation posture summary.
- `npm run desktop:trust-chain:check` exits 0 and honestly notes missing packaged artifacts.
- `npm run cp2:local:launch-gate` exits 0; static checks pass; server-required checks are marked `SKIPPED (server-required)` with documentation.
- `npm run cp2:local:launch-gate:check` exits 0.
- `npx tsc --noEmit` passes with no new errors.

## Remaining work (out of scope for this pass)

- CP2.1 — Web release rehearsal (requires real Coolify hostname in `.env.local`)
- FD2 — Staged deployment proof (same blocker)
- Tauri artifact build + `release:checksums` + signing configuration
