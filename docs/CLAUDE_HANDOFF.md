## Nexus Prime — Claude Desktop Handoff (AUTO)

**Generated from commit:** `2026-03-27T19:18:04-07:00`
**Latest commit:** chore: sync docs/CLAUDE_HANDOFF.md

### Git (remote)

- **origin:** `https://github.com/mad818/personal.git`
- **HEAD:** `f275d8b` — [commit](https://github.com/mad818/personal/commit/f275d8bc160288448ce14569a44b6e549a11e504) · [tree at this revision](https://github.com/mad818/personal/tree/f275d8bc160288448ce14569a44b6e549a11e504)

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

- `docs/CLAUDE_HANDOFF.md`

### What’s next (from `tasks/todo.md`)

- Telegram bot integration (message agent from phone) — **last** (bot already exists on Telegram; wire into Nexus when ready)

### Where to look

- **Tabs**: `app/[tab]/page.tsx`
- **State**: `store/useStore.ts`
- **AI**: `lib/agent.ts`, `lib/ai.ts`, `app/api/ai/*`, `app/api/tools/*`
- **Diagnostics**: `app/api/status/*`, `app/api/verify/*`, `docs/metrics/*`
- **Deployment / ideas:** `docs/deployment/`, `docs/ideas/assimilated-ecosystem.md`, `Dockerfile`

### Continuation notes (committed supplement)


<!-- Committed companion to auto handoff — edit when shipping a batch of work; links use branch main. -->

**Ecosystem assimilation (docs-only, no vendored third-party code)**

- [docs/ideas/assimilated-ecosystem.md](https://github.com/mad818/personal/blob/main/docs/ideas/assimilated-ecosystem.md) — maps external repos (PM Skills, Coolify, autoresearch, UncommonRoute, Onyx, Sentrux, etc.) to Nexus patterns.
- [docs/ideas/external-links-mapping.md](https://github.com/mad818/personal/blob/main/docs/ideas/external-links-mapping.md) — broader link inventory.
- [docs/ideas/README.md](https://github.com/mad818/personal/blob/main/docs/ideas/README.md) — ideas index.

**Self-hosting & containers**

- [docs/deployment/coolify.md](https://github.com/mad818/personal/blob/main/docs/deployment/coolify.md) — Coolify vs Nixpacks vs Dockerfile.
- [docs/deployment/README.md](https://github.com/mad818/personal/blob/main/docs/deployment/README.md) — deployment index + `docker build` one-liner.
- [Dockerfile](https://github.com/mad818/personal/blob/main/Dockerfile) — multi-stage Node 20 Alpine, Next **standalone** (`node server.js`, port 3000).
- [.dockerignore](https://github.com/mad818/personal/blob/main/.dockerignore) — keeps build context lean.
- [next.config.js](https://github.com/mad818/personal/blob/main/next.config.js) — `output: 'standalone'` for the Docker image.

**Environment & IDE routers**

- [.env.example](https://github.com/mad818/personal/blob/main/.env.example) — optional block for **UncommonRoute** / **factory-cursor-bridge** (`OPENAI_BASE_URL` / `ANTHROPIC_BASE_URL` in Cursor, not Nexus server).

**Repo entrypoints updated**

- [README.md](https://github.com/mad818/personal/blob/main/README.md) — Self-hosting section, project tree includes `Dockerfile`, `docs/deployment/`, `docs/ideas/assimilated-ecosystem.md`.
- [CLAUDE.md](https://github.com/mad818/personal/blob/main/CLAUDE.md) — `docs/` paths + assimilated ecosystem pointer.

**Handoff automation**

- [scripts/generate-handoff.js](https://github.com/mad818/personal/blob/main/scripts/generate-handoff.js) — injects **GitHub commit/tree links** from `origin` and appends this file into `docs/CLAUDE_HANDOFF.md`.

After `git push`, use **this commit’s** “Git (remote)” links at the top of `docs/CLAUDE_HANDOFF.md` for an immutable snapshot; use `blob/main/...` links above for stable paths on default branch.
