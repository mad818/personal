[CmdletBinding()]
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$GitArgs
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$gitDir = Join-Path $repoRoot ".git"
$knownDenySids = @(
  "S-1-5-21-779443000-71960511-1366699174-2556294504"
)

function Remove-KnownGitDenyAcl {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return 0
  }

  $icaclsOutput = & icacls $Path 2>&1
  $matchingDeny = @(
    $icaclsOutput | Where-Object {
      $line = $_.ToString()
      ($line -match "\(DENY\)") -and
        ($knownDenySids | Where-Object { $line.Contains($_) })
    }
  )

  if ($matchingDeny.Count -gt 0) {
    foreach ($sid in $knownDenySids) {
      & icacls $Path /remove:d $sid 2>$null | Out-Null
    }
  }

  $postIcaclsOutput = & icacls $Path 2>&1
  $postMatchingDeny = @(
    $postIcaclsOutput | Where-Object {
      $line = $_.ToString()
      ($line -match "\(DENY\)") -and
        ($knownDenySids | Where-Object { $line.Contains($_) })
    }
  )

  if ($postMatchingDeny.Count -eq 0) {
    return $matchingDeny.Count
  }

  $acl = [System.IO.Directory]::GetAccessControl($Path)
  $removed = 0

  foreach ($rule in @($acl.Access)) {
    $isKnownDeny =
      $knownDenySids -contains $rule.IdentityReference.Value -and
      $rule.AccessControlType -eq [System.Security.AccessControl.AccessControlType]::Deny

    if ($isKnownDeny) {
      $acl.RemoveAccessRuleSpecific($rule)
      $removed++
    }
  }

  if ($removed -gt 0) {
    [System.IO.Directory]::SetAccessControl($Path, $acl)
  }

  return $removed
}

if ($GitArgs.Count -gt 0 -and $GitArgs[0] -eq "--") {
  $GitArgs = $GitArgs[1..($GitArgs.Count - 1)]
}

if ($GitArgs.Count -eq 0) {
  $GitArgs = @("status", "--short", "--branch")
}

$removed = Remove-KnownGitDenyAcl -Path $gitDir
if ($removed -gt 0) {
  Write-Host "Removed $removed known .git DENY ACL entr$(if ($removed -eq 1) { 'y' } else { 'ies' }) before git $($GitArgs -join ' ')."
}

Push-Location $repoRoot
try {
  & git @GitArgs
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
