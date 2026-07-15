# Whole-App Format Contract Closure

> Correction (2026-07-15): the historical glob in this tranche omitted `/` after the brace group and resolved only 272 files, not the declared source tree. `WHOLE-APP-FORMAT-COVERAGE-TRUTH` and `specs/features/whole-app-format-coverage-truth.md` supersede the coverage claim with a corrected 672-file non-RPG scope and complete baseline.

## One-sentence contract

Every file in the declared active-source Prettier scope must match the canonical formatter, and that check must run inside the same verifier used by the trustworthy full audit.

## Exact defect

- `npm run verify` and the new truthful `npm run audit:full` pass, but `npm run verify:full` fails because `npm run format:check` reports 197 active-source files.
- The drift is concentrated in `app/layout.tsx` plus 196 `lib/*.ts` files; the active `components/` scope is already clean.
- No Prettier config or ignore file changes the repository's declared default policy.
- The canonical verifier does not currently run `format:check`, so formatting debt can return while normal verification stays green.

## Surface and scope

- Run Prettier's AST `--debug-check` over the exact existing `{app,lib,components}**/*.{ts,tsx,mdx}` scope before writing.
- Apply the canonical formatter only to that active-source glob.
- Add `npm run format:check` to `npm run verify`; make `verify:full` a compatibility alias for the now-complete canonical verifier.
- Extend `scripts/validate-toolchain-cleanliness.mjs` to protect formatter scope, cache use, canonical verify wiring, and the compatibility alias.
- Record the mechanical tranche in `tasks/todo.md`, `tasks/lessons.md`, and `docs/SYSTEM_STATE.md`.
- Do not format scripts, docs, specs, JSON, generated output, packaged-runtime snapshots, assets, private live-vault data, or archived code through this tranche.

## Safety and compatibility thesis

- **Semantic safety:** Prettier's AST debug check must pass before any bulk write; TypeScript, lint, full verification, and production build must pass afterward.
- **Scope safety:** use the existing active-source glob unchanged rather than widening into generated, archive, script, store, or desktop snapshot paths.
- **Runtime compatibility:** formatting is mechanical; no imports, exports, literals, control flow, schemas, dependency versions, routes, providers, state, or UI intent may change.
- **Private lane:** active private-RPG modules under `lib/` may receive only canonical whitespace/layout changes; no game content or behavior changes.

## Implementation

1. Inventory the exact failing files and pass Prettier AST debug-check over the existing scope.
2. Apply the canonical formatter to the declared active sources and prove `format:check` is clean.
3. Wire formatting into canonical verification and protect the command contract.
4. Run explicit type-check, lint, truthful full audit, production build, handoff, diff, commit, and push-attempt proof.

## Acceptance criteria

- Prettier AST debug-check passes before formatting writes.
- The 197-file baseline is formatted without any file outside the declared active-source glob changing mechanically.
- `npm run format:check` reports every matched file clean.
- `npm run verify` includes `format:check`, and `npm run verify:full` delegates to that single canonical verifier.
- `npm run toolchain:check`, `npx tsc --noEmit`, `npm run lint`, `npm run audit:full`, `npm run build`, handoff checks, and `git diff --check` pass.

## Benefits

- The strongest project verification command becomes actually green instead of carrying 197 known failures.
- The trustworthy full audit covers formatting drift automatically.
- Future active-source edits receive one deterministic layout, reducing noisy reviews and merge conflicts.
- The closure strengthens quality without changing runtime behavior or widening project scope.
