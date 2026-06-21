@echo off
:: Silent launcher — no console output. Logs: <repo-root>/git-sync.log
powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File "%~dp0git-sync-windows.ps1"
exit /b 0
