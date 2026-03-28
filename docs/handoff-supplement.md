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

- [scripts/generate-handoff.js](https://github.com/mad818/personal/blob/main/scripts/generate-handoff.js) — **branch** tree + commit history links from `origin`, plus this file appended into `docs/CLAUDE_HANDOFF.md` (no per-commit SHA — avoids handoff sync oscillation).

**PM operator + cockpit (planned)**

- [docs/pm-operator-model.md](https://github.com/mad818/personal/blob/main/docs/pm-operator-model.md) — you = PM, in-app/IDE agents = engineering squad; what “always running” means.
- [docs/pm-cockpit-plan.md](https://github.com/mad818/personal/blob/main/docs/pm-cockpit-plan.md) — phased plan: health strip → checklist UI → optional CI hooks; includes **HTTP 500 triage** (identify route, 401 vs 503 vs 500, check dev server logs).

Use **`blob/main/...`** links above for stable file URLs. For the exact revision after a push, see [commit history](https://github.com/mad818/personal/commits/main) or run `git log -1` locally.

---

## Handoff template — use this at end of every work session

Agents and IDE sessions should close with this structure in their final message:

```
## HANDOFF — [agent name] — [date]

### COMPLETED
- [task] — [file changed] — [what it does]

### ARTIFACTS
- [file path] — [one-line description]

### VERIFICATION
- [ ] tsc --noEmit passes
- [ ] npm run verify passes
- [ ] Patched sections re-read and confirmed correct

### KNOWN ISSUES
- [anything left broken or incomplete — none if clean]

### NEXT
- [suggested next task] — owner: [agent or Mario]
```

This template feeds `docs/CLAUDE_HANDOFF.md` via `npm run handoff:write`.
If nothing broke and verify is green, state that explicitly — "No known issues."
