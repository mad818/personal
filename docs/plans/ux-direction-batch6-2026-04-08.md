# UX Direction Batch 6 — Result Density Cleanup

Date: 2026-04-08
Owner: Codex

## Why this batch

The continuity work is now strong enough that some result surfaces can stop over-explaining themselves.

Two places still carry too much always-visible text:

1. Scheduler job cards, where long prompts and repeated status prose make the drawer feel denser than it needs to.
2. Compiled-memory page cards, where summary, preview, research notes, document metadata, badges, and actions all compete before the operator even expands the page.

## Goal

Reduce visible text pressure while preserving:

- the continuation chips
- the operator’s immediate understanding of status
- the ability to expand into full detail when needed

## Approach

1. Scheduler cards:
   - show a shorter mission brief in the default card state
   - keep schedule/status/efficiency visible
   - let the drawer rely on recent runs and audit details for the longer explanation
2. Compiled pages:
   - keep title, summary, action path, and compact metadata visible
   - move the more verbose content preview posture behind the existing page expansion path
   - preserve withheld-content safety rules

## Constraints

- Improve, do not remove.
- Keep the control surfaces compact and legible.
- Do not hide critical status or safety posture.
- Preserve free-first and local-first behavior.

## Success criteria

- Scheduler cards scan faster.
- Compiled-memory cards feel more like actionable records and less like stacked text blocks.
- The action path remains obvious before expansion.
- Verification and live route checks stay green.
