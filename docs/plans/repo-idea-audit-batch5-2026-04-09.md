# Repo Idea Audit Batch 5 — exact-session Resources audits

## Why

Playbooks now clearly distinguish exact repair sessions from broader route links, but the other Resources guidance consoles were still one step behind.

The remaining gap was consistency:

- `System Design` still had a couple of broad HQ and scheduler actions that should open the real repair panel
- `System Design` and `Surfaces` did not visually tell the operator whether a link was an exact repair session or just a broader route landing
- HQ itself already had the focused-session contract, but the audit consoles were not using it fully

That made Resources informative, but not yet as sharp or consistent as the newer Playbooks flow.

## Scope

In scope:

- Retarget the broadest HQ and scheduler remediation links in `System Design` and `Surfaces` to existing focused-session URLs
- Add visible `Exact panel` versus `Route` cues in the remaining guidance-heavy Resources consoles
- Reuse a shared exact-session helper instead of duplicating link heuristics
- Refresh plan, task tracking, and handoff

Out of scope:

- Adding new route shells or new focused-session destinations
- Reworking every Resources console in one pass
- Changing the core focused-session behavior of HQ, COMMAND, VAULT, or RECON

## Implementation plan

1. Audit the current `System Design` and `Surfaces` actions against the existing focus contracts
2. Retarget the broadest HQ and scheduler links to the real focused repair panels
3. Add shared exact-session link detection and use it to label the remaining Resources consoles
4. Refresh task tracking and handoff docs
5. Re-run verification and live route checks

## Done when

- `System Design` and `Surfaces` use deeper exact-panel links where the target session already exists
- Both consoles visually distinguish exact repair sessions from broader route links
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass
- Live `127.0.0.1:3000` checks succeed on `/resources?view=system`, `/resources?view=surfaces`, `/hq?focus=hq-chronicle`, and `/hq?focus=hq-scheduler-governance`
