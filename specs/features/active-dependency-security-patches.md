# Active Dependency Security Patches

## Goal

Close the actionable active dependency advisories without broad package churn or
pretending retired archive manifests are live application dependencies.

## Active Patch Floors

- Every installed `postcss` copy must be at least `8.5.10`.
- Every installed `prismjs` copy must be at least `1.30.0`.
- Every installed `brace-expansion` copy must be at least `5.0.9`.
- The desktop lockfile must use `tauri` at least `2.11.1`.
- The desktop lockfile must not contain vulnerable `rand` `0.7.x` or `0.8.x`
  copies below `0.8.6`.

## Guardrails

- Keep Next.js on the current compatible major version.
- Use narrow npm overrides only where a transitive owner still requests a
  vulnerable version.
- Use the verified Dependabot-generated Cargo lockfile update rather than
  manually manufacturing Cargo checksums.
- Do not update retired manifests under `archive/`.
- Do not commit raw Dependabot exports.
- Do not use `npm audit fix --force`.

## Linux-Only Non-Release Finding

`glib 0.18.5` remains in the cross-platform Tauri lockfile through the GTK3
Linux dependency tree. The published advisory fix requires `glib 0.20.0`, which
is not compatible with that current GTK3 chain. Nexus releases desktop bundles
for Windows and macOS only, and `npm run security:tauri` rejects Linux bundle
targets. Classify this advisory as `not_used` rather than forcing an invalid
lockfile; re-open it before adding Linux release support.

## Verification

- `npm run dependency:security:check`
- `npm run dependabot:audit:check`
- `npm run dependency:risk:check`
- `npm run security:tauri`
- `npm run validate:infra-hardening`
- `npm run verify`
