# Installs a fully hidden Startup shortcut for Nexus git sync.
# Run once: powershell -ExecutionPolicy Bypass -File scripts/install-git-sync-startup.ps1

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$vbs = Join-Path $PSScriptRoot "git-sync-windows.vbs"
$startup = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
$lnkPath = Join-Path $startup "git-sync-windows.lnk"

if (-not (Test-Path $vbs)) {
    throw "Missing $vbs"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($lnkPath)
$shortcut.TargetPath = "$env:SystemRoot\System32\wscript.exe"
$shortcut.Arguments = "`"$vbs`""
$shortcut.WorkingDirectory = $repoRoot.Path
$shortcut.WindowStyle = 7
$shortcut.Description = "Nexus Prime silent git sync (log: git-sync.log)"
$shortcut.Save()

Write-Host "ok Startup shortcut -> $lnkPath"
Write-Host "   launches: $vbs (fully hidden)"
