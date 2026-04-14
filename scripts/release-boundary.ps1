param(
  [ValidateSet("check", "capture", "status")]
  [string]$Mode = "check"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$SnapshotPath = Join-Path $RepoRoot ".nexus-release-boundary.json"
$IgnoredExactPaths = @(
  ".nexus-dev-runtime.json",
  ".nexus-release-boundary.json",
  "docs/AGENT_HANDOFF.md",
  "docs/CLAUDE_HANDOFF.md",
  "docs/CODEX_HANDOFF.md",
  "docs/CURSOR_HANDOFF.md",
  "tasks/agent-learnings.jsonl",
  "tasks/agent-metrics.tsv"
)
$IgnoredPrefixes = @(
  ".next/",
  ".next-e2e/",
  ".next-build/",
  ".next-fresh-runtime/",
  "docs/metrics/",
  "playwright-report/",
  "test-results/"
)

function Normalize-RepoPath {
  param([string]$PathValue)
  return ($PathValue -replace "\\", "/").Trim()
}

function Get-GitOutput {
  param([string[]]$Arguments)

  $output = & git @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ release:boundary: git $($Arguments -join ' ') failed." -ForegroundColor Red
    if ($output) {
      $output | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    }
    exit $LASTEXITCODE
  }

  if ($null -eq $output) {
    return @()
  }

  if ($output -is [array]) {
    return $output
  }

  return @($output)
}

function Should-IgnorePath {
  param([string]$PathValue)

  if ($IgnoredExactPaths -contains $PathValue) {
    return $true
  }

  foreach ($prefix in $IgnoredPrefixes) {
    if ($PathValue.StartsWith($prefix)) {
      return $true
    }
  }

  return $false
}

function Get-WorktreeState {
  $branch = (Get-GitOutput -Arguments @("rev-parse", "--abbrev-ref", "HEAD") | Select-Object -First 1).Trim()
  $head = (Get-GitOutput -Arguments @("rev-parse", "HEAD") | Select-Object -First 1).Trim()
  $statusLines = Get-GitOutput -Arguments @("status", "--porcelain=v1", "--untracked-files=all")

  $meaningful = @()
  $ignored = @()

  foreach ($rawLine in $statusLines) {
    $line = [string]$rawLine
    if ([string]::IsNullOrWhiteSpace($line)) {
      continue
    }

    if ($line.Length -lt 4) {
      continue
    }

    $status = $line.Substring(0, 2)
    $path = Normalize-RepoPath -PathValue $line.Substring(3)
    $entry = [PSCustomObject]@{
      status = $status
      path = $path
    }

    if (Should-IgnorePath -PathValue $path) {
      $ignored += $entry
    } else {
      $meaningful += $entry
    }
  }

  $meaningful = $meaningful | Sort-Object path, status
  $ignored = $ignored | Sort-Object path, status

  return [PSCustomObject]@{
    branch = $branch
    head = $head
    meaningful = @($meaningful)
    ignored = @($ignored)
  }
}

function Get-Snapshot {
  if (-not (Test-Path $SnapshotPath)) {
    return $null
  }

  $raw = Get-Content $SnapshotPath -Raw
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return $null
  }

  return $raw | ConvertFrom-Json
}

function Format-Sample {
  param(
    [Parameter(Mandatory = $true)]
    [array]$Entries,
    [int]$Limit = 8
  )

  $sample = $Entries | Select-Object -First $Limit
  return $sample | ForEach-Object { "  $($_.status) $($_.path)" }
}

function Write-StateSummary {
  param([Parameter(Mandatory = $true)]$State)

  Write-Host "Branch: $($State.branch)"
  Write-Host "HEAD: $($State.head)"
  Write-Host "Meaningful worktree changes: $($State.meaningful.Count)"
  if ($State.ignored.Count -gt 0) {
    Write-Host "Ignored volatile changes: $($State.ignored.Count)"
  }
}

function Compare-Entries {
  param(
    [Parameter(Mandatory = $true)]
    [array]$SnapshotEntries,
    [Parameter(Mandatory = $true)]
    [array]$CurrentEntries
  )

  $snapshotKeys = @{}
  foreach ($entry in $SnapshotEntries) {
    $snapshotKeys["$($entry.status) $($entry.path)"] = $entry
  }

  $currentKeys = @{}
  foreach ($entry in $CurrentEntries) {
    $currentKeys["$($entry.status) $($entry.path)"] = $entry
  }

  $missingFromCurrent = @()
  foreach ($key in $snapshotKeys.Keys) {
    if (-not $currentKeys.ContainsKey($key)) {
      $missingFromCurrent += $snapshotKeys[$key]
    }
  }

  $newSinceSnapshot = @()
  foreach ($key in $currentKeys.Keys) {
    if (-not $snapshotKeys.ContainsKey($key)) {
      $newSinceSnapshot += $currentKeys[$key]
    }
  }

  return [PSCustomObject]@{
    missingFromCurrent = @($missingFromCurrent | Sort-Object path, status)
    newSinceSnapshot = @($newSinceSnapshot | Sort-Object path, status)
  }
}

