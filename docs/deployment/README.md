# Deployment notes

| Doc | Use when |
|-----|----------|
| [coolify.md](./coolify.md) | Self-hosting the Next.js app on a VPS with [Coolify](https://github.com/coollabsio/coolify) |
| [web-operator-runbook.md](./web-operator-runbook.md) | Running the canonical web deployment lane end-to-end |
| [desktop-secured-runbook.md](./desktop-secured-runbook.md) | Running the desktop lane in secure-network mode |
| [release-readiness-checklist.md](./release-readiness-checklist.md) | Verifying a release candidate across both lanes |

**Container build:** repo-root [`Dockerfile`](../../Dockerfile) — `docker build -t nexus-prime .` then `docker run --rm -p 3000:3000 -e ANTHROPIC_API_KEY=... -e NEXUS_TOKEN=... nexus-prime`.

Related:
- [../plans/nexus-completion-program-2026.md](../plans/nexus-completion-program-2026.md)
- [../regression-memory-checklist.md](../regression-memory-checklist.md)
