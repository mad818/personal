# Desktop Trust Chain Status

## Goal

Close the missing CP2.3 status-record layer for desktop releases by adding a local command that records whether desktop artifacts have checksum proof, signing posture, and SBOM/dependency-inventory posture.

## Scope

- Add `npm run desktop:trust-chain` to write a timestamped JSON status record under `docs/metrics/`.
- Add `npm run desktop:trust-chain:check` for no-write verification.
- Inspect `desktop/dist` by default and support `--dir=<path>` for a release artifact directory.
- Verify `SHA256SUMS.txt` when desktop artifacts exist.
- Record macOS, Windows, and Linux signing posture from committed Tauri config only.
- Record SBOM posture from committed lockfiles and any existing SBOM-like files.

## Guardrails

- No actual signing or notarization.
- No certificate, private-key, token, or env reads.
- No network calls.
- No dependency installs.
- No Tauri packaging run.
- No UI/product changes.
- No release-ready claim when artifacts, checksums, signing, or SBOM proof are missing.

## Acceptance

- The command can write a JSON trust-chain status artifact without network access.
- The check command passes without desktop build artifacts by reporting missing artifact proof honestly.
- `npm run verify` includes the check command.
