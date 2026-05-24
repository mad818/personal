# Dependabot Alert Import Triage

## Goal

Make `npm run dependabot:audit:classify` useful even when Codex cannot reach GitHub. The command should accept an exported GitHub Dependabot alerts JSON file, classify alerts into runtime impact, dev-only impact, transitive ownership, and blocked/deferred work, then write a sanitized artifact under `docs/metrics/`.

## Operator Flow

1. From a network-enabled normal PowerShell session, export open Dependabot alerts:

   ```powershell
   gh api -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2026-03-10" "/repos/mad818/personal/dependabot/alerts?state=open&per_page=100" > docs\metrics\dependabot-alerts-source.json
   ```

2. Run the local classifier:

   ```powershell
   npm run dependabot:audit:classify -- --alerts=docs\metrics\dependabot-alerts-source.json
   ```

3. Review the sanitized `docs/metrics/dependabot-security-audit-*.json` artifact before any package upgrade batch.

## Classification Rules

- Runtime impact: dependency scope is `runtime`, the package is a direct runtime dependency, or the lockfile marks the package as non-dev.
- Dev-only impact: dependency scope is `development`, the package is a direct dev dependency, or the lockfile marks the package as dev-only.
- Transitive ownership: the package is not declared directly in `package.json`.
- Blocked/deferred: alert metadata is incomplete, no patched version is published, the package is absent from the local lockfile, or the ecosystem is not npm.

These buckets may overlap; impact and ownership are different review axes.

## Guardrails

- Do not upgrade packages in this pass.
- Do not call GitHub, dismiss alerts, or write GitHub state.
- Do not read tokens, `.env.local`, GitHub CLI config, cookies, or raw auth headers.
- Do not commit raw GitHub alert exports unless Mario explicitly asks.
- Do not change public routes, provider routing, auth boundaries, or ARPG code.

## Verification

- `node scripts/validate-dependabot-security-audit.mjs`
- `npm run dependabot:audit:check`
- `npm run dependabot:audit:classify -- --dry-run --alerts=scripts/fixtures/dependabot-alerts-sample.json`
- `npm run validate:infra-hardening`
- `npm run verify`