function Save-Snapshot {
  param([Parameter(Mandatory = $true)]$State)

  $snapshot = [PSCustomObject]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    branch = $State.branch
    head = $State.head
    meaningfulChangeCount = $State.meaningful.Count
    ignoredChangeCount = $State.ignored.Count
    entries = @($State.meaningful)
  }

  $snapshot | ConvertTo-Json -Depth 6 | Set-Content $SnapshotPath
  return $snapshot
}

function Remove-SnapshotIfPresent {
  if (Test-Path $SnapshotPath) {
    Remove-Item -LiteralPath $SnapshotPath -Force
  }
}

$state = Get-WorktreeState

switch ($Mode) {
  "capture" {
    if ($state.meaningful.Count -eq 0) {
      Remove-SnapshotIfPresent
      Write-Host "✅ release:boundary: worktree is already clean. Removed any stale local boundary snapshot." -ForegroundColor Green
      break
    }

    $snapshot = Save-Snapshot -State $state
    Write-Host "✅ release:boundary: captured $($snapshot.meaningfulChangeCount) meaningful worktree changes to $(Split-Path $SnapshotPath -Leaf)." -ForegroundColor Green
    Write-StateSummary -State $state
    $sample = Format-Sample -Entries $state.meaningful
    if ($sample.Count -gt 0) {
      Write-Host "Sample captured entries:"
      $sample | ForEach-Object { Write-Host $_ }
    }
    break
  }
  "status" {
    Write-StateSummary -State $state
    $snapshot = Get-Snapshot
    if ($null -eq $snapshot) {
      Write-Host "Captured boundary: none"
    } else {
      Write-Host "Captured boundary: $($snapshot.branch) @ $($snapshot.head)"
      Write-Host "Captured meaningful changes: $($snapshot.meaningfulChangeCount)"
    }
    break
  }
  default {
    if ($state.meaningful.Count -eq 0) {
      Write-Host "✅ release:boundary: worktree is clean. No local boundary snapshot is required." -ForegroundColor Green
      break
    }

    $snapshot = Get-Snapshot
    if ($null -eq $snapshot) {
      Write-Host "❌ release:boundary: worktree is dirty and no local release boundary snapshot exists." -ForegroundColor Red
      Write-StateSummary -State $state
      $sample = Format-Sample -Entries $state.meaningful
      if ($sample.Count -gt 0) {
        Write-Host "Sample meaningful changes:"
        $sample | ForEach-Object { Write-Host $_ }
      }
      Write-Host 'Capture this exact local boundary with `npm run release:boundary:capture`, or clean/stage the worktree before deployment proof.' -ForegroundColor Yellow
      exit 1
    }

    if ($snapshot.branch -ne $state.branch -or $snapshot.head -ne $state.head) {
      Write-Host "❌ release:boundary: current branch or HEAD does not match the captured local release boundary." -ForegroundColor Red
      Write-Host "Captured branch/head: $($snapshot.branch) @ $($snapshot.head)"
      Write-Host "Current branch/head:  $($state.branch) @ $($state.head)"
      Write-Host "Re-capture the boundary after intentionally choosing the new release candidate state." -ForegroundColor Yellow
      exit 1
    }

    $comparison = Compare-Entries -SnapshotEntries @($snapshot.entries) -CurrentEntries $state.meaningful
    if ($comparison.missingFromCurrent.Count -eq 0 -and $comparison.newSinceSnapshot.Count -eq 0) {
      Write-Host "✅ release:boundary: worktree matches the captured local boundary in $(Split-Path $SnapshotPath -Leaf)." -ForegroundColor Green
      Write-StateSummary -State $state
      break
    }

    Write-Host "❌ release:boundary: the local worktree drifted beyond the captured release boundary." -ForegroundColor Red
    Write-StateSummary -State $state
    if ($comparison.missingFromCurrent.Count -gt 0) {
      Write-Host "No longer present from captured boundary:"
      Format-Sample -Entries $comparison.missingFromCurrent | ForEach-Object { Write-Host $_ }
    }
    if ($comparison.newSinceSnapshot.Count -gt 0) {
      Write-Host "New or changed since captured boundary:"
      Format-Sample -Entries $comparison.newSinceSnapshot | ForEach-Object { Write-Host $_ }
    }
    Write-Host "Re-capture the local boundary only after confirming this broader state is the intended release candidate." -ForegroundColor Yellow
    exit 1
  }
}
