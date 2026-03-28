## Nexus Prime — Claude Desktop Handoff (AUTO)

**Generated from commit:** `2026-03-27T19:17:57-07:00`
**Latest commit:** feat: news feeds + GDELT fallback, PWA manifest/icon, docs and gitignore cleanup

### Project purpose

Nexus Prime is a **free, open-source, self-hosted intelligence dashboard** that runs locally (no cloud backend, no DB).
It aggregates markets, geopolitics, cyber, ops, IoT, and includes an AI agent (Claude via server proxy or local Ollama).

### Development stage

- Next.js 14 app is the active surface (`app/`, `components/`, `lib/`, `store/`).
- `nexus-final.html` remains as legacy reference and should stay single-file.

### OS / machine context (Windows or macOS)

This repo is used on **Windows (PowerShell)** and **macOS (zsh)**. Start every new machine by confirming the basics:

```bash
# Where am I? (prints the repo root path)
node -p "process.cwd()"

# What OS is this Node running on? (win32 / darwin / linux)
node -p "process.platform"

# Confirm Node + npm
node -v
npm -v
```

- **Windows**: use PowerShell. Avoid Bash-only syntax like `&&` in one-liners; prefer separate commands.
- **macOS**: use Terminal/zsh. Bash one-liners generally work.

### Run + verify

```bash
npm install
npm run dev
```

**Always verify after edits:**

```bash
npm run verify
```

### Security + ops constraints

- Secrets live in `.env.local` (never commit). See `.env.example`.
- Server routes are protected by `NEXUS_TOKEN` and CSP is enforced in `next.config.js`.
- Prefer server-side API routes for external fetches to avoid CSP/CORS issues.

### What changed in the latest push

Files touched in the latest commit:

- `.gitignore`
- `CLAUDE.md`
- `README.md`
- `app/api/news/route.ts`
- `app/layout.tsx`
- `components/signals/NewsFeed.tsx`
- `hooks/useArticles.ts`
- `public/icon.svg`
- `public/manifest.json`
- `tasks/todo.md`
- `tsconfig.tsbuildinfo`

### What’s next (from `tasks/todo.md`)

- Telegram bot integration (message agent from phone) — **last** (bot already exists on Telegram; wire into Nexus when ready)

### Where to look

- **Tabs**: `app/[tab]/page.tsx`
- **State**: `store/useStore.ts`
- **AI**: `lib/agent.ts`, `lib/ai.ts`, `app/api/ai/*`, `app/api/tools/*`
- **Diagnostics**: `app/api/status/*`, `app/api/verify/*`, `docs/metrics/*`
