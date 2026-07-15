# Whole-App Verification Signal Cleanup

## One-sentence contract

The normal Nexus verification lane must preserve dev dependencies and active Next.js lint coverage without emitting deprecated npm-config or `next lint` warnings that bury actionable failures.

## Surface and scope

- Root `.npmrc` keeps dev dependencies explicitly included even when a Windows machine sets `NODE_ENV=production` globally.
- Root `package.json` uses the ESLint CLI across the same active `app`, `components`, and `lib` directories covered by the current Next lint runner.
- `scripts/validate-toolchain-cleanliness.mjs` protects the npm and lint-runner contract under `npm run verify`.
- The existing `.eslintrc.json` remains authoritative for Next Core Web Vitals, Prettier, Tailwind, and TypeScript parsing.
- The tracked `desktop/packaged-runtime/` snapshot and archived code are not developer lint entry points and are not hand-edited in this tranche.

## Verification and scope thesis

- **Signal:** successful verification should be quiet enough that new warnings stand out instead of repeating the same deprecated config line for every npm subprocess.
- **Coverage:** preserve the proven active Next.js lint surface exactly; do not silently widen into archives, generated runtime snapshots, scripts, hooks, or store code under a deprecation migration.
- **Compatibility:** use npm's supported `include=dev` setting rather than the deprecated `production=false` alias while preserving the build-protection intent.

## Implementation

1. Replace the deprecated `.npmrc` alias with explicit dev inclusion and update its rationale.
2. Replace `next lint` and `next lint --fix` with direct ESLint CLI commands over `app`, `components`, and `lib`; reject warnings in the non-fixing lane.
3. Add a focused static validator that rejects the deprecated npm alias, deprecated Next runner, lost active directories, missing warning strictness, or missing core ESLint configuration.
4. Add the focused gate to `npm run verify`, update the correction lesson, and keep the packaged runtime snapshot untouched.

## Acceptance criteria

- `npm config get include` reports `dev` without the deprecated `production` warning.
- With `NODE_ENV=production`, npm still resolves the installed ESLint dev dependency under the explicit include policy.
- `npm run lint` passes with zero errors and zero warnings and emits neither the npm `production` warning nor the `next lint` deprecation notice.
- Direct ESLint `--fix-dry-run` exercises the same active directories without writing files.
- A whole-repository probe remains documented as intentionally broader and is not substituted for the existing active Next.js coverage.
- `npm run toolchain:check`, `npx tsc --noEmit`, `npm run verify`, `npm run build`, handoff checks, and `git diff --check` pass.

## Benefits

- Verification output becomes shorter and higher signal across dozens of nested npm scripts.
- Nexus is ready for the Next.js 16 removal of `next lint` without weakening its current lint rules.
- Windows machines keep the dev tools required for builds even when their global environment says production.
- Future configuration regressions fail through a focused, readable gate rather than resurfacing as a broken install or deprecated command later.
