@echo off
:: ═══════════════════════════════════════════════════════════
::  NEXUS AI — One-click setup  (Windows)
::  Double-click this file, or run it from the terminal
:: ═══════════════════════════════════════════════════════════

setlocal EnableDelayedExpansion

set PORT=8080
set URL=http://localhost:%PORT%/nexus-final.html
set TEXT_MODEL=llama3.2
set VISION_MODEL=llava
set SCRIPT_DIR=%~dp0

echo.
echo   NEXUS AI — Local Intelligence Dashboard
echo   -----------------------------------------
echo.

:: ── Step 1: Check Ollama ──────────────────────────────────
where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo   [!] Ollama is not installed.
    echo   [!] Opening the download page now...
    echo.
    echo   After installing Ollama, close this window and run
    echo   start-nexus.bat again.
    echo.
    start https://ollama.com/download
    pause
    exit /b 1
)
echo   [OK] Ollama found

:: ── Step 2: Stop old Ollama instances ────────────────────
taskkill /F /IM "ollama.exe" >nul 2>&1
timeout /t 2 >nul

:: ── Step 3: Start Ollama with CORS enabled ───────────────
echo   Starting Ollama server...
start /min "Ollama" cmd /c "set OLLAMA_ORIGINS=* && ollama serve"
timeout /t 3 >nul
echo   [OK] Ollama started (CORS open to all origins)

:: ── Step 4: Pull models ───────────────────────────────────
echo.
echo   Checking AI models...

ollama list 2>nul | findstr /B "%TEXT_MODEL%" >nul
if %errorlevel% neq 0 (
    echo   Pulling %TEXT_MODEL% (text model ~2GB, this may take a few minutes)...
    ollama pull %TEXT_MODEL%
    echo   [OK] %TEXT_MODEL% ready
) else (
    echo   [OK] %TEXT_MODEL% already downloaded
)

ollama list 2>nul | findstr /B "%VISION_MODEL%" >nul
if %errorlevel% neq 0 (
    echo.
    echo   Pulling %VISION_MODEL% (vision model ~4GB — needed for screen capture)...
    echo   This lets the AI see your screen and answer questions about it.
    ollama pull %VISION_MODEL%
    echo   [OK] %VISION_MODEL% ready
) else (
    echo   [OK] %VISION_MODEL% already downloaded
)

:: ── Step 5: Kill anything on PORT, start HTTP server ─────
echo.
echo   Starting local web server on port %PORT%...

:: Free the port if something else is on it
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":%PORT% "') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 >nul

:: Try Python 3 first
where python >nul 2>&1
if %errorlevel% equ 0 (
    start /min "Nexus Server" cmd /c "cd /d %SCRIPT_DIR% && python -m http.server %PORT%"
    goto server_started
)

:: Try py launcher
where py >nul 2>&1
if %errorlevel% equ 0 (
    start /min "Nexus Server" cmd /c "cd /d %SCRIPT_DIR% && py -m http.server %PORT%"
    goto server_started
)

:: Try Node
where node >nul 2>&1
if %errorlevel% equ 0 (
    start /min "Nexus Server" cmd /c "cd /d %SCRIPT_DIR% && node -e \"const http=require('http'),fs=require('fs'),path=require('path');http.createServer((req,res)=>{const f=path.join('%SCRIPT_DIR%',req.url==='/'?'/nexus-final.html':req.url);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);res.end();}else{res.writeHead(200);res.end(d);}});}).listen(%PORT%);\""
    goto server_started
)

echo   [!] No HTTP server found (need Python or Node.js)
echo   [!] Install Python from https://python.org
echo   [!] Make sure to check "Add Python to PATH" during install
pause
exit /b 1

:server_started
timeout /t 2 >nul
echo   [OK] Web server running at http://localhost:%PORT%

:: ── Step 6: Open Brave / Chrome / Edge ───────────────────
echo.
echo   Opening Nexus in your browser...

:: Try Brave first, then Chrome, then Edge, then default
set BRAVE_PATH=%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe
set CHROME_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe
set EDGE_PATH=%PROGRAMFILES(X86)%\Microsoft\Edge\Application\msedge.exe

if exist "%BRAVE_PATH%" (
    start "" "%BRAVE_PATH%" "%URL%"
    goto browser_opened
)
if exist "%CHROME_PATH%" (
    start "" "%CHROME_PATH%" "%URL%"
    goto browser_opened
)
if exist "%EDGE_PATH%" (
    start "" "%EDGE_PATH%" "%URL%"
    goto browser_opened
)
start "" "%URL%"

:browser_opened

:: ── Done ──────────────────────────────────────────────────
echo.
echo   -----------------------------------------
echo   [OK] Nexus is live at: %URL%
echo.
echo   Models:
echo     %TEXT_MODEL%  = text chat, summaries, briefings
echo     %VISION_MODEL%        = screen capture analysis (camera button)
echo.
echo   Close this window to stop all servers.
echo   -----------------------------------------
echo.
pause
