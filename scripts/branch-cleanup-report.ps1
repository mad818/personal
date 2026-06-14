$ErrorActionPreference = "Stop"

$Failures = New-Object System.Collections.Generic.List[string]
$Tick = [char]96

function Invoke-GitRead {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args
  )

  $output = & git @Args 2>&1
  $exitCode = $LASTEXITCODE

  if ($exitCode -ne 0) {
    $Failures.Add("git $($Args -join ' ') -> $($output -join ' ')")
    return ""
  }

  return ($output -join "`n").TrimEnd()
}

function Get-Lines {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return @()
  }

  return @(
    $Value -split "`r?`n" |
      ForEach-Object { $_.Trim() } |
      Where-Object { $_ -and ($_ -notmatch " -> ") }
  )
}

function Get-UniqueSorted {
  param([string[]]$Values)

  return @($Values | Sort-Object -Unique)
}

function Format-Branch {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Branch,
    [string]$Suffix = ""
  )

  return "$Tick$Branch$Tick$Suffix"
}

function Format-Code {
  param([string]$Value)

  return "$Tick$Value$Tick"
}

function Format-MarkdownList {
  param(
    [string[]]$Values,
    [string]$Fallback = "_None found._"
  )

  if ($Values.Count -eq 0) {
    return $Fallback
  }

  return (($Values | ForEach-Object { "- $_" }) -join "`n")
}

function ConvertTo-RemoteDeleteRef {
  param([string]$RemoteRef)

  return ($RemoteRef -replace "^origin/", "")
}

function Get-WorktreeEntries {
  param([string]$Raw)

  $entries = @()
  $current = @{}

  foreach ($line in ($Raw -split "`r?`n")) {
    if ([string]::IsNullOrWhiteSpace($line)) {
      if ($current.Path -and $current.Branch) {
        $entries += [pscustomobject]@{
            Path   = $current.Path
            Branch = $current.Branch
          }
      }
      $current = @{}
      continue
    }

    if ($line.StartsWith("worktree ")) {
      $current.Path = $line.Substring("worktree ".Length)
    }

    if ($line.StartsWith("branch refs/heads/")) {
      $current.Branch = $line.Substring("branch refs/heads/".Length)
    }
  }

  if ($current.Path -and $current.Branch) {
    $entries += [pscustomobject]@{
        Path   = $current.Path
        Branch = $current.Branch
      }
  }

  return @($entries)
}

$CurrentBranch = (Invoke-GitRead @("branch", "--show-current")).Trim()
if ([string]::IsNullOrWhiteSpace($CurrentBranch)) {
  $CurrentBranch = "(detached)"
}

$Status = Invoke-GitRead @("status", "--short", "--branch")
$DirtyLineCount = @(
  Get-Lines $Status |
    Where-Object { $_ -notmatch "^##" }
).Count

$LocalMerged = Get-UniqueSorted (Get-Lines (Invoke-GitRead @("branch", "--format=%(refname:short)", "--merged", "main")))
$LocalNotMerged = Get-UniqueSorted (Get-Lines (Invoke-GitRead @("branch", "--format=%(refname:short)", "--no-merged", "main")))
$RemoteMerged = Get-UniqueSorted @(
  Get-Lines (Invoke-GitRead @("branch", "-r", "--format=%(refname:short)", "--merged", "origin/main")) |
    Where-Object { ($_ -ne "origin") -and ($_ -ne "origin/HEAD") -and ($_ -notmatch "/HEAD$") }
)
$RemoteNotMerged = Get-UniqueSorted @(
  Get-Lines (Invoke-GitRead @("branch", "-r", "--format=%(refname:short)", "--no-merged", "origin/main")) |
    Where-Object { ($_ -ne "origin") -and ($_ -ne "origin/HEAD") -and ($_ -notmatch "/HEAD$") }
)

