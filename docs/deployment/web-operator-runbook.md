# Web Operator Runbook

## Purpose

This is the operator-facing runbook for the canonical web deployment lane:

- Docker
- Coolify / VPS
- self-hosted TLS endpoint

Preparation is not deployment authority. Stop for Mario's explicit approval
before provisioning or purchasing hosting, changing DNS/TLS, writing or
rotating staging secrets, or initiating the first external deployment.

## 1) Deployment profile

Recommended defaults for production web self-hosting:

```env
NEXUS_DEPLOYMENT_PROFILE=web-self-hosted
NEXUS_NETWORK_MODE=internal
NEXUS_ENABLE_HIGH_RISK_TOOLS=false
NEXUS_HIGH_RISK_WRITES_REQUIRE_APPROVAL=true
NEXUS_ALLOW_PAID_APIS=false
```

Only opt in to high-risk routes or paid providers when the use case is explicit and approved. For phone access while the desktop is off, use [`phone-access-coolify.md`](./phone-access-coolify.md).

## 2) Build and run

The published `v1.0.0-rc.1` release remains immutable at
`5160ac9863725a10230a51c4d45c4cb0be218540` and is not the active deployment
candidate. For staging, build only the exact verified commit selected for
`v1.0.0-rc.2`. The candidate name is approved, but the tag does not exist until
Mario separately approves tag creation. A tree-equivalent mirror or an
operator-supplied version string is not exact release provenance.

### Local container smoke

```bash
docker build -t nexus-prime \
  --build-arg NEXUS_BUILD_COMMIT_SHA=<full-40-char-commit> \
  --build-arg NEXUS_RELEASE_TAG=<release-tag> .
docker run --rm -p 3000:3000 --env-file .env.local nexus-prime
```

The RC2 candidate contains the runtime identity and OCI-label contract. Direct
Coolify/registry or VPS Docker evidence must still bind its exact source and
image to the staged target; environment strings cannot self-attest that proof.
The published RC1 tag is never moved or recreated.

### Coolify

Follow:

- [`coolify.md`](./coolify.md)
- [`fd2-release-runbook.md`](./fd2-release-runbook.md)

Use the repo-root `Dockerfile` and expose port `3000`.

## 3) Required environment contract

Minimum:

```env
NEXUS_TOKEN=...
NEXUS_EVIDENCE_KEY=...
NEXUS_DEPLOYMENT_PROFILE=web-self-hosted
```

`NEXUS_EVIDENCE_KEY` is a separate stable private HMAC key (at least 128
bits) shared by the operator and staged runtime. It correlates sanitized target
identity and authenticates evidence envelopes. This proves key possession and
tamper resistance inside that trusted boundary, not independent server or
deployment-provider provenance. Do not reuse `NEXUS_TOKEN`;
authentication-token rotation must not change target identity.

Optional:

- one free/BYOK AI provider key for phone use while desktop Ollama is off
- data connector keys
- connector policy JSON

Source of truth:

- [`.env.example`](../../.env.example)

## 4) Post-deploy smoke

Run against the deployed host:

```powershell
$env:NEXUS_RELEASE_BASE_URL="https://your-host.example"
$env:NEXUS_TOKEN="your-token"
npm run release:smoke
npm run release:diagnostics:capture -- --require-staged
```

The diagnostics command writes only
`docs/metrics/release-diagnostics-latest.json`. It records a sanitized target
identity rather than the hostname, enforces HTTPS for remote staging, covers
all eight GA routes, bounds response bodies, checks security/no-store headers,
and fails closed on missing independently verified immutable deployment
identity. Runtime environment values and locally editable JSON are claims, not
platform provenance. The current repository deliberately has no generic
platform-proof importer; a future provider-specific collector must query
Coolify/registry or VPS Docker state directly and bind it to the target before
this gate can pass. The readiness
command writes only `docs/metrics/readiness-rollup-latest.json`; missing or
expired evidence is not success.
The staging assurance command remains GET-only, but it runs later in the
ordered protected-action flow below. It validates runtime consistency, the
sanitized diagnostics contract, auth rejection/acceptance, all eight feed
payload shapes, and Capability Assurance without deploying, restarting,
submitting token forms, recording receipts, or approving lessons. It writes
only `docs/metrics/web-staging-assurance-latest.json`.
All recurring evidence follows the repository's stable `*-latest.json`
retention contract.

Then manually verify:

- `/api/health`
- `/api/status`
- `/api/diagnostics`
- HQ, COMMAND, INTEL, ALPHA, CYBER, RECON, VAULT, Resources

## 5) Protected action and known-good order

Use one exact sanitized run ID throughout this sequence:

1. Create one temporary client-reported QA receipt through the existing
   Capability Assurance QA flow and retain its run ID.
2. Capture the stable staged diagnostics with
   `npm run release:diagnostics:capture -- --require-staged`.
3. Stop for explicit approval of the cleanup action. After approval and the
   required desktop step-up, invoke `remove_temporary_qa_receipts` for that run
   ID with confirmation `REMOVE_TEMPORARY_QA_RECEIPTS`.
4. Capture the resulting signed receipt with
   `npm run staging:protected-action:proof -- --run-id=<approved-run-id>`.
5. Run `npm run staging:assurance`, then `npm run readiness:rollup`.
6. If every input is current and passing, run
   `npm run staging:known-good:record` once.

Do not reorder these steps. Known-good validation requires stable diagnostics
before the protected cleanup receipt, the signed proof after that receipt, and
final assurance after the proof. The recorder refuses to overwrite an existing
known-good artifact.

## 6) Connector and network policy

- `isolated`: no outbound connector routes
- `internal`: intranet-safe or limited connector posture
- `connected`: approved external connectors

If a connector must be disabled without code changes, use:

```env
NEXUS_CONNECTOR_POLICY_JSON={"news":true,"flights":false}
```

## 7) Recovery and rollback

If the deployment degrades:

1. Note the rollback start time before changing platform state.
2. Revert the env profile and restore the previous known-good image or commit
   through the real platform rollback path.
3. Capture restored-runtime diagnostics with
   `npm run release:diagnostics:capture -- --require-staged`.
4. Create one temporary QA receipt on the restored runtime, obtain explicit
   approval, perform the exact cleanup action, and capture it with
   `npm run staging:protected-action:proof -- --run-id=<approved-run-id>`.
5. Run `npm run staging:assurance` so it projects that same signed proof.
6. Run the rollback verifier with the recorded start time.

Use the restored-runtime diagnostics captured in step 3 to verify that the full
source commit or image digest matches the recorded known-good target. Do not
overwrite that ordered capture after the protected action. Record actual
restoration and post-rollback checks in the stable
`docs/metrics/rollback-proof-latest.json`. A diagnostics exit code by itself is
never rollback proof.

The pre-promotion sequence in section 5 writes an HMAC-authenticated known-good
baseline only from matching current diagnostics, assurance, and
protected-action evidence. The command refuses to overwrite an existing
baseline; replacement or rotation requires a separately approved release
action. Inputs must be no more than 24 hours old, and their declared expiry
horizons cannot exceed 24 hours after capture.

After the real platform rollback and fresh diagnostics/assurance captures:

```powershell
npm run staging:rollback:verify -- --started-at=<ISO-8601> --confirm=I_PERFORMED_PLATFORM_ROLLBACK
```

The verifier records an operator-confirmed platform action and requires matching
full source commit and image digest, a different runtime boot identity, fresh
bound post-rollback checks, recovery duration, and the explicit confirmation.
It neither performs the rollback nor directly attests the platform action
through a provider API.

Keep the previous artifact available before every promotion.
