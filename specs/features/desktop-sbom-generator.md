# DESKTOP-SBOM-GENERATOR

## Goal

Generate a deterministic, offline CycloneDX SBOM for the Nexus desktop release lane from the committed npm and Cargo lockfiles.

## Scope

- Add `npm run desktop:sbom` to write `docs/metrics/desktop-sbom.cdx.json`.
- Add `npm run desktop:sbom:check` to verify that the committed SBOM matches the current lockfiles without writing files.
- Inventory unique npm package versions from `package-lock.json`.
- Inventory unique Rust crate versions from `desktop/src-tauri/Cargo.lock`.
- Include package URLs, available integrity/checksum hashes, ecosystem labels, npm runtime/development scope, and a deterministic combined lockfile digest.
- Integrate the canonical SBOM artifact into the existing desktop trust-chain status.
- Wire freshness validation into `npm run verify`.

## Guardrails

- No network calls, package installs, Cargo downloads, or registry lookups.
- No dependency upgrades or lockfile changes.
- No certificate, private-key, token, environment, or secret reads.
- No Tauri packaging, signing, notarization, or release-ready claim.
- No UI/product, public-route, or ARPG changes.

## Acceptance

- The generator creates valid CycloneDX 1.5 JSON with npm and Cargo components.
- Re-running the generator produces byte-identical output when lockfiles are unchanged.
- `npm run desktop:sbom:check` fails when the artifact is missing or stale and passes when current.
- `npm run desktop:trust-chain` reports the canonical SBOM as recorded.
- `npm run verify` includes SBOM freshness validation.
