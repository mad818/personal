# Dependency Hardening Runbook

Use this runbook after the metadata-only Dependabot audit identifies concrete package names and patched ranges. Keep this separate from phone/PWA acceptance and release evidence unless a dependency blocks verification.

## Guardrails

- Do not commit token values, cookies, auth headers, private LAN IPs, local home paths, receipt/payment/account data, or raw asset intake.
- Do not run a broad package upgrade sweep before classifying the alerts.
- Patch one minimal dependency batch at a time.
- Prefer runtime-critical alerts first, then dev-only alerts that affect verification, then transitive alerts by parent package.
- Keep package upgrades separate from unrelated UI or product work.

## Upgrade Order

1. Run `npm run dependency:risk:posture`.
2. Run `npm run dependabot:audit:classify`.
3. Open GitHub Dependabot metadata in a network-enabled session.
4. Classify each alert as runtime-critical, dev-only, transitive, or blocked/deferred.
5. Pick the smallest runtime-critical batch with a known patched range.
6. Apply that package update only.
7. Run `npm run dependency:risk:posture`.
8. Run `npm run verify`.
9. Run `npm run publication:safety:check`.
10. Commit only that batch if all gates pass.

## Rollback

Check state first:

```powershell
npm run git:safe -- status --short --branch
```

If an upgrade fails before commit, restore only the package files touched by that upgrade from the working tree using the editor or a reviewed patch. Do not use destructive reset commands unless explicitly approved.

If an upgrade has already been committed and must be backed out, create a normal revert commit:

```powershell
npm run git:safe -- revert <commit-sha>
npm run verify
```

## Evidence

Record sanitized evidence only:

- `docs/metrics/dependency-risk-posture-*.json`
- `docs/metrics/dependabot-security-audit-*.json`
- `docs/metrics/infra-hardening-*.json`

Never paste Dependabot alert pages containing account details, private org data, or auth state into committed files.
