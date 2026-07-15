# Whole-App Design Contract Closure

## One-sentence contract

Every active semantic color in `DESIGN.md` must be represented by an honest component recipe, and the normal verification lane must reject any design-linter warning instead of allowing a documented design-system promise to drift.

## Surface and scope

- The `DESIGN.md` frontmatter is the palette and component-recipe source of truth.
- Recipes cover the existing shell hierarchy, dividers, focus markers, secondary actions, quiet labels, and operational telemetry states.
- `scripts/validate-design-taste-contract.mjs` is the focused zero-warning gate.
- `package.json` routes the focused gate through `design:check`, which already runs first under `npm run verify`.
- No runtime color value, generated CSS variable, route, component implementation, provider, state, dependency, or private RPG surface changes.

## Visual, content, and interaction thesis

- **Visual:** document the existing dark Satellite Ops hierarchy without changing rendered output: base, raised, and telemetry surfaces remain visually identical.
- **Content:** name recipes by the operator role they already serve—raised panel, separator, focus marker, secondary action, quiet label, and status telemetry.
- **Interaction:** distinguish focus, live, warning, success, critical, standby, and neutral readout semantics in the contract while preserving current controls and behavior.

## Implementation

1. Add supported `design.md` component recipes that reference every currently unreferenced semantic color without inventing unsupported border or state properties.
2. Parse the linter's JSON result in the focused taste validator and reject any error or warning with a useful summary.
3. Restore the named `design:taste:check` command and make `design:check` compose generated-output freshness with the focused taste gate.
4. Correct the Wave 7 plan so it points at the current verification chain rather than removed historical wave aliases.

## Acceptance criteria

- `npm run design:lint` reports `0` errors and `0` warnings while retaining all 19 semantic colors.
- Every added recipe uses only properties supported by the installed `@google/design.md` schema.
- `npm run design:taste:check` fails on any future linter warning or error.
- `npm run design:check` proves generated-output freshness and the focused taste contract; `npm run verify` still invokes `design:check` first.
- `app/design-md.generated.css` and `lib/generated/designMdRuntime.ts` do not drift because recipe metadata does not alter runtime tokens.
- `npm run design:check`, `npx tsc --noEmit`, `npm run verify`, `npm run build`, handoff checks, and `git diff --check` pass.

## Benefits

- Palette intent becomes machine-readable instead of living partly in prose and runtime CSS.
- Future semantic-token additions cannot silently ship as undocumented or unused design-contract entries.
- The repository's Wave 7 zero-warning promise becomes current executable proof rather than stale documentation.
- Operators retain the same visual interface while maintainers gain a clearer, safer vocabulary for whole-app polish.
