@echo off
:: git-sync-windows.bat
:: Auto-syncs the Nexus Prime project folder with GitHub on startup.
:: Place a shortcut to this file in:
:: %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

cd /d "%~dp0.."

echo [Nexus Sync] Pulling latest from GitHub...
git pull origin main

echo [Nexus Sync] Done.
timeout /t 3
