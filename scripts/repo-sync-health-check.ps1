[CmdletBinding()]
param(
  [switch]$Strict
)

$ErrorActionPreference = "Continue"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$gitDir = Join-Path $repoRoot ".git"

Write-Host "Repo sync health"
Write-Host "Repo: $repoRoot"

if (-not (Test-Path -LiteralPath $gitDir)) {
  Write-Host "status: blocked"
  Write-Host "reason: .git directory was not found"
  if ($Strict) { exit 1 }
  exit 0
}

$icaclsOutput = & icacls $gitDir 2>&1
$denyLines = @($icaclsOutput | Select-String -Pattern "\(DENY\)")
$lockFiles = @(
  Get-ChildItem -LiteralPath $gitDir -Force -Filter "*.lock" -ErrorAction SilentlyContinue
)
$gitProcesses = @(Get-Process git -ErrorAction SilentlyContinue)

$blocked = ($denyLines.Count -gt 0) -or ($lockFiles.Count -gt 0) -or ($gitProcesses.Count -gt 0)

if ($blocked) {
  Write-Host "status: blocked"
} else {
  Write-Host "status: ready"
}

Write-Host ""
Write-Host "DENY ACL entries:"
if ($denyLines.Count -gt 0) {
  $denyLines | ForEach-Object { Write-Host "  $($_.Line.Trim())" }
} else {
  Write-Host "  none detected"
}

Write-Host ""
Write-Host "Git lock files:"
if ($lockFiles.Count -gt 0) {
  $lockFiles | ForEach-Object { Write-Host "  $($_.FullName)" }
} else {
  Write-Host "  none detected"
}

Write-Host ""
Write-Host "Active git processes:"
if ($gitProcesses.Count -gt 0) {
  $gitProcesses | ForEach-Object { Write-Host "  pid=$($_.Id) name=$($_.ProcessName)" }
} else {
  Write-Host "  none detected"
}

Write-Host ""
if ($blocked) {
  Write-Host "Next safe steps:"
  Write-Host "  1. Read docs/repo-hygiene/git-permission-recovery.md."
  Write-Host "  2. Close active git processes before removing lock files."
  Write-Host "  3. Remove the explicit DENY ACE from .git in a normal or elevated PowerShell."
  Write-Host "  4. Or run Git through npm run git:safe -- <git args> to remove the known DENY ACE in-process."
  Write-Host "  5. Rerun npm run repo:sync:health."
  Write-Host "  6. Then run npm run handoff:pull and npm run git:safe -- fetch --all --prune."
} else {
  Write-Host "Next safe steps:"
  Write-Host "  1. Run npm run handoff:pull."
  Write-Host "  2. Run npm run git:safe -- fetch --all --prune."
  Write-Host "  3. Run npm run git:safe -- status --short --branch."
  Write-Host "  4. Continue normal stage/commit/push work."
}

if ($blocked -and $Strict) {
  exit 1
}

exit 0
