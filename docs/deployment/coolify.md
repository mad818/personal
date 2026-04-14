# Deploying Nexus Prime with Coolify

[Coolify](https://github.com/coollabsio/coolify) is a self-hosted PaaS: you run it on a VPS and deploy apps with Git + env vars, similar in spirit to Vercel but on **your** hardware. Official install and UI docs: [coolify.io/docs](https://coolify.io/docs).

You can deploy in two ways:

| Method | When to use |
|--------|-------------|
| **Dockerfile** (repo root) | Reproducible image: multi-stage build, Next **standalone** output, non-root user, port `3000`. Prefer this for parity with `docker build` / `docker run` locally. |
| **Nixpacks** | Zero-config: Coolify detects Node, runs `npm install`, `npm run build`, `npm start`. |

`next.config.js` sets `output: 'standalone'` so the Docker image only ships the minimal server bundle (see [Next.js Docker](https://nextjs.org/docs/app/building-your-application/deploying#docker-image)).

## Prerequisites

- A server (VPS) with Coolify installed (`curl` installer on [Coolify docs](https://coolify.io/docs)).
- A Git remote this server can clone (public repo or deploy key).

## One-time app setup in Coolify

1. **New resource → Application** (or Project → Add Application).
2. **Source**: connect the Git repository and pick branch (e.g. `main`; for the current first remote artifact proof, use `codex/preserve-main-2026-04-11`).
3. **Build**:
   - **Dockerfile**: set build type to Dockerfile if Coolify exposes it; context = repo root; no extra args needed. The image runs `node server.js` from the standalone bundle.
   - **Nixpacks**: leave default; runs `npm run build` then `npm start` (full `next start`, not standalone — both listen on **3000**).
4. **Port**: expose **3000**.
5. **Environment variables**: copy names from [`.env.example`](../../.env.example) into Coolify’s secret env UI. Minimum for a working agent:
   - `ANTHROPIC_API_KEY` (or rely on other providers you configure)
   - `NEXUS_TOKEN` (random string; protects `/api/*` per `middleware.ts`)
   - `NEXUS_DEPLOYMENT_PROFILE=web-self-hosted`
6. **Domain**: assign a hostname and TLS in Coolify; enable health checks if offered.
   - The repo intentionally does not commit a real staging hostname or Coolify app identifier. Keep the exact staged domain operator-local and use that value for `NEXUS_RELEASE_BASE_URL` when running target-runtime proof.

## After deploy

- Smoke-test: open the tab routes, confirm `/api/*` calls succeed with `Authorization: Bearer <NEXUS_TOKEN>` where the client sends it.
- Add the real staged hostname to repo-root `.env.local` as `NEXUS_RELEASE_BASE_URL=https://...` before running the shared target-runtime gate from this workstation.
- Run the shared release smoke script against the deployed host:

```bash
npm run release:smoke
```

- Rotate `NEXUS_TOKEN` if the UI was ever exposed without TLS.

## Related

- Ecosystem mapping (why we don’t vendor Coolify): [`docs/ideas/assimilated-ecosystem.md`](../ideas/assimilated-ecosystem.md)
