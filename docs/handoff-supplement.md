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
