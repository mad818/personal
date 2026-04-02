# ================================================================
#  NEXUS PRIME — Next.js launcher for Windows (PowerShell)
#
#  HOW TO RUN:
#  1) Right-click this file → "Run with PowerShell"
#     OR in PowerShell:
#     Set-ExecutionPolicy -Scope Process Bypass; .\start-nexus.ps1
#
#  NOTE:
#  - This repo is now a Next.js app (http://localhost:3000 by default),
#    not only a static nexus-final.html site on port 8080.
# ================================================================

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$URL        = "http://localhost:3000/hq"

function OK   { param([string]$msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function WARN { param([string]$msg) Write-Host "  [ ! ] $msg" -ForegroundColor Yellow }
function FAIL { param([string]$msg) Write-Host "  [ERR] $msg" -ForegroundColor Red }

Clear-Host
Write-Host ""
Write-Host "  NEXUS PRIME — Next.js launcher" -ForegroundColor Cyan
Write-Host "  =================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $SCRIPT_DIR

# ── Step 1: prerequisites ─────────────────────────────────────
Write-Host "  Step 1: Checking Node.js + npm..." -ForegroundColor White
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  FAIL "Node.js is not installed. Install from https://nodejs.org/"
  Write-Host "  Press any key to exit..." -ForegroundColor Gray
  $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
  exit 1
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  FAIL "npm is not available in PATH. Reinstall Node.js from https://nodejs.org/"
  Write-Host "  Press any key to exit..." -ForegroundColor Gray
  $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
  exit 1
}
OK "Node.js and npm found"

# ── Step 2: install deps if missing ───────────────────────────
Write-Host "  Step 2: Checking dependencies..." -ForegroundColor White
if (-not (Test-Path (Join-Path $SCRIPT_DIR "node_modules"))) {
  WARN "node_modules not found — running npm install (first run can take a while)..."
  npm install
  OK "Dependencies installed"
} else {
  OK "Dependencies already present"
}

# ── Step 3: start dev server ──────────────────────────────────
Write-Host "  Step 3: Starting Next.js dev server..." -ForegroundColor White
Write-Host "       (A new window will open with live logs.)" -ForegroundColor Gray

# Start a dedicated PowerShell window with persistent logs
$cmd = "Set-Location -LiteralPath '$SCRIPT_DIR'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd | Out-Null

# Give server a moment to boot
Start-Sleep -Seconds 4

# ── Step 4: open browser ──────────────────────────────────────
Write-Host "  Step 4: Opening browser..." -ForegroundColor White
Start-Process $URL

Write-Host ""
Write-Host "  =================================" -ForegroundColor Cyan
OK "Nexus Prime should be opening at: $URL"
Write-Host ""
Write-Host "  If it does not load yet, wait a few seconds and refresh." -ForegroundColor Gray
Write-Host "  Dev logs are in the newly opened PowerShell window." -ForegroundColor Gray
Write-Host ""
