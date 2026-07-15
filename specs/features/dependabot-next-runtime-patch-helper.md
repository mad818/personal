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

- When an imported direct npm runtime alert has an unsatisfied patched floor, the command prints the package, current lock version, patched floor, narrow install command, and proof commands.
- When every imported direct-package floor is already satisfied locally, the command reports that no direct runtime target is actionable and requires fresh remote evidence before naming another package.
- The check command exits successfully without network access.
