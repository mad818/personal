@echo off
setlocal EnableExtensions
title Nexus Prime
cd /d "%~dp0"

echo.
echo   NEXUS PRIME - OPERATIONAL START
echo   ================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo   [ERR] Node.js 24 is not installed or not on PATH.
  echo         Install Node.js 24, then run this file again.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo   [ERR] npm 11 is not available.
  echo         Install npm 11, then run this file again.
  echo.
  pause
  exit /b 1
)

call npm run operational:start
set "_nexus_exit=%errorlevel%"
if not "%_nexus_exit%"=="0" (
  echo.
  echo   [ERR] Nexus did not reach verified health.
  echo         Follow the recovery action printed above, then retry.
  echo.
  pause
)

endlocal & exit /b %_nexus_exit%
