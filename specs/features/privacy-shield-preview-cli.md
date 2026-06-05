# PRIVACY-SHIELD-PREVIEW-CLI

## Goal

Make Privacy Shield 2.0 inspectable before any cloud-bound AI dispatch by adding a local, no-network preview command that shows what Nexus would redact or block without sending the payload to a provider.

## Scope

- Add `npm run privacy:shield:preview`.
- Add `npm run privacy:shield:check`.
- Reuse the same privacy shield classes already enforced by the runtime boundary:
  - credentials
  - internal hosts
  - protected local/repo paths
  - sensitive/operator-only evidence markers
- Print summary-level evidence only: class counts, dispatch mode, safe preview text, and blocked reason.
- Support `--stdin`, `--sample`, `--text=`, `--json`, and `--check`.
- Wire the validator into `npm run verify`.

## Out of Scope

- No AI/provider calls.
- No network calls.
- No file reads except stdin.
- No file writes or metric artifacts.
- No `.env.local`, token, cookie, auth header, raw receipt, or secret-store reads.
- No proxy, VPN, IP-hiding, or anonymization guarantee beyond local redaction preview.
- No provider-routing changes, public routes, background workers, dependency installs, or ARPG work.

## Done When

- `node scripts/validate-privacy-shield-preview-cli.mjs` fails before the preview command exists, then passes after implementation.
- `npm run privacy:shield:preview -- --sample` prints a sanitized local preview and never prints raw secret sample values.
- `npm run privacy:shield:preview -- --check` proves credential, internal-host, protected-path, and sensitive-evidence detection.
- `npm run privacy:shield:check` passes.
- `npm run verify` includes the privacy shield check.
