# Windows Optimization Advisor

The Windows Optimization Advisor adapts optimizerDuck's strongest safety ideas into Nexus while keeping optimizerDuck external and keeping Nexus read-only.

## What Nexus Does

- Collects aggregate Windows CPU, memory, disk-pressure, uptime, startup-entry, service-state, and scheduled-task counts.
- Returns no process names, service names, task names, startup commands, paths, labels, serial numbers, usernames, registry values, or secrets.
- Produces risk-rated recommendations from measured pressure.
- Requires a before-change baseline, verified restore point, documented rollback plan, explicit operator selection, and after-change measurement.
- Exposes the sanitized result through protected local-only `GET /api/windows-optimization-advisor`.
- Degrades to an unsupported/read-only summary on macOS, Linux, or iPad.

## What Nexus Does Not Do

Nexus does not request administrator privileges, create restore points, modify the registry, change services, run or change scheduled tasks, disable startup entries, delete files, remove apps, change Windows features, select power plans, or launch optimizerDuck.

The optimizerDuck runtime remains a separate GPL-3.0 Windows application. If you choose to use it, inspect its source and recommendations independently, create a restore point, apply one reviewed change at a time, and compare measured before/after results.

## Commands

Human-readable local report:

```powershell
npm run windows:optimization:advisor
```

Sanitized JSON report:

```powershell
npm run windows:optimization:advisor -- --json
```

Static and behavioral checks:

```powershell
npm run windows:optimization:check
```

The collector is `scripts/windows-optimization-snapshot.ps1`. It performs read-only aggregate queries and prints JSON to stdout. It writes no artifact and makes no system change.
