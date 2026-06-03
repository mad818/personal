# Dependabot Next Runtime Patch Helper

## Goal

Make the next actionable Dependabot runtime patch obvious without opening the sanitized audit JSON by hand.

## Scope

- Add `npm run dependabot:next-runtime-patch` to read the latest `docs/metrics/dependabot-security-audit-*.json` artifact.
- Skip direct npm runtime alerts that the current `package-lock.json` already satisfies.
- Print the next direct npm runtime package, current lock version, first patched version, normal PowerShell install command, and proof commands.
- Add `npm run dependabot:next-runtime-patch:check` so the helper stays covered by the existing Dependabot audit validator.

## Guardrails

- No package upgrades are performed by the helper.
- No `npm audit fix --force`.
- No archive package updates.
- No Cargo updates.
- No GitHub writes, alert dismissals, auth-token reads, raw Dependabot export commits, UI/product changes, public route changes, or provider changes.

## Acceptance

- The command identifies `postcss` alert 85 as the current next direct npm runtime patch while the lock remains on `8.4.39`.
- The command prints the patched floor `8.5.10` and the narrow install command.
- The check command exits successfully without network access.
