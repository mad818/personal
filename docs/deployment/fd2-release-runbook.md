# FD2 Release Runbook

FD2 is the first staged web release proof for Homefront/Nexus Prime. The
published `v1.0.0-rc.1` remains unchanged; the active deployment candidate is
`v1.0.0-rc.2`. FD2 remains blocked until the exact verified RC2 commit, a
separately approved tag, and the real Coolify/VPS target exist, but the proof
path below is the lane to run once the operator supplies the missing host,
access, and secrets.

Safe local preparation may proceed independently. Stop for explicit approval
from Mario before provisioning, DNS/TLS changes, staging-secret writes, or the
first external deployment.

## Prerequisites

- Real staged hostname in repo-root `.env.local` as `NEXUS_RELEASE_BASE_URL`.
- Valid `NEXUS_TOKEN` for the staged host.
- Stable private `NEXUS_EVIDENCE_KEY` (at least 128 bits and distinct from
  `NEXUS_TOKEN`) shared by the operator and staged runtime for sanitized
  cross-artifact target correlation and HMAC authentication. It proves key
  possession and tamper resistance inside that boundary, not independent
  server or provider provenance.
- Docker available for local container proof.
- Exact verified RC2 candidate commit and, before a tagged staging claim,
  separate approval to create `v1.0.0-rc.2`.
- Coolify app points at the repo-root `Dockerfile`, exposes port `3000`, and has TLS enabled.
- Web profile is conservative by default:

```env
NEXUS_DEPLOYMENT_PROFILE=web-self-hosted
NEXUS_NETWORK_MODE=internal
NEXUS_ENABLE_HIGH_RISK_TOOLS=false
NEXUS_HIGH_RISK_WRITES_REQUIRE_APPROVAL=true
NEXUS_ALLOW_PAID_APIS=false
```

## Local Proof

Run this before touching the staged host:

```powershell
npm run type-check
npm run verify
npm run build
npm run runtime:proof:3100 -- --routes=/,/hq?focus=hq-chronicle,/command,/resources,/vehicle
```

If `npm run build` fails on Windows with a `.next` lock, stop the managed runtime first:

```powershell
npm run runtime:stop:3100
npm run build
```

## Staged Proof

Once `.env.local` has the real staged base URL and token:

```powershell
npm run release:smoke
npm run release:diagnostics:capture -- --require-staged
```

If you need to prove a different host without editing `.env.local`, run:

```powershell
$env:NEXUS_RELEASE_BASE_URL="https://your-host.example"
$env:NEXUS_TOKEN="your-token"
npm run release:smoke
npm run release:diagnostics:capture -- --require-staged
```

The diagnostics capture overwrites the stable
`docs/metrics/release-diagnostics-latest.json` artifact. It stores a sanitized
target identity rather than the real hostname and records evidence expiry,
bounded route results, HTTPS/security-header posture, and immutable deployment
identity. Runtime environment strings and editable local JSON do not prove
platform provenance; the gate remains blocked until a provider-specific
collector directly verifies Coolify/registry or VPS Docker state. Local Docker
availability is separate from staged-target evidence.
The cross-wave result overwrites `docs/metrics/readiness-rollup-latest.json`.
The GET-only assurance result is captured after the protected-action sequence
below and overwrites `docs/metrics/web-staging-assurance-latest.json`; it never
deploys, restarts, submits auth forms, records capability outcomes, or approves
lessons.
Neither artifact is production proof while required evidence is blocked,
unavailable, or stale.
All recurring evidence follows the stable `*-latest.json` retention contract.

## Required Route Proof

At minimum, the staged capture must include:

- `/api/health`
- `/`
- `/hq`
- `/command`
- `/intel`
- `/alpha`
- `/cyber`
- `/recon`
- `/vault`
- `/resources`
- `/api/status`
- `/api/diagnostics`

Protected diagnostics may return `401` or `403` only when the run intentionally lacks `NEXUS_TOKEN`. With a token, `/api/status` and `/api/diagnostics` must return `2xx`.

## Protected action and known-good

After the initial stable diagnostics capture:

1. Create one temporary client-reported QA receipt through Capability Assurance
   and retain its exact sanitized run ID.
2. Stop for explicit approval. After approval and desktop step-up, invoke
   `remove_temporary_qa_receipts` for that run ID with confirmation
   `REMOVE_TEMPORARY_QA_RECEIPTS`.
3. Run
   `npm run staging:protected-action:proof -- --run-id=<approved-run-id>`.
4. Run `npm run staging:assurance`, then `npm run readiness:rollup`.
5. Record the first fully passing baseline once with
   `npm run staging:known-good:record`.

The order is part of the evidence contract: diagnostics precede the protected
receipt, the proof follows the receipt, and assurance follows the proof.

## Rollback

Before promotion:

- Record the deployed commit SHA, Coolify deployment id, image/tag if available, and the previous known-good deployment.
- Complete the ordered protected-action and known-good sequence above.
- Keep the signed known-good artifact unchanged. The recorder refuses to
  overwrite it; replacement or rotation requires a separately approved release
  action.
- Keep the previous deployment available in Coolify.

If the deployment degrades:

1. Record the rollback start time before changing platform state.
2. Restore the previous deployment in Coolify.
3. Revert env changes to the last known-good values.
4. Re-run `/api/health`, `/`, `/hq?focus=hq-chronicle`, and `/command`.
5. Re-run `npm run release:smoke`.
6. Capture fresh release diagnostics with `--require-staged`.
7. On the restored runtime, create one temporary QA receipt, obtain explicit
   cleanup approval, execute the cleanup, and run
   `npm run staging:protected-action:proof -- --run-id=<approved-run-id>`.
8. Run `npm run staging:assurance` so it projects that exact signed proof.
9. Confirm the restored full commit or image digest in the step 6 diagnostics
   matches the recorded known-good target. Do not overwrite that capture after
   the protected action.
10. Run `npm run staging:rollback:verify -- --started-at=<ISO-8601>
--confirm=I_PERFORMED_PLATFORM_ROLLBACK` to record recovery duration and the
    passing restoration result in `docs/metrics/rollback-proof-latest.json`.

Diagnostics alone cannot be labeled rollback proof. The final artifact records
an operator-confirmed platform action bound to measured restored source/image
identity, a different boot identity, and fresh postchecks; it is not direct
Coolify or deployment-provider API attestation. Diagnostics, assurance, and
protected-action inputs must be no more than 24 hours old and cannot declare an
expiry horizon longer than 24 hours after capture.

## Acceptance

FD2 can move from blocked to proven only when:

- Local proof passed.
- Coolify/VPS deployed the exact verified RC2 candidate from the repo-root
  `Dockerfile` after separate deployment approval.
- TLS is enabled on the real host.
- `npm run release:smoke` passed against the real host.
- `docs/metrics/release-diagnostics-latest.json` reports a matching sanitized
  target, all eight GA routes, HTTPS/security headers, full source/image/schema
  identity, and no blocked staged-host prerequisite.
- The known-good target is documented before promotion and an actual platform
  rollback is later proven in `docs/metrics/rollback-proof-latest.json`.
