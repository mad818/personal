# First Deployment Plan — 2026-04-10

## Executive summary

Nexus Prime is **past feature-prototype stage** and is now in **pre-deployment hardening for a first self-hosted web release**.

Honest placement:

- **Web lane:** late internal beta / release-candidate hardening
- **Desktop lane:** internal preview / post-web hardening lane
- **Overall product:** not “public GA SaaS,” but **ready to target a first controlled self-hosted deployment**

Recommended first deployment:

1. **Ship the web self-hosted lane first**
2. Use the existing **Docker -> Coolify/VPS** path
3. Keep scope to the **GA surfaces only**:
   - `/hq`
   - `/command`
   - `/intel`
   - `/alpha`
   - `/cyber`
   - `/recon`
   - `/vault`
   - `/resources`
4. Treat desktop as a second deployment wave after the web lane is stable

## Why this stage assessment is justified

The repo already has most release-candidate ingredients:

- production build succeeds via `npm run build`
- shared verification gate succeeds via `npm run verify`
- focused browser regression succeeds via `npm run hq:e2e`
- release policy and GA surface matrix already exist
- Dockerfile exists and uses Next standalone output
- Coolify/VPS and secured desktop runbooks already exist
- protected diagnostics/status endpoints already exist
- local first-runtime proof is already automated

Strongest evidence from this audit:

- `npm run runtime:fresh-proof` passed end-to-end
  - isolated production build on a fresh dist dir
  - runtime consistency passed
  - auth regression passed
  - route integrity passed
  - release smoke passed

That is a much stronger signal than “the app runs on localhost.” It means the current web runtime can already survive a clean build-and-boot verification loop.

## What stage we are *not* in yet

We are **not yet at broad public-production maturity**.

Reasons:

- first real remote deployment has not been proven on an actual host in this audit
- Docker/Coolify deployment is documented, but not yet re-proven here against a real remote target
- desktop lane still has known remaining work:
  - end-to-end isolation validation
  - signing
  - SBOM / trusted artifact story
- local GitHub auth on this machine is currently broken for `npm run handoff:pull`
- unit-test execution on this machine has been inconsistent in prior batches and should not be treated as the primary release gate

## Current maturity by area

### Product surface maturity

- **GA web experience:** strong enough for first controlled deployment
- **Internal/beta routes:** should remain excluded from public support promise
- **HQ/chat behavior:** actively improving, but already usable enough for a controlled first release if scope is kept tight

### Operational maturity

- **Build and runtime scripts:** strong
- **Diagnostics and auth posture:** strong
- **Release smoke / route integrity / fresh-runtime proof:** strong
- **Deployment automation to real host:** moderate
- **Rollback / artifact discipline:** moderate

### Security maturity

- **Token-gated APIs / route policy / connector policy / CSP:** strong
- **Desktop isolation story:** partial
- **Production secret-management proof on target host:** still needs first full run

## Recommended first deployment target

### First target

**Private or limited-access self-hosted web deployment**

Best path:

- VPS
- Coolify
- Dockerfile lane
- TLS enabled
- bearer auth required
- conservative runtime posture:
  - `NEXUS_DEPLOYMENT_PROFILE=web-self-hosted`
  - `NEXUS_NETWORK_MODE=connected`
  - `NEXUS_ENABLE_HIGH_RISK_TOOLS=false`
  - `NEXUS_ALLOW_PAID_APIS=false`

### Why this is the right first deployment

- the docs and scripts are already strongest on this lane
- the product’s main value is already present in browser/web form
- it avoids desktop signing/distribution complexity on the first release
- it keeps rollback simpler
- it gives a real production proof point without overcommitting to packaging/distribution yet

## Deployment plan

## Phase 0 — Freeze the first deployment contract

Goal: define exactly what “first deployment” means.

Required decisions:

- deployment lane: **web only**
- support scope: **GA routes only**
- auth model: **bearer token required**
- runtime mode: **connected**, but with **high-risk tools disabled**
- paid APIs: **off by default**

Exit criteria:

- release scope is written down and not drifting
- no internal/beta routes are described as public-release promises

