#!/bin/bash
# git-sync-mac.sh
# Auto-pushes the Nexus Prime project to GitHub.
# Run this manually when done working, or add to Mac login items.

cd ~/Desktop/experimentalbot-main

echo "[Nexus Sync] Pulling latest first..."
git pull origin main

echo "[Nexus Sync] Staging all changes..."
git add .

echo "[Nexus Sync] Committing..."
git commit -m "sync: $(date '+%Y-%m-%d %H:%M')" 2>/dev/null || echo "[Nexus Sync] Nothing new to commit."

echo "[Nexus Sync] Pushing to GitHub..."
git push origin main

echo "[Nexus Sync] Done."
