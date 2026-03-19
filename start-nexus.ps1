# ================================================================
#  NEXUS AI — One-click setup for Windows (PowerShell)
#
#  HOW TO RUN:
#  1. Right-click this file → "Run with PowerShell"
#     OR open PowerShell and paste:
#     Set-ExecutionPolicy -Scope Process Bypass; .\start-nexus.ps1
# ================================================================

$PORT         = 8080
$URL          = "http://localhost:$PORT/nexus-final.html"
$TEXT_MODEL   = "llama3.2"
$VISION_MODEL = "llava"
$SCRIPT_DIR   = Split-Path -Parent $MyInvocation.MyCommand.Definition

function OK   { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function WARN { param($msg) Write-Host "  [ ! ] $msg" -ForegroundColor Yellow }
function FAIL { param($msg) Write-Host "  [ERR] $msg" -ForegroundColor Red }

Clear-Host
Write-Host ""
Write-Host "  NEXUS AI - Local Intelligence Dashboard" -ForegroundColor Cyan
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Check / install Ollama ───────────────────────
Write-Host "  Step 1: Checking Ollama..." -ForegroundColor White
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    WARN "Ollama not found. Opening download page..."
    Start-Process "https://ollama.com/download"
    Write-Host ""
    Write-Host "  Install Ollama, then run this script again." -ForegroundColor Yellow
    Write-Host "  Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
OK "Ollama is installed"

# ── Step 2: Stop old Ollama processes ────────────────────
Write-Host "  Step 2: Restarting Ollama with CORS enabled..." -ForegroundColor White
Stop-Process -Name "ollama" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# ── Step 3: Start Ollama (CORS open to all origins) ──────
$env:OLLAMA_ORIGINS = "*"
$ollamaJob = Start-Job -ScriptBlock {
    $env:OLLAMA_ORIGINS = "*"
    & ollama serve 2>&1
}
Start-Sleep -Seconds 3
OK "Ollama running (CORS open to all origins)"

# ── Step 4: Pull models ───────────────────────────────────
Write-Host ""
Write-Host "  Step 3: Checking AI models..." -ForegroundColor White

$installedModels = & ollama list 2>$null
if ($installedModels -notmatch $TEXT_MODEL) {
    Write-Host "  Pulling $TEXT_MODEL (text, ~2 GB)..." -ForegroundColor Gray
    & ollama pull $TEXT_MODEL
    OK "$TEXT_MODEL downloaded"
} else {
    OK "$TEXT_MODEL already installed"
}

if ($installedModels -notmatch $VISION_MODEL) {
    Write-Host ""
    Write-Host "  Pulling $VISION_MODEL (vision for screenshot analysis, ~4 GB)..." -ForegroundColor Gray
    Write-Host "  This lets AI see your screen when you click the camera button." -ForegroundColor Gray
    & ollama pull $VISION_MODEL
    OK "$VISION_MODEL downloaded"
} else {
    OK "$VISION_MODEL already installed"
}

# ── Step 5: Free the port and start HTTP server ──────────
Write-Host ""
Write-Host "  Step 4: Starting local web server on port $PORT..." -ForegroundColor White

# Kill anything holding the port
$portUsers = netstat -ano 2>$null | Select-String ":$PORT " | ForEach-Object {
    ($_ -split '\s+')[-1]
} | Select-Object -Unique
foreach ($pid in $portUsers) {
    if ($pid -match '^\d+$') {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 1

# Start Python HTTP server in background
$serverJob = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $serverJob = Start-Job -ScriptBlock {
        Set-Location $using:SCRIPT_DIR
        & python -m http.server $using:PORT 2>&1
    }
    OK "Server started (python)"
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $serverJob = Start-Job -ScriptBlock {
        Set-Location $using:SCRIPT_DIR
        & py -m http.server $using:PORT 2>&1
    }
    OK "Server started (py)"
} elseif (Get-Command node -ErrorAction SilentlyContinue) {
    $serverJob = Start-Job -ScriptBlock {
        Set-Location $using:SCRIPT_DIR
        node -e "
            const http=require('http'),fs=require('fs'),path=require('path');
            http.createServer((req,res)=>{
                const f=path.join('$using:SCRIPT_DIR',req.url==='/'?'/nexus-final.html':req.url);
                fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();}else{res.writeHead(200);res.end(d);} });
            }).listen($using:PORT);
        " 2>&1
    }
    OK "Server started (node)"
} else {
    FAIL "No web server found. Install Python from https://python.org (check 'Add to PATH')"
    Write-Host "  Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Start-Sleep -Seconds 2

# ── Step 6: Open browser ──────────────────────────────────
Write-Host ""
Write-Host "  Step 5: Opening Nexus in your browser..." -ForegroundColor White

$browsers = @(
    "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\Application\brave.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Mozilla Firefox\firefox.exe"
)
$opened = $false
foreach ($b in $browsers) {
    if (Test-Path $b) {
        Start-Process $b $URL
        $opened = $true
        break
    }
}
if (-not $opened) { Start-Process $URL }

# ── Done ──────────────────────────────────────────────────
Write-Host ""
Write-Host "  ========================================" -ForegroundColor Cyan
OK "Nexus is live at: $URL"
Write-Host ""
Write-Host "  Models ready:" -ForegroundColor White
Write-Host "    $TEXT_MODEL   - text chat, news summaries, daily briefing" -ForegroundColor Gray
Write-Host "    $VISION_MODEL         - screenshot analysis (camera button in chat)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Press Ctrl+C or close this window to stop everything." -ForegroundColor Yellow
Write-Host ""

# Keep alive until user kills it
try {
    while ($true) { Start-Sleep -Seconds 5 }
} finally {
    Write-Host "  Stopping servers..." -ForegroundColor Gray
    Stop-Process -Name "ollama" -Force -ErrorAction SilentlyContinue
    if ($ollamaJob) { Stop-Job $ollamaJob -ErrorAction SilentlyContinue }
    if ($serverJob) { Stop-Job $serverJob -ErrorAction SilentlyContinue }
    Write-Host "  Done." -ForegroundColor Gray
}
