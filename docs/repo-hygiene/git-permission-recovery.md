# Git Permission Recovery

This runbook is for the Windows `.git` blocker where `git pull`, `git fetch`,
staging, or push fail before Git can create `FETCH_HEAD`, `HEAD.lock`, or
`gc.pid.lock`.

Current root cause seen in this checkout:

- `.git` has an explicit `DENY` access-control entry.
- `DENY` overrides later `FullControl` allows for Mario and Codex sandbox
  groups.
- Git may leave active helper processes while it retries maintenance.
- `npm run git:safe -- <git args>` is the repo's Windows-safe wrapper for this
  blocker; it removes the known explicit `.git` DENY ACL in the same process
  before running Git. `npm run handoff:pull` uses this wrapper.

Do not delete branches, remove worktrees, or push while this blocker is active.

## 1. Inspect

Run from a normal PowerShell in the repo root:

```powershell
cd <repo-root>
npm run repo:sync:health
icacls .git | Select-String "DENY"
Get-Process git -ErrorAction SilentlyContinue
```

If `DENY` appears, that is the blocker. If Git processes appear, close the app
or terminal that owns them before lock cleanup.

## 2. Repair ACLs

Use the SID printed by `icacls .git | Select-String "DENY"`. The SID below is
the one observed on this machine during the blocker audit.

```powershell
cd <repo-root>
$denySid = "S-1-5-21-779443000-71960511-1366699174-2556294504"
$currentUser = "$env:USERDOMAIN\$env:USERNAME"
icacls .git /inheritance:e
takeown /F .git /R /D Y
icacls .git /remove:d $denySid /T /C
icacls .git /grant "${currentUser}:(OI)(CI)F" /T /C
icacls .git /grant "Mario\CodexSandboxUsers:(OI)(CI)F" /T /C
icacls .git /grant "Mario\CodexSandboxOffline:(OI)(CI)F" /T /C
```

If `takeown` says elevation is required, reopen PowerShell as Administrator,
run only this repair block, then return to a normal user shell for day-to-day
work.

## 3. Clean Locks Only When Safe

Only remove lock files if `Get-Process git` returns nothing.

```powershell
cd <repo-root>
Get-Process git -ErrorAction SilentlyContinue
Remove-Item .git\HEAD.lock,.git\gc.pid.lock,.git\index.lock -Force -ErrorAction SilentlyContinue
```

If Git processes are still listed, close them first. Removing locks while a Git
process is active can corrupt repository state.

## 4. Prove Recovery

```powershell
cd <repo-root>
npm run repo:sync:health
npm run handoff:pull
npm run git:safe -- fetch --all --prune
npm run git:safe -- status --short --branch
npm run handoff:write
npm run handoff:check
```

Success means:

- the health check shows no `DENY` entries,
- `handoff:pull` runs without permission errors,
- fetch/prune works,
- status can be read normally,
- handoff write/check converge.

## Still Blocked

If the blocker returns after repair:

- rerun `npm run repo:sync:health`,
- capture the new `DENY` SID lines,
- check whether another tool is applying deny ACLs to `.git`,
- avoid branch cleanup until the DENY source is known.
