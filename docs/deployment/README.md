# Deployment notes

| Doc | Use when |
|-----|----------|
| [coolify.md](./coolify.md) | Self-hosting the Next.js app on a VPS with [Coolify](https://github.com/coollabsio/coolify) |

**Container build:** repo-root [`Dockerfile`](../../Dockerfile) — `docker build -t nexus-prime .` then `docker run --rm -p 3000:3000 -e ANTHROPIC_API_KEY=... -e NEXUS_TOKEN=... nexus-prime`.
