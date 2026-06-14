# LOCAL-RECOVERY-BUNDLE

## Goal

Protect Nexus-owned private local state on the always-on host with one offline recovery command that creates checksummed snapshots, verifies them, lists them, and restores them safely.

## Scope

- Add `npm run local:recovery -- create` to copy allowlisted Nexus state into `.nexus/backups/<bundle-id>/`.
- Add `npm run local:recovery -- list` to summarize available recovery bundles without printing private file contents.
- Add `npm run local:recovery -- verify --bundle=<path-or-id>` to verify manifest structure, allowed paths, sizes, and SHA-256 hashes.
- Add `npm run local:recovery -- restore --bundle=<path-or-id>` as a verification-backed dry run.
- Require `--apply --confirm=RESTORE_LOCAL_STATE` before restore writes anything.
- Require `--overwrite` before replacing an existing local-state file.
- Back up only:
  - `data/subscription-escape*.json`
  - `data/subscription-escape*.json.enc`
  - `data/subscription-escape-assets/**`
  - `data/phone-acceptance-receipts*.json`
- Add `npm run local:recovery:check` and wire it into `npm run verify`.

## Recovery Bundle Contract

- Every bundle contains `manifest.json` and a `files/` tree.
- The manifest records only relative allowlisted paths, byte sizes, SHA-256 hashes, totals, and a schema version.
- Bundle verification rejects missing files, modified files, extra files, symlinks, unsafe paths, and malformed manifests.
- Restore validates the entire bundle before planning or applying any write.
- Restore writes through temporary sibling files and renames them into place.

## Guardrails

- No network calls, cloud services, subscriptions, package installs, or external backup tools.
- No `.env`, tokens, cookies, auth headers, certificates, private keys, or git data.
- No arbitrary workspace backup, arbitrary source paths, or arbitrary restore paths.
- No file-content output.
- No automatic restore, overwrite, deletion, retention cleanup, or background scheduling.
- No UI, public-route, provider, dependency, or ARPG changes.

## Acceptance

- A fixture snapshot can be created, listed, and verified offline.
- Tampering causes verification to fail.
- Restore dry-run makes no changes.
- Restore apply requires the exact confirmation phrase and recreates the allowlisted fixture files.
- Existing files are not replaced without `--overwrite`.
- `npm run local:recovery:check` and `npm run verify` pass.