## Phase 1 — Release-candidate hardening

Goal: close the remaining blockers before touching a real host.

Tasks:

1. Re-run and record the core release gates on the current mainline:
   - `npm run build`
   - `npm run verify`
   - `npm run hq:e2e`
   - `npm run runtime:fresh-proof`
2. Run `npm run eval:agent-runtime:ci` and capture the output as part of the candidate record.
3. Make sure the release checklist is aligned with what is actually enforced today.
4. Fix local machine issues that undermine operator confidence:
   - GitHub credential failure on `handoff:pull`
   - any remaining unit-test runner inconsistency
5. Validate env expectations against `.env.example` so host setup is unambiguous.

Exit criteria:

- all local release-candidate gates are green
- release env contract is clear
- no known auth/runtime blockers remain for the web lane

## Phase 2 — Artifact and container proof

Goal: prove the exact artifact we intend to deploy.

Tasks:

1. Prove the Docker lane on this machine or a controlled build machine:
   - `docker build -t nexus-prime .`
   - `docker run --rm -p 3000:3000 --env-file .env.local nexus-prime`
2. Run `npm run release:smoke` against the running container.
3. Verify:
   - `/api/health`
   - `/api/status`
   - `/api/diagnostics`
   - all GA routes
4. Capture a deployment candidate note with:
   - image tag
   - commit SHA
   - env profile used
   - smoke result

Exit criteria:

- Docker artifact is proven locally
- smoke checks pass against the same artifact intended for hosting

## Phase 3 — Staging or first remote proof

Goal: prove the app on a real host with real TLS and remote runtime conditions.

Tasks:

1. Create the first Coolify application from the repo Dockerfile.
2. Configure:
   - port `3000`
   - TLS
   - `NEXUS_TOKEN`
   - deployment profile envs
   - only the approved connector/provider keys
3. Deploy to a non-public or limited-access hostname first.
4. Run:
   - `npm run release:smoke` against the remote host
   - targeted auth checks
   - manual GA route pass
5. Capture `/api/diagnostics` snapshot for the staged host.

Exit criteria:

- remote host is healthy
- TLS works
- auth works
- GA routes work remotely
- diagnostics snapshot is captured

## Phase 4 — First production deployment

Goal: promote the first real hosted release.

Tasks:

1. Tag the candidate as the first deployment build.
2. Keep a previous known-good image/artifact available.
3. Promote the staged config to the production hostname.
4. Re-run:
   - remote `release:smoke`
   - auth regression spot-check
   - diagnostics/status inspection
5. Record:
   - promotion time
   - image / commit
   - diagnostics snapshot
   - rollback target

Exit criteria:

- production hostname is healthy
- smoke is green
- rollback target is known and accessible

## Phase 5 — First-week stabilization

Goal: make the first deployment durable instead of merely “live once.”

Tasks:

1. Track the first deployment incidents and recovery steps.
2. Record common degraded states from:
   - `/api/diagnostics`
   - `/api/status`
   - operator reports
3. Patch any release-only failures into:
   - self-heals
   - diagnostics
   - runbooks
4. Only after web stability is real, start the desktop release lane.

Exit criteria:

- no recurring critical issues
- runbook reflects real production behavior
- desktop no longer depends on guesswork copied from the web lane

## Key blockers between now and first deployment

### Must close before first real host deploy

- prove Docker artifact on the actual deployment machine
- prove remote host smoke on a real TLS endpoint
- run agent-runtime CI eval as part of the candidate
- document rollback artifact/tag procedure concretely

### Important but not blocking web-first deployment

- desktop signing
- desktop SBOM / release trust packaging
- broader public-release polish on internal/beta surfaces

## Recommendation

Do **not** try to deploy web and desktop together for the first release.

The cleanest path is:

1. finish web release-candidate proof
2. ship the first private/self-hosted web deployment
3. stabilize
4. then treat desktop as its own release program

## Immediate next actions

1. Run and record `npm run eval:agent-runtime:ci`
2. Prove the Docker artifact locally
3. Prepare the first Coolify environment with conservative defaults
4. Run the first remote staging deployment
5. Promote only after staging smoke is green
