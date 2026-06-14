# WINDOWS-OPTIMIZATION-ADVISOR

## Goal

Adapt the useful safety and decision patterns from optimizerDuck into Nexus without copying GPL code or giving the web application administrator-level system mutation powers.

## Useful Scope

- Collect a read-only, sanitized Windows posture snapshot.
- Report only aggregate CPU, memory, disk-pressure, uptime, startup-entry, service-state, and scheduled-task counts.
- Build risk-rated recommendations from measured posture rather than applying generic optimization folklore.
- Require explicit operator selection, a restore point, a rollback plan, and before/after measurement before any external system change.
- Expose the sanitized advisor through a protected local-only API and a local CLI.
- Degrade honestly on macOS, Linux, iPad, or unavailable PowerShell.

## Guardrails

- Do not mutate the registry, services, scheduled tasks, startup entries, power plans, apps, files, Windows features, or security settings.
- Do not request elevation or administrator privileges.
- Do not install, download, launch, or control optimizerDuck.
- Do not expose process names, service names, task names, startup commands, paths, drive labels, serial numbers, usernames, or secrets.
- Do not copy GPL-3.0 optimizerDuck source into the MIT Nexus runtime.
- Do not claim a recommendation improves performance until before/after measurements prove it.
- Do not add a new top-level tab or touch RPG work.

## Acceptance

- `lib/windowsOptimizationAdvisor.ts` normalizes sanitized snapshots and produces bounded, risk-rated recommendations.
- `lib/windowsOptimizationAdvisorServer.ts` invokes only the fixed read-only collector with no user-supplied command input.
- `scripts/windows-optimization-snapshot.ps1` collects aggregates only and contains no mutating PowerShell operations.
- Protected local-only `GET /api/windows-optimization-advisor` returns the advisor.
- `npm run windows:optimization:advisor` prints the same sanitized local report.
- A source-parity matrix accounts for optimizerDuck capabilities and explicit exclusions.
- `npm run windows:optimization:check`, `npm run source:parity:check`, `npm run type-check`, and `npm run verify` pass.
