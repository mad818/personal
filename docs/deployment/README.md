# Deployment notes

| Doc | Use when |
|-----|----------|
| [phone-access-free-local.md](./phone-access-free-local.md) | Using Homefront from a phone for free while the desktop stays on |
| [coolify.md](./coolify.md) | Self-hosting the Next.js app on a VPS with [Coolify](https://github.com/coollabsio/coolify) |
| [phone-access-coolify.md](./phone-access-coolify.md) | Using Homefront from a phone while the desktop is off |
| [web-operator-runbook.md](./web-operator-runbook.md) | Running the canonical web deployment lane end-to-end |
| [fd2-release-runbook.md](./fd2-release-runbook.md) | Capturing staged-host diagnostics and rollback proof for FD2/CP2 |
| [desktop-secured-runbook.md](./desktop-secured-runbook.md) | Running the desktop lane in secure-network mode |
| [release-readiness-checklist.md](./release-readiness-checklist.md) | Verifying a release candidate across both lanes |

**Container build:** repo-root [`Dockerfile`](../../Dockerfile) — `docker build -t nexus-prime .` then `docker run --rm -p 3000:3000 -e NEXUS_TOKEN=... nexus-prime`.

**Phone access:** default to [`phone-access-free-local.md`](./phone-access-free-local.md) for the fully free desktop/LAN + PWA lane. Use [`phone-access-coolify.md`](./phone-access-coolify.md) only as optional hosted mode when the desktop is off. Run `npm run phone:lan:check` for the free local path and `npm run phone:access:check` before hosted deployment.

**FD2 release proof:** use [`fd2-release-runbook.md`](./fd2-release-runbook.md), then run `npm run release:diagnostics:capture` to write a sanitized route/prerequisite artifact under `docs/metrics/`.

Related:
- [../plans/nexus-completion-program-2026.md](../plans/nexus-completion-program-2026.md)
- [../regression-memory-checklist.md](../regression-memory-checklist.md)
