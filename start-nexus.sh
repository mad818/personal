#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  NEXUS AI — One-click setup  (Mac / Linux)
#  Run once: chmod +x start-nexus.sh
#  Then run: ./start-nexus.sh
# ═══════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=8080
URL="http://localhost:${PORT}/nexus-final.html"
TEXT_MODEL="llama3.2"
VISION_MODEL="llava"

# ── Colors ────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC}  $1"; }
warn() { echo -e "${YELLOW}!${NC}  $1"; }
err()  { echo -e "${RED}✗${NC}  $1"; }

echo ""
echo "  ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗"
echo "  ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝"
echo "  ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗"
echo "  ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║"
echo "  ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║"
echo "  ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝"
echo ""
echo "  Local AI Intelligence Dashboard — Setup"
echo "  ─────────────────────────────────────────"
echo ""

# ── Step 1: Install Ollama if missing ─────────────────────
if ! command -v ollama &>/dev/null; then
    warn "Ollama not found. Installing now..."
    curl -fsSL https://ollama.com/install.sh | sh
    ok "Ollama installed"
else
    ok "Ollama already installed"
fi

# ── Step 2: Stop any old Ollama instance ──────────────────
pkill -f "ollama serve" 2>/dev/null || true
sleep 1

# ── Step 3: Start Ollama with CORS open to localhost ──────
# OLLAMA_ORIGINS lets the browser (on localhost:8080) talk to Ollama
export OLLAMA_ORIGINS="*"
OLLAMA_ORIGINS="*" ollama serve &>/tmp/ollama.log &
OLLAMA_PID=$!
sleep 2

# Confirm it started
if kill -0 $OLLAMA_PID 2>/dev/null; then
    ok "Ollama server started (CORS open to all origins)"
else
    err "Ollama failed to start. Check /tmp/ollama.log"
    exit 1
fi

# ── Step 4: Pull models (skips if already downloaded) ─────
echo ""
echo "  Checking AI models..."

if ollama list 2>/dev/null | grep -q "^${TEXT_MODEL}"; then
    ok "${TEXT_MODEL} already downloaded"
else
    echo "  Pulling ${TEXT_MODEL} (text model ~2GB)..."
    ollama pull "${TEXT_MODEL}"
    ok "${TEXT_MODEL} ready"
fi

if ollama list 2>/dev/null | grep -q "^${VISION_MODEL}"; then
    ok "${VISION_MODEL} already downloaded"
else
    echo ""
    echo "  Pulling ${VISION_MODEL} (vision model for 📸 screen capture ~4GB)..."
    echo "  This lets the AI see your screen and answer questions about it."
    ollama pull "${VISION_MODEL}"
    ok "${VISION_MODEL} ready"
fi

# ── Step 5: Start local HTTP server ───────────────────────
# Required for screen capture API (getDisplayMedia needs http://, not file://)
echo ""
echo "  Starting local web server on port ${PORT}..."

# Kill anything already on that port
lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true
sleep 1

if command -v python3 &>/dev/null; then
    cd "$SCRIPT_DIR" && python3 -m http.server ${PORT} &>/tmp/nexus-server.log &
elif command -v python &>/dev/null; then
    cd "$SCRIPT_DIR" && python -m SimpleHTTPServer ${PORT} &>/tmp/nexus-server.log &
elif command -v node &>/dev/null; then
    cd "$SCRIPT_DIR" && node -e "
        const http=require('http'),fs=require('fs'),path=require('path');
        http.createServer((req,res)=>{
            const f=path.join('${SCRIPT_DIR}',req.url==='/'?'/nexus-final.html':req.url);
            fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);res.end();}else{res.writeHead(200);res.end(d);} });
        }).listen(${PORT});
    " &>/tmp/nexus-server.log &
else
    err "No HTTP server found (need python3, python, or node)"
    err "Install Python: https://python.org  or  run: brew install python"
    exit 1
fi

sleep 1
ok "Web server running at http://localhost:${PORT}"

# ── Step 6: Open browser ──────────────────────────────────
echo ""
echo "  Opening Nexus in your browser..."

if command -v xdg-open &>/dev/null; then
    xdg-open "$URL" &
elif command -v open &>/dev/null; then
    open "$URL" &
else
    warn "Could not auto-open browser. Go to: $URL"
fi

# ── Done ──────────────────────────────────────────────────
echo ""
echo "  ─────────────────────────────────────────"
ok "Nexus is live at: ${URL}"
echo ""
echo "  Models loaded:"
echo "    • ${TEXT_MODEL}  — text chat, summaries, briefings"
echo "    • ${VISION_MODEL}        — screen capture analysis (📸 button)"
echo ""
echo "  Press Ctrl+C to stop everything"
echo ""

# Keep script alive so Ctrl+C kills child processes cleanly
trap 'echo ""; echo "Stopping servers..."; pkill -f "ollama serve"; lsof -ti:${PORT} | xargs kill -9 2>/dev/null; echo "Done."; exit 0' INT
wait
