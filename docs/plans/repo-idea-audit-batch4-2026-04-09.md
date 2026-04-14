# Repo Idea Audit Batch 4 — deeper Playbook repair sessions

## Why

Playbooks already opened the right routes and, after the last batch, the right HQ and scheduler sessions.

The remaining gap was depth:

- some Playbook actions still stopped at broad route-level destinations
- the console itself did not clearly distinguish exact repair sessions from broader analysis links

That makes the workflow usable, but not yet as sharp as the rest of the audit-to-repair pattern.

## Scope

In scope:

- Retarget the strongest Playbook follow-on actions to deeper exact-session links in COMMAND, VAULT, and RECON
- Make exact-session actions visually distinct inside the Playbooks console
- Refresh task tracking and handoff

Out of scope:

- Adding new route shells
- Building a new navigation system for Playbooks
- Reworking every Resources console in one pass

## Implementation plan

1. Audit the current Playbook jump-offs against the existing focus contracts in COMMAND, VAULT, and RECON
2. Replace the broadest route-level actions with deeper exact-session links where the target panel already exists
3. Make exact-session actions visually obvious inside Playbooks
4. Refresh task tracking and handoff docs
5. Re-run verification and live route checks

## Done when

- The strongest Playbook actions land on exact working panels in COMMAND, VAULT, and RECON
- Playbooks visually distinguishes exact repair sessions from broader route links
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass
- Live `127.0.0.1:3000` checks succeed on `/resources?view=playbooks`, `/command?focus=runtime-efficiency`, `/vault?focus=vault-stewardship`, `/vault?focus=vault-compiled-pages`, and `/recon?view=headers&focus=recon-headers`
