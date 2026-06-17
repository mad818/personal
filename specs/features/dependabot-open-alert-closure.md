# DEPENDABOT-OPEN-ALERT-CLOSURE

## Purpose

The GitHub Dependabot page currently shows two open moderate alerts:

- `js-yaml` in `package-lock.json`
- `glib` in `desktop/src-tauri/Cargo.lock`

Nexus needs a local, repeatable command that explains which alerts are locally patched, which require GitHub rescan, and which must be dismissed as not used because the affected dependency is outside the active release target.

## Requirements

- Read only local tracked manifests and lockfiles.
- Do not call GitHub, npm, cargo, crates.io, or any remote service.
- Do not dismiss alerts, mutate dependencies, install packages, or write artifacts.
- Report `js-yaml` as locally ready only when `package-lock.json` contains `js-yaml >= 4.1.1` and `package.json` carries the explicit override floor.
- Report `glib` as release-scope safe only when Windows/macOS bundle targets are the only Tauri release targets and Linux bundle targets are absent.
- Fail `--check` if `js-yaml` falls below the floor, the override is missing, or a Linux bundle target is reintroduced while `glib < 0.20.0` remains in `Cargo.lock`.
- Print the exact external action: push/rescan for `js-yaml`; dismiss the `glib` alert as `not_used` only while Linux desktop bundles remain out of scope.

## Acceptance

- `npm run dependabot:open:closure` prints the two-alert status.
- `npm run dependabot:open:closure:check` passes.
- `npm run validate:infra-hardening` includes the closure check.
