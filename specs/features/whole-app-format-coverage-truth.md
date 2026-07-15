# Whole-App Format Coverage Truth

## One-sentence contract

The canonical format check must resolve the same complete non-RPG active-source set as the format writer, and every matched file must be safe under an idempotent Prettier pass before the verifier can claim format closure.

## Exact defect

- `format:write` uses `{app,lib,components}/**/*.{ts,tsx,mdx}` and resolves 707 files.
- `format:check` omits the slash after the brace group, uses `{app,lib,components}**/*.{ts,tsx,mdx}`, and resolves only 272 files.
- The toolchain validator protects the malformed literal, so both `npm run format:check` and `npm run verify` can pass while 435 declared active files are outside the check.
- A no-write check over the intended 707-file scope reports 250 drifting files.
- The updated project goal explicitly excludes RPG work. The direct RPG boundary contains 35 source files; seven formatter diffs under `components/home/arpg/` were reverted, and the durable non-RPG contract now covers the remaining 672 active files.

## Surface and scope

- Keep the declared active-source directories and extensions exactly `app`, `lib`, and `components` plus `ts`, `tsx`, and `mdx`, excluding `app/hq`, `components/home/arpg`, and `lib/arpg*`.
- Correct `format:check` to the same slash-delimited positive glob and fixed RPG exclusions used by `format:write`.
- Extend `scripts/validate-toolchain-cleanliness.mjs` to protect both commands, require identical extracted scopes, enumerate the expected active files independently, and reject missing or empty source directories.
- Make the DESIGN.md TypeScript generator emit canonical Prettier output so generated-file freshness and the active-source format contract can both pass from the same committed state.
- Run the complete no-write proof over the 672-file non-RPG scope, apply Prettier only there, and verify zero drift.
- Correct the earlier task/spec/system-state statements that described the malformed 272-file glob as complete.
- Do not touch RPG routes, components, libraries, docs, assets, tests, or runtime behavior; do not widen into hooks, store, tests, docs, specs, generated snapshots outside the already-declared `lib/generated/designMdRuntime.ts`, archives, assets, packaged runtime, or private live-vault data.

## Safety and compatibility thesis

- **Semantic safety:** no bulk write until the complete 672-file non-RPG Prettier debug check passes; TypeScript, lint, canonical verification, and production build must pass afterward.
- **Coverage truth:** the writer and checker must use the same exact glob, and the validator must derive the active-file inventory from the filesystem rather than trusting command text alone.
- **Runtime compatibility:** formatter output may change whitespace/layout only; no imports, exports, literals, control flow, schemas, dependencies, routes, providers, state, or UI intent may change.
- **RPG boundary:** no game source may remain modified, and formatter commands plus focused validation must preserve that exclusion.

## Implementation

1. Reproduce and record the resolved-scope mismatch and hidden drift.
2. Revert all direct RPG diffs and define the 672-file non-RPG boundary.
3. Align the write/check globs plus exclusions, strengthen the toolchain contract with an independently enumerated active-file inventory, and align the DESIGN.md TypeScript generator with canonical formatting.
4. Apply the formatter to the proven-safe non-RPG scope and confirm zero drift plus generated-output freshness.
5. Run focused checks, explicit type-check, lint, truthful full audit, production build, handoff, diff, commit, and push-attempt proof.

## Acceptance criteria

- The intended inventory contains every non-RPG `.ts`, `.tsx`, and `.mdx` file recursively under `app`, `lib`, and `components`, with each directory represented and all 35 direct RPG files excluded.
- `format:write` and `format:check` expose the same exact slash-delimited positive glob and RPG exclusions while retaining their respective `--write`/`--check` mode plus cache use.
- `npm run toolchain:check` rejects the original malformed check glob, missing RPG exclusions, and any future write/check scope mismatch.
- Prettier `--debug-check` passes over the complete 672-file non-RPG scope before the bulk write.
- Git diff inspection finds zero paths under `app/hq`, `components/home/arpg`, or `lib/arpg*`.
- `npm run design:check` and `npm run format:check` pass from the same working tree without regenerating or reformatting `lib/generated/designMdRuntime.ts`.
- `npm run format:check` reports every matched file clean after the baseline.
- `npx tsc --noEmit`, `npm run lint`, `npm run audit:full`, `npm run build`, handoff checks, and `git diff --check` pass.

## Benefits

- A green format and full-audit verdict covers the whole declared non-RPG application instead of a silent subset.
- Writer/checker parity prevents contributors from formatting files that CI never verifies.
- Independent inventory proof catches malformed glob semantics that literal string assertions can accidentally bless.
- The repair closes hidden non-RPG drift without changing product behavior or touching the RPG boundary.