$Worktrees = Get-WorktreeEntries (Invoke-GitRead @("worktree", "list", "--porcelain"))
$WorktreeByBranch = @{}
foreach ($entry in $Worktrees) {
  $WorktreeByBranch[$entry.Branch] = $entry.Path
}

$ProtectedLocal = @("main", $CurrentBranch, "(detached)")
$LocalMergedCandidates = @($LocalMerged | Where-Object { $ProtectedLocal -notcontains $_ })
$LocalMergedReady = @($LocalMergedCandidates | Where-Object { -not $WorktreeByBranch.ContainsKey($_) })
$LocalMergedBlocked = @($LocalMergedCandidates | Where-Object { $WorktreeByBranch.ContainsKey($_) })
$LocalReviewOnly = @($LocalNotMerged | Where-Object { $ProtectedLocal -notcontains $_ })
$RemoteMergedCandidates = @($RemoteMerged | Where-Object { $_ -ne "origin/main" })
$RemoteReviewOnly = @($RemoteNotMerged | Where-Object { $_ -ne "origin/main" })

$WorktreeLines = @(
  $Worktrees | ForEach-Object {
    "$(Format-Branch $_.Branch) -> $Tick$($_.Path)$Tick"
  }
)
$LocalMergedReadyLines = @($LocalMergedReady | ForEach-Object { Format-Branch $_ })
$LocalMergedBlockedLines = @(
  $LocalMergedBlocked | ForEach-Object {
    "$(Format-Branch $_) -> $Tick$($WorktreeByBranch[$_])$Tick"
  }
)
$LocalReviewLines = @($LocalReviewOnly | ForEach-Object { Format-Branch $_ })
$RemoteMergedLines = @(
  $RemoteMergedCandidates | ForEach-Object {
    "$(Format-Branch $_) -> $Tick" + "git push origin --delete $(ConvertTo-RemoteDeleteRef $_)" + "$Tick"
  }
)
$RemoteReviewLines = @($RemoteReviewOnly | ForEach-Object { Format-Branch $_ })
$WarningLines = if ($Failures.Count -eq 0) {
  @("_No Git read commands failed._")
}
else {
  @($Failures | ForEach-Object { "$Tick$_$Tick" })
}

@"
# Branch Cleanup Report

Generated: $((Get-Date).ToUniversalTime().ToString("o"))
Workspace: $Tick$(Get-Location)$Tick
Current branch: $Tick$CurrentBranch$Tick
Working tree entries: $DirtyLineCount

> Read-only report. No branches, worktrees, or remote refs were deleted.
> Run $(Format-Code "git fetch --prune") from Mario's working Git shell before acting on remote cleanup.

## Worktree-bound Branches

$(Format-MarkdownList $WorktreeLines)

## Local Merged Candidates

These are merged into local $(Format-Code "main") and are candidates for $(Format-Code "git branch -d") after review.

$(Format-MarkdownList $LocalMergedReadyLines)

## Local Merged But Worktree-Bound

Remove the worktree first, then delete the branch if the branch is still unnecessary.

$(Format-MarkdownList $LocalMergedBlockedLines)

## Local Not Merged

Review only. These may contain rollback, archive, or unmerged feature context.

$(Format-MarkdownList $LocalReviewLines)

## Remote Merged Candidates

These remote-tracking refs are merged into local $(Format-Code "origin/main"). Confirm no open PR uses them before deleting.

$(Format-MarkdownList $RemoteMergedLines)

## Remote Not Merged

Review only. These should stay unless GitHub confirms the PR/branch is obsolete.

$(Format-MarkdownList $RemoteReviewLines)

## Suggested Review Flow

1. Finish or shelve current local work.
2. Run $(Format-Code "git fetch --prune").
3. Run $(Format-Code "gh pr list --state open --limit 100").
4. Delete only confirmed merged remote branches.
5. Remove obsolete replay worktrees.
6. Delete their local merged branches.

## Command Warnings

$(Format-MarkdownList $WarningLines)
"@
