# Deploying Nexus Prime with Coolify

[Coolify](https://github.com/coollabsio/coolify) is a self-hosted PaaS: you run it on a VPS and deploy apps with Git + env vars, similar in spirit to Vercel but on **your** hardware. Official install and UI docs: [coolify.io/docs](https://coolify.io/docs).

You can deploy in two ways:

| Method                     | When to use                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dockerfile** (repo root) | Reproducible image: multi-stage build, Next **standalone** output, non-root user, port `3000`. Prefer this for parity with `docker build` / `docker run` locally. |
| **Nixpacks**               | Zero-config: Coolify detects Node, runs `npm install`, `npm run build`, `npm start`.                                                                              |

`next.config.js` sets `output: 'standalone'` so the Docker image only ships the minimal server bundle (see [Next.js Docker](https://nextjs.org/docs/app/building-your-application/deploying#docker-image)).

## Prerequisites

- A server (VPS) with Coolify installed (`curl` installer on [Coolify docs](https://coolify.io/docs)).
- A Git remote this server can clone (public repo or deploy key).

## One-time app setup in Coolify

1. **New resource → Application** (or Project → Add Application).
2. **Source**: connect the Git repository and pick branch (e.g. `main`).
3. **Build**:
   - **Dockerfile**: set build type to Dockerfile if Coolify exposes it; context = repo root. For a release after the identity contract landed, pass the full immutable commit as `NEXUS_BUILD_COMMIT_SHA` and the exact release tag as `NEXUS_RELEASE_TAG`. The image runs `node server.js` from the standalone bundle.
   - **Nixpacks**: leave default; runs `npm run build` then `npm start` (full `next start`, not standalone — both listen on **3000**).
4. **Port**: expose **3000**.
5. **Environment variables**: copy names from [`.env.example`](../../.env.example) into Coolify’s secret env UI. Minimum for a working agent:
   - `NEXUS_TOKEN` (random string; protects `/api/*` per `middleware.ts`)
   - `NEXUS_EVIDENCE_KEY` (stable shared operator/runtime HMAC key of at least
     128 bits; correlates and authenticates sanitized staging evidence and must
     not rotate with auth)
   - `NEXUS_DEPLOYMENT_PROFILE=web-self-hosted`
   - `NEXUS_NETWORK_MODE=internal`
   - `NEXUS_ENABLE_HIGH_RISK_TOOLS=false`
   - `NEXUS_HIGH_RISK_WRITES_REQUIRE_APPROVAL=true`
   - `NEXUS_ALLOW_PAID_APIS=false`
   - one free/BYOK AI key such as `GROQ_API_KEY`, `GOOGLE_AI_KEY`, or `OPENROUTER_API_KEY`
6. **Domain**: assign a hostname and TLS in Coolify; enable health checks if offered.

The published `v1.0.0-rc.1` source predates these runtime identity fields and
OCI labels and remains unchanged at its published commit. The active deployment
candidate is `v1.0.0-rc.2`, which contains the proof contract. Its exact commit
must come from the verified candidate branch, and its tag must not be created
until Mario separately approves tag creation. Branch, commit, push, and draft
PR approval do not authorize a Coolify deployment.

`NEXUS_EVIDENCE_KEY` proves key possession and evidence tamper resistance only
inside the trusted operator/runtime boundary. It is not independent server,
registry, or Coolify provenance.

For fully free phone use while the desktop stays on, follow [`phone-access-free-local.md`](./phone-access-free-local.md). For optional hosted phone use while the desktop is off, follow [`phone-access-coolify.md`](./phone-access-coolify.md).

## After deploy

- Smoke-test: open the tab routes, confirm `/api/*` calls succeed with `Authorization: Bearer <NEXUS_TOKEN>` where the client sends it.
- Run the shared release smoke script against the deployed host:

```bash
NEXUS_RELEASE_BASE_URL=https://your-host.example \
NEXUS_TOKEN=your-token \
npm run release:smoke
```

- Capture the staged-host diagnostics artifact:

```bash
NEXUS_RELEASE_BASE_URL=https://your-host.example \
NEXUS_TOKEN=your-token \
npm run release:diagnostics:capture
```

- Rotate `NEXUS_TOKEN` if the UI was ever exposed without TLS.
- For phone/PWA acceptance, open `/hq?focus=hq-chronicle`, send `ping`, check `/command?focus=provider-health`, then install from the phone browser home-screen flow.

## Related

- Ecosystem mapping (why we don’t vendor Coolify): [`docs/ideas/assimilated-ecosystem.md`](../ideas/assimilated-ecosystem.md)
