# Deployment notes

| Doc | Use when |
|-----|----------|
| [coolify.md](./coolify.md) | Self-hosting the Next.js app on a VPS with [Coolify](https://github.com/coollabsio/coolify) |
| [web-operator-runbook.md](./web-operator-runbook.md) | Running the canonical web deployment lane end-to-end |
| [desktop-secured-runbook.md](./desktop-secured-runbook.md) | Running the desktop lane in secure-network mode |
| [release-readiness-checklist.md](./release-readiness-checklist.md) | Verifying a release candidate across both lanes |

**Boundary capture:** `npm run release:boundary:capture`

**Boundary check:** `npm run release:boundary`

**Heal local runtime:** `npm run runtime:heal`

**Open HQ with auto-heal:** `npm run hq:open`

**Local candidate gate:** `npm run launch:gate`

**Target-runtime gate:** populate repo-root `.env.local` with `NEXUS_RELEASE_BASE_URL` and `NEXUS_TOKEN`, then run `npm run launch:gate:target`

**Container build:** repo-root [`Dockerfile`](../../Dockerfile) — `docker build -t nexus-prime .` then `docker run --rm -p 3000:3000 --env-file .env.local nexus-prime`.

Related:
- [../plans/nexus-completion-program-2026.md](../plans/nexus-completion-program-2026.md)
- [../regression-memory-checklist.md](../regression-memory-checklist.md)
