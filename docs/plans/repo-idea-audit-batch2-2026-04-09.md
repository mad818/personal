# Repo Idea Audit Batch 2 — actionable Resources audits

## Why

The first repo-idea follow-through fixed VAULT stewardship by turning diagnosis into an exact repair view.

The same gap still existed in Resources:

- `System Design` could explain the right subsystem boundaries
- `Surfaces` could explain what to strengthen next
- neither lane consistently opened the exact working session that should follow

That makes the audits informative, but not yet fully operational.

This batch closes that gap by making the strongest findings launch the right local session directly.

## Scope

In scope:

- Add exact remediation actions to the shared system-design contract
- Add exact improvement actions to the shared surface-capabilities contract
- Render those actions in the Resources consoles
- Fix any stale or invalid remediation links uncovered by the audit
- Refresh the Resources route copy so it matches the new “audit -> repair session” behavior

Out of scope:

- Building a new admin route
- Adding server-side automation or mutation
- Reworking every route shell in one pass

## Implementation plan

1. Extend the system-design contract with actionable follow-on sessions
2. Extend the surface-capabilities contract with improvement launch points
3. Render both action sets in the Resources consoles
4. Fix any stale action links surfaced during the audit
5. Refresh task tracking, handoff, and route-level copy
6. Re-run verification and live route checks

## Done when

- `System Design` can launch exact repair sessions instead of only showing architecture context
- `Surfaces` can launch exact improvement sessions instead of only listing textual priorities
- Invalid remediation links found during the audit are corrected
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass
- Live `127.0.0.1:3000` checks succeed on `/resources`, `/resources?view=system`, `/resources?view=surfaces`, and representative new remediation URLs
