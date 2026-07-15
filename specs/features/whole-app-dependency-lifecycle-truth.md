# Whole-App Dependency Lifecycle Truth

## One-sentence contract

Dependency posture must report and gate the packages that can execute consumer install hooks, while keeping publisher-only lifecycle metadata visible as context without mislabeling it as install risk.

## Source of truth

- npm documents `package-lock.json.hasInstallScript` as the flag for `preinstall`, `install`, or `postinstall`: <https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/>.
- npm documents `prepare` as install-time for non-registry dependencies and `prepublishOnly` as publishing-only: <https://docs.npmjs.com/cli/v11/using-npm/scripts/>.
- The committed `package-lock.json` is authoritative for exact package path, version, integrity, optional/dev posture, and platform constraints.
- Installed package metadata may supplement the lockfile with the actual consumer hook names available on the current platform.

## Surface and scope

- `scripts/dependency-risk-posture.mjs` classifies lockfile-backed consumer install hooks and publisher-only metadata separately.
- `docs/security/dependency-lifecycle-review.json` records exact reviewed package paths, versions, expected hook posture, provenance, and rationale.
- Existing `lifecycleScriptPackages` and `lifecycleScriptPackageCount` artifact fields remain available for downstream readers, but now mean consumer install-hook packages rather than all lifecycle metadata.
- The latest dependency posture artifact and canonical project records are refreshed.
- No dependency version, lockfile resolution, install policy, runtime code, route, provider, UI, or private RPG surface changes.

## Security and compatibility thesis

- **Security:** any new, changed, unreviewed, integrity-less, or stale consumer install-hook package must make the check fail with an exact path and reason.
- **Truth:** `prepare`, `prepublish`, `prepublishOnly`, `prepack`, and `postpack` found in registry package metadata remain counted as publisher-only context unless the lockfile marks a consumer install script.
- **Compatibility:** downstream readiness code keeps reading the existing lifecycle count field while receiving a corrected count and richer review detail.

## Implementation

1. Split consumer install-hook names from publisher/package-author lifecycle names and add deterministic classifier fixtures.
2. Inventory consumer packages from `hasInstallScript` plus installed `preinstall`/`install`/`postinstall` metadata.
3. Match every observed package to an exact reviewed path/version record and reject unreviewed, mismatched, stale, or integrity-less entries.
4. Emit consumer-hook, publisher-only, and review summaries; make unresolved warnings fail the check and set `riskReady` false.
5. Generate a fresh sanitized posture artifact and update canonical references without rewriting historical metrics.

## Acceptance criteria

- The current lockfile resolves exactly four reviewed consumer install-hook packages: two optional Darwin `fsevents` entries, optional Next runtime `sharp`, and dev-only `unrs-resolver` through the ESLint resolver chain.
- Publisher-only metadata is counted separately and never appears in `lifecycleScriptPackages`.
- `npm run dependency:risk:check` reports zero warnings, zero blockers, and review coverage for every consumer package.
- A missing review, version mismatch, unexpected hook, stale review entry, or missing registry integrity fails deterministically.
- `npm run dependency:risk:posture` writes a new sanitized artifact with `riskReady: true`, corrected lifecycle count, and review summary.
- `npm run dependency:security:check`, `npm run validate:infra-hardening`, `npx tsc --noEmit`, `npm run verify`, `npm run build`, handoff checks, and `git diff --check` pass.

## Benefits

- Security output becomes accurate and actionable instead of presenting hundreds of false install-risk candidates.
- Exact package/version review survives offline operation and fails closed when the lockfile changes.
- Real native/optional install hooks remain visible with their dependency role and platform posture.
- The verification lane becomes warning-free without suppressing or downgrading actual dependency execution risk.
