# TypeScript ESLint Parser Alignment

## Status

Complete.

## One-sentence outcome

TypeScript linting uses the parser version owned by the installed Next.js ESLint preset instead of a redundant older root override that can fall outside the active TypeScript compatibility range.

## Confirmed symptom and root cause

- The pushed verification output exposed an `@typescript-eslint/typescript-estree` compatibility warning for TypeScript 5.9.3.
- The warning is not emitted on every current lint invocation, but `eslint --print-config app/layout.tsx` and `eslint --debug` prove the effective parser is still the root `@typescript-eslint/parser@7.18.0`.
- `eslint-config-next@15.5.15` already installs and configures `@typescript-eslint/parser@8.58.2`, whose local TypeScript peer range includes 5.9.3.
- Root `package.json` directly declares parser 7 and `.eslintrc.json` re-applies it after `next/core-web-vitals`, overriding the newer parser without adding a rule or parser option Nexus needs.
- The canonical toolchain validator currently requires that redundant override, so the stale configuration is protected instead of rejected.

## Required behavior

1. Keep `next/core-web-vitals`, Prettier, Tailwind linting, the active source scope, and zero-warning enforcement unchanged.
2. Remove the root `@typescript-eslint/parser` declaration and its lockfile ownership; do not add a replacement direct parser dependency.
3. Remove only the redundant `.eslintrc.json` TypeScript parser override so `eslint-config-next` owns TypeScript parsing and its matching plugin/parser pair.
4. Preserve all existing lint rules, settings, scripts, and TypeScript compiler behavior.
5. Make `npm run toolchain:check` fail if a direct parser dependency or root parser override returns.
6. Make the focused check prove the lockfile carries an ESLint-config-next parser compatible with the installed TypeScript version and the resolved ESLint config uses that Next-owned parser.
7. Perform the dependency metadata update without network access, lifecycle scripts, broad package upgrades, or unrelated lockfile churn.
8. Keep every change outside the private RPG paths.

## Verification contract

- Capture the pre-fix dependency graph and effective parser path/version.
- Run the updated toolchain check plus `npm ls` and `eslint --print-config` proof.
- Run `npm run lint` with zero warnings, `npx tsc --noEmit`, dependency/security gates, canonical `npm run verify`, and the production build.
- Run formatting, publication safety, handoff, diff, staged-file, and zero-RPG-path checks.

## Benefits

- Removes the compatibility-warning condition visible in the pushed verification output.
- Eliminates a duplicate parser installation and lets Next keep its parser/plugin versions matched.
- Reduces future TypeScript upgrade friction and prevents the stale pin from returning unnoticed.
- Keeps lint coverage and application runtime behavior unchanged.

## Out of scope

- Migrating from legacy `.eslintrc` to ESLint flat config.
- Upgrading ESLint, Next.js, TypeScript, Tailwind, or unrelated dependencies.
- Changing lint rules, warning policy, active-source scope, or application code.
- Any RPG route, component, library, documentation, asset, test, or validator change.

## Completion evidence

- The lockfile-only graph contains one `@typescript-eslint/parser@8.58.2` line owned by `eslint-config-next`, paired with `@typescript-eslint/eslint-plugin@8.58.2`; the direct parser 7 tree and twelve parser-only transitive packages are gone.
- Before/after `ESLint.calculateConfigForFile()` comparison proves all 238 rules and settings are identical while the effective parser moves from root 7.18.0 to the Next-owned 8.58.2 path.
- The canonical toolchain gate resolves the real ESLint config, reads the effective parser manifest, proves the parser/plugin versions match, and proves its peer range accepts locked TypeScript 5.9.3.
- Focused toolchain, lint, TypeScript, dependency-risk, dependency-security, infrastructure, SBOM, publication, and security gates passed; canonical verification passed in 173.9 seconds and the production build passed in 62.9 seconds.
