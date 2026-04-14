# Repo Idea Audit Batch 3 — Playbooks exact working sessions

## Why

The previous repo-idea audit batches made `System Design`, `Surfaces`, and VAULT stewardship actionable, but `Playbooks` still stopped one level too early.

Playbook cards could open the right route, yet they still dropped the operator at broad route tops like `/hq` instead of the exact working block that mattered next.

That leaves one of the heaviest guidance consoles informative, but not fully operational.

## Scope

In scope:

- Extend HQ with focused-session landing for exact working blocks
- Extend the scheduler drawer with its own exact focus targets
- Retarget the strongest playbook follow-on actions to those exact sessions
- Refresh task tracking and handoff trail

Out of scope:

- Reworking every playbook action across the whole app
- Adding new server routes or persistence
- Changing the free-first/local-first runtime model

## Implementation plan

1. Add HQ `focus` handling for strategium, console shell, chronicle, and scheduler sessions
2. Add exact section focus handling inside the scheduler drawer
3. Retarget the strongest playbook jump-offs to the new HQ and scheduler focus URLs
4. Refresh task tracking and handoff docs
5. Re-run verification and live route checks

## Done when

- Playbooks can open exact HQ or scheduler working sessions instead of only broad route tops
- HQ explains the focused session and auto-opens the scheduler only when that was the requested destination
- The scheduler drawer can land directly on composer, governance, or jobs
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass
- Live `127.0.0.1:3000` checks succeed on `/resources?view=playbooks`, `/hq?focus=hq-chronicle`, `/hq?focus=hq-console-shell`, and `/hq?focus=hq-scheduler-governance`
