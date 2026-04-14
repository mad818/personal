# Audit Priority Batch 14 — HQ meta-command extraction

Date: 2026-04-08
Owner: Codex

## Why this batch

`components/home/office/OfficeCommandCenter.tsx` is smaller after the last several splits, but the `send()` callback still carries one bulky special-case path inline:

- the `/meta` JANSKY command still owns learning fetch, prompt assembly, AI call, proposal parsing, and pending-edit shaping inside the main HQ send loop

That path is a good next seam because it is behaviorally self-contained and does not need to stay mixed with routing, dispatch, and normal agent execution.

## Goals

1. Extract the `/meta` analysis flow into a dedicated helper module.
2. Keep UI state ownership in `OfficeCommandCenter.tsx` so the split stays low-risk.
3. Preserve existing `/meta` behavior:
   - no-learnings fallback
   - queued pending-edit behavior
   - plain-text fallback when the AI response is not patch-shaped
4. Re-verify code gates and live browser reachability on `127.0.0.1:3000`.

## Constraints

- No provider/runtime behavior changes.
- No new backend state or routes.
- Keep free-first/local-first defaults unchanged.
- Keep the live site running while verifying.

## Expected outcome

- Smaller `send()` logic in `OfficeCommandCenter.tsx`.
- A dedicated HQ helper module for future `/meta` prompt/parse changes.
- Cleaner next seam for continuing the HQ decomposition after this batch.
