# Office 3D Parity Migration

## Goal
Promote HQ Prime 3D to the only office renderer by migrating remaining 2D-only behavior and visual cues, then removing legacy 2D components.

## Scope
- Keep current 3D environment, movement, and edit-mode behavior.
- Add parity for remaining 2D runtime signals in 3D:
  - dispatch travel indicator
  - live server-rack status behavior
  - live memory/fuel saturation indicator
  - live trash saturation indicator
- Remove renderer toggle and all `2d` office rendering paths.
- Delete legacy 2D office components once unused.

## Acceptance Criteria
- Home HQ runs only in 3D with no 2D toggle UI.
- No runtime imports of `OfficeRoom`, `DispatchBar`, `LLMFuelGauge`, `TrashCan`, or `ServerRackLive`.
- TypeScript passes with `npx tsc --noEmit`.
- Documentation reflects 3D-only office architecture.
