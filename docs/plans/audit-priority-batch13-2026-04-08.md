# Audit Priority Batch 13 — scheduler governance split + HQ shell controls hook

Date: 2026-04-08
Owner: Codex

## Why this batch

After the AP11/AP12 splits, two follow-on hotspots remain:

- `components/ui/CronSchedulerGovernanceSection.tsx` still carries posture, audit actions, saved-view management, import preview, and filter controls in one component.
- `components/home/office/OfficeCommandCenter.tsx` still owns the shell keyboard/split-resize control behavior inline even though the shell UI already moved into its own section component.

Both are good next seams because they reduce complexity without changing product behavior.

## Goals

1. Split scheduler governance into smaller subsections:
   - posture + audit actions
   - saved views + import/paste flow
   - audit filters
2. Move HQ shell keyboard/splitter behavior into a dedicated hook.
3. Keep guidance compact and local-only.
4. Re-verify code gates and live browser reachability.

## Constraints

- No runtime/provider behavior changes.
- No new backend state.
- Keep free-first/local-first defaults unchanged.
- Keep the live site running while verifying.

## Expected outcome

- Smaller scheduler governance component with clearer responsibilities.
- Smaller `OfficeCommandCenter.tsx` with shell-control behavior isolated.
- Easier next splits on remaining HQ send/meta logic and any heavy VAULT panels.
