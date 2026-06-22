# git-sync-windows.ps1
# Silent startup sync — fetch, pull only on main, auto-commit/push when safe.
# Log: <repo-root>/git-sync.log  |  Disable: remove Startup/git-sync-windows.lnk
# NEXUS_SYNC_NO_COMMIT=1  |  NEXUS_SYNC_NO_PUSH=1

$ErrorActionPreference = "SilentlyContinue"

$repoRoot  = Resolve-Path (Join-Path $PSScriptRoot "..")
$logFile   = Join-Path $repoRoot "git-sync.log"
$aclScript = Join-Path $PSScriptRoot "git-with-acl-repair.ps1"

function Log {
    param([string]$msg)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] $msg"
    try { Add-Content -Path $logFile -Value $line -ErrorAction SilentlyContinue } catch {}
}

try {
    if ((Test-Path $logFile) -and (Get-Item $logFile).Length -gt 200KB) {
        Move-Item $logFile "$logFile.old" -Force -ErrorAction SilentlyContinue
    }
} catch {}

function Invoke-Git {
    param([string[]]$gitArgs)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    $out = & git -C $repoRoot @gitArgs 2>&1
    $ErrorActionPreference = $prev
    return $out
}

function Get-CommitCount {
    param([string]$range)
    $raw = (& git -C $repoRoot rev-list $range --count 2>&1) -join ""
    $n = 0
    [void][int]::TryParse($raw.Trim(), [ref]$n)
    return $n
}

function Test-SecretEnvFile {
    param([string]$Path)
    $name = Split-Path $Path -Leaf
    if ($name -eq ".env") { return $true }
    if ($name -like ".env.*" -and $name -ne ".env.example") { return $true }
    return $false
}

function Get-GitBlockedReason {
    $gitDir = Join-Path $repoRoot ".git"
    foreach ($marker in @(
            "rebase-merge", "rebase-apply", "MERGE_HEAD",
            "CHERRY_PICK_HEAD", "BISECT_LOG"
        )) {
        if (Test-Path (Join-Path $gitDir $marker)) {
            return "git $marker in progress"
        }
    }
    $statusLines = Invoke-Git @("status", "--porcelain")
    foreach ($line in $statusLines) {
        if ($line -match '^([A-Z?]{1,2}|UU|AA|DD|AU|UA|DU|UD) ') {
            $code = $line.Substring(0, 2)
            if ($code -match 'U|AA|DD') { return "unmerged files present" }
        }
    }
    return $null
}

function Get-CurrentBranch {
    $raw = (Invoke-Git @("branch", "--show-current") | Select-Object -First 1) -join ""
    return $raw.Trim()
}

# ── Main (always exit 0 — errors go to log only, never a popup) ───────────────
try {
    Log "=== Startup sync begin ==="

    if (-not (Test-Path (Join-Path $repoRoot ".git"))) {
        Log "Not a git repo — skipping."
        Log "=== Sync complete ==="
        exit 0
    }

    $blocked = Get-GitBlockedReason
    if ($blocked) {
        Log "Repo blocked ($blocked) — skipping pull/commit/push this boot."
        Log "=== Sync complete (deferred) ==="
        exit 0
    }

    if (Test-Path $aclScript) {
        $aclOut = & powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File $aclScript status --short 2>&1
        $aclMsg = ($aclOut | Where-Object { $_ -match "Removed" }) -join " "
        if ($aclMsg) { Log "ACL repair: $aclMsg" }
    }

    $fetchOut = Invoke-Git @("fetch", "origin", "main", "--quiet")
    if ($fetchOut) { Log "Fetch: $($fetchOut -join ' | ')" }

    $branch = Get-CurrentBranch
    if ($branch -ne "main") {
        Log "On branch '$branch' (not main) — fetch only; skipping pull/commit/push."
        Log "=== Sync complete ==="
        exit 0
    }

    $pullOut = Invoke-Git @("pull", "--rebase", "--autostash", "origin", "main")
    $pullStr = ($pullOut -join " | ").Trim()
    if ($pullStr) { Log "Pull: $pullStr" }

    $pullFailed = ($LASTEXITCODE -ne 0) -or ($pullStr -match "CONFLICT|error:|fatal:")
    if ($pullFailed) {
        Log "Pull/rebase issue — skipping commit/push. Resolve manually when convenient."
        Log "=== Sync complete (deferred) ==="
        exit 0
    }

    if ($env:NEXUS_SYNC_NO_COMMIT -ne "1") {
        $statusLines = Invoke-Git @("status", "--porcelain")
        $safeLines = $statusLines | Where-Object {
            $file = $_.Substring(3).Trim()
            -not (Test-SecretEnvFile $file)
        }

        if ($safeLines) {
            Log "Uncommitted changes ($($safeLines.Count) file(s)) — staging..."
            Invoke-Git @("add", ".") | Out-Null

            $envFiles = Invoke-Git @("diff", "--cached", "--name-only") |
                Where-Object { Test-SecretEnvFile $_ }
            foreach ($f in $envFiles) {
                Invoke-Git @("restore", "--staged", "--", $f) | Out-Null
                Log "Safety: unstaged $f"
            }

            $staged = Invoke-Git @("diff", "--cached", "--name-only")
            if ($staged) {
                $machine = $env:COMPUTERNAME
                $commitMsg = "sync: auto-commit $($env:USERNAME)@$machine $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
                $commitOut = Invoke-Git @("commit", "-m", $commitMsg)
                Log "Commit: $($commitOut -join ' | ')"
            } else {
                Log "Nothing safe to commit after filtering env files."
            }
        } else {
            Log "Working tree clean — no commit needed."
        }
    } else {
        Log "NEXUS_SYNC_NO_COMMIT=1 — skipping auto-commit."
    }

    if ($env:NEXUS_SYNC_NO_PUSH -ne "1") {
        $ahead  = Get-CommitCount "origin/main..HEAD"
        $behind = Get-CommitCount "HEAD..origin/main"

        if ($ahead -gt 0 -and $behind -gt 0) {
            Log "Branch diverged ($ahead ahead, $behind behind). Skipping push."
        } elseif ($ahead -gt 0) {
            Log "Pushing $ahead commit(s) to origin/main..."
            $pushOut = Invoke-Git @("push", "origin", "main")
            $pushStr = ($pushOut -join " | ").Trim()
            if ($pushStr) { Log "Push: $pushStr" }
            if ($LASTEXITCODE -eq 0) {
                Log "Push successful."
            } else {
                Log "Push failed (exit $LASTEXITCODE) — will retry next startup."
            }
        } else {
            Log "Already up-to-date with origin — nothing to push."
        }
    } else {
        Log "NEXUS_SYNC_NO_PUSH=1 — skipping push."
    }

    Log "=== Sync complete ==="
} catch {
    Log "ERROR (caught): $_"
    Log "=== Sync complete (deferred) ==="
}

exit 0
