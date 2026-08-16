# Web Candidate Staging and Adaptive Reliability Closure

## Outcome

Move Nexus Prime from the published, repository-verified `v1.0.0-rc.1`
baseline to its first real, recoverable HTTPS staging deployment through the
approved `v1.0.0-rc.2` candidate. The exact candidate source must be
identifiable, every web surface and protected boundary must be exercised
against the real target, and one bounded evidence control plane must report
what is ready, degraded, retained, unavailable, stale, blocked, or
approval-required without granting Nexus deployment or mutation authority.

The published RC1 tag remains immutable at
`5160ac9863725a10230a51c4d45c4cb0be218540`. Post-publication documentation on
`main` begins at `43e51e74e1a366c839c553c8e3b978499b81bde8`. Mario approved
`v1.0.0-rc.2` as the active deployment-candidate name and approved one branch,
commit, push, and draft PR for this implementation. That approval does not
authorize merge, tag creation, release publication, secrets, DNS/TLS changes,
or deployment. The exact RC2 candidate commit is recorded only after the
verified commit exists. Phone/PWA and desktop release acceptance remain
separate waves and cannot block the web staging lane.

## Starting gap

- `scripts/readiness-rollup.mjs` has one global blocker list and unconditionally
  includes phone acceptance, so deferred phone/PWA work blocks every release.
- The rollup has no schema version, evidence expiry, lane applicability, or
  structured safe-next-action contract. Required missing evidence can only be
  described in prose.
- current security task prose still describes historical default-branch
  CodeQL and Dependabot blockers even though the accepted RC1 mainline proof
  records zero open Dependabot, code-scanning, and secret-scanning alerts.
- `scripts/release-diagnostics-capture.mjs` persists the configured hostname,
  omits five GA routes, conflates operator Docker availability with target
  health, and has no freshness or immutable deployment identity contract.
- `scripts/cp2-staged-release-rehearsal.mjs` accepts plain HTTP and marks
  rollback captured when diagnostics merely exit successfully. A diagnostic
  capture is not rollback proof.
- the local rehearsal builds an image only; it does not start the container,
  poll health, inspect the non-root/runtime posture, or record an image
  identifier.
- the published RC1 source predates the new OCI/runtime proof contract. Rather
  than move or recreate that release, the active deployment candidate advances
  to RC2 while RC1 remains the immutable historical baseline.
- deployment runbooks still refer to timestamped diagnostics even though the
  repository retention contract requires stable `*-latest.json` artifacts.

## Delivery sequence

### 1. Reconcile current authority

- Mark the historical security tranche complete using only the already
  accepted current zero-open proof; preserve unavailable per-alert metadata as
  unavailable rather than inventing it.
- Reclassify shell port-443 failure as a local CLI environment limitation while
  connector-backed GitHub access remains operational.
- Keep Aurora implementation complete and retain Mario's new-pass visual
  nuance confirmation as a real staging acceptance gate.
- Remove completed RC1 publication work from the actionable queue and rebuild
  the canonical handoff after state changes.

### 2. Versioned wave-readiness contract

The stable `docs/metrics/readiness-rollup-latest.json` artifact uses schema
`nexus-readiness-rollup.v1` and contains three independent lanes:

- `webCandidate` — labeled `Web candidate (v1.0.0-rc.2)` and containing shared
  repository/security/dependency evidence plus web
  diagnostics, HTTPS target, deployment identity, container, and rollback
  evidence;
- `desktop` — shared evidence plus isolation, trust chain, packaging, and
  signing evidence;
- `phonePwa` — shared evidence plus physical-device/PWA evidence.

Every lane contains:

- `id`, `label`, `status`, and `ready`;
- all applicable evidence records;
- explicit blockers;
- one structured `strongestSafeNextAction` with an approval flag and optional
  read-only command.

The allowed status vocabulary is exactly:

- `ready`
- `degraded`
- `retained`
- `unavailable`
- `stale`
- `blocked`
- `approval-required`

Lane precedence is fail closed: an applicable hard failure is `blocked`,
missing required proof is `unavailable`, expired required proof is `stale`, a
remaining human/external gate is `approval-required`, a current outage backed
by explicitly retained verified proof is `retained`, a nonblocking current
failure is `degraded`, and only fresh passing required evidence is `ready`.
Per-evidence state remains visible even when lane precedence selects one
summary status.

Each evidence record contains:

- stable ID and owner;
- sanitized artifact path;
- applicable waves;
- required/optional posture;
- capture time, maximum age, expiry, and freshness state;
- current evidence state and truthful reason.

Required missing, malformed, or timestamp-free evidence is never success.
Current capture time accepts the repository's existing `capturedAt`,
`generatedAt`, `ts`, and `createdAt` fields. Stable exact filenames are
preferred over lexical prefix discovery. The legacy phone/local-AI projection
remains temporarily available to existing offline-report consumers but is
clearly compatibility-only.

### 3. Safe staging preparation

The existing Dockerfile and Coolify/VPS `web-self-hosted` lane remain
authoritative unless Mario explicitly approves another provider.

Local preparation must:

- fail closed unless the exact verified RC2 candidate source revision can be
  proven;
- validate the environment schema without revealing values;
- require HTTPS for any staged-target claim;
- sanitize the target into a non-reversible identifier or approved public
  label rather than persisting its hostname;
- derive that identifier from a dedicated stable private evidence key rather
  than the rotatable authentication token;
- use that same operator/runtime evidence key to authenticate bounded evidence
  envelopes. Its HMAC proves key possession and tamper resistance inside the
  trusted operator/runtime boundary, not independent server or provider
  provenance;
- record full source commit, release version/tag, deployment profile,
  environment-schema version, and externally supplied image digest;
- keep paid APIs and high-risk tools disabled and writes approval-gated;
- distinguish local Docker capability from proof supplied by an approved
  remote build/deployment platform.

Runtime environment strings and locally editable JSON are not independent
platform provenance. RC2 staging identity can pass only when direct
Coolify/registry or VPS Docker evidence binds the exact verified candidate
revision and image digest to the sanitized target. The published RC1 tag and
release remain unchanged. The approved RC2 candidate name is not itself a tag;
creating that tag still requires separate approval.

Container proof must build the exact candidate source, run it on an isolated local
port, poll health, inspect configured non-root posture and image identity, run
the applicable smoke/identity checks, clean up owned resources, and write one
sanitized stable artifact. A missing tag object, unavailable Docker engine,
failed build, failed health check, or cleanup failure is a real nonzero result,
not a green "blocked" rehearsal.

### 4. Live target contract

After explicit deployment approval, the read-only target lane verifies:

- HTTPS/TLS, HSTS, CSP, framing protection, MIME protection, and API
  `no-store` behavior;
- root/alias behavior, health, status, diagnostics, and all eight GA routes:
  `/hq`, `/command`, `/intel`, `/alpha`, `/cyber`, `/recon`, `/vault`, and
  `/resources`;
- valid login, invalid-token rejection, stale-session recovery, refresh
  survival, logout/reset, keyboard/focus behavior, and truthful loading,
  empty, degraded, retained, and unavailable states;
- exact full source commit, image digest, sanitized deployment identifier,
  deployment profile, environment-schema version, and evidence age;
- action prerequisites, readiness, approval posture, expected output,
  verification, recovery, and strongest safe next action.

Unavailable or unimplemented actions cannot appear executable.

### 5. Feed and adaptive-assurance proof

The existing feed reliability and Adaptive Capability Assurance systems are
reused rather than replaced.

The staging proof covers news, CVE, threat, conflict, earthquake, DeFi, Hacker
News, and SEC feeds. Applicable fixtures or live probes prove verified live,
verified empty, retained-on-refresh-failure, total unavailable, retry,
cancellation, stale-completion rejection, bounded validation, and independent
source survival without fabricated neutral values or client-side keys.

All 13 canonical capabilities retain versioned information/action contracts.
One sanitized non-destructive receipt may promote a capability from
`unverified` to `ready`; current proof remains ready only through its freshness
window; expired proof becomes stale/degraded; rejected or unsupported evidence
cannot promote readiness; repeated current failures produce at most one
deduplicated proposed lesson; and no lesson influences future context without
explicit human approval. Prompts and answers are never stored, and temporary
QA receipts are cleaned safely.

### 6. Known-good and real rollback proof

The first fully passing staged deployment becomes the known-good target only
after its commit, image digest, sanitized deployment identifier, schema
version, boot/runtime identity, diagnostics, assurance, and protected-action
evidence are recorded in one HMAC-authenticated artifact. The recorder refuses
to overwrite an existing known-good baseline. Replacing or rotating it requires
a separate approved release action.

Known-good evidence uses one exact sanitized QA run ID and this fixed order:

1. create one temporary client-reported QA receipt;
2. capture stable staged diagnostics;
3. stop for separate approval, then perform the desktop-step-up
   `remove_temporary_qa_receipts` action with confirmation
   `REMOVE_TEMPORARY_QA_RECEIPTS`;
4. capture that receipt with
   `npm run staging:protected-action:proof -- --run-id=<approved-run-id>`;
5. run staging assurance so it projects the same signed proof; and
6. record the known-good baseline once.

Rollback repeats the evidence-producing portion on the restored runtime:
record the rollback start, perform the real platform rollback, capture restored
diagnostics, create and separately approve the temporary QA cleanup, capture
its signed proof, run final assurance, and only then run rollback verification.
Diagnostics alone are never rollback proof.

Every diagnostics, assurance, and protected-action input used by the
known-good or rollback chain must be no more than 24 hours old when validated.
Its declared expiry horizon must also be no longer than 24 hours after capture.
Future-dated, stale, overlong, unsigned, tampered, or cross-target evidence
fails closed.

A rollback receipt is valid only after an operator uses the real platform
rollback path and the verifier confirms the restored commit or image digest,
records recovery duration, and reruns health, auth, routes, smoke, diagnostics,
feed truth, Capability Assurance, and protected-action checks. The assurance
artifact and its nested, target-bound protected-action proof must both be
captured after rollback begins; the protected action must follow restored-runtime
diagnostics and precede the final assurance and rollback proof. The recorded
platform action is an explicit operator confirmation bound to measured restored
identity, a different boot identity, and fresh postchecks. It is not direct
deployment-provider API attestation.

### 7. Bounded operational-assurance command

One operator command aggregates target identity/health and current web route,
auth, feed, capability, security, freshness, container, and recovery evidence.
It writes one sanitized stable latest artifact and ranks the strongest safe
next action.

It is read-only toward source, deployment state, permissions, lessons,
provider configuration, GitHub, and external accounts. It may evaluate and
report; it cannot repair, deploy, restart a remote target, roll back, merge,
approve, publish, purchase, notify, or mutate. Recurring canaries and external
automation require separate approval.

## Approval boundaries

Stop and request Mario's explicit approval immediately before:

- provisioning or purchasing hosting;
- changing DNS or TLS;
- writing or rotating staging secrets;
- the first external deployment;
- recurring canaries or notifications;
- approving a proposed reinforcement lesson;
- merging the implementation PR;
- promoting staging to production;
- creating a tag or publishing a release;
- changing repository settings.

Safe local specification, fixtures, validators, documentation, build, and
read-only preparation continue before those boundaries.

The current approval is narrower: it permits naming RC2 as the active candidate
and publishing the verified implementation as one branch commit and draft PR.
It does not cross any boundary listed above.

## External prerequisites

Full completion requires the exact verified RC2 candidate commit, a separately
approved immutable RC2 tag, a real Coolify/VPS resource, HTTPS hostname, Docker
capability on an approved build environment, deployment access,
`NEXUS_RELEASE_BASE_URL`, `NEXUS_TOKEN`, and `NEXUS_EVIDENCE_KEY` stored only in
ignored local or platform-secret configuration. Missing prerequisites remain
exact blockers; they are not replaced by a different provider or simulated
proof.

## Verification

Before the first external boundary, require:

- deterministic tests for all seven readiness states, evidence expiry,
  missing/malformed proof, lane isolation, shared-gate fanout, sanitization,
  strongest-safe-action ranking, and backward-compatible offline projection;
- focused static checks for stable paths, read-only behavior, HTTPS staging,
  no raw target persistence, no false rollback proof, exact candidate provenance,
  signed known-good immutability, shared-key trust labeling, 24-hour input and
  expiry bounds, source-evidence binding, and owned-resource cleanup;
- `npm run type-check`, `npm run lint`, `npm run verify`, `npm run build`,
  `npm run runtime:consistency`, `npm run runtime:fresh-proof`,
  `npm run eval:agent-runtime:ci`, `npm run cp2:launch:gate`,
  `npm run release:smoke`, `npm run release:diagnostics:capture`,
  `npm run route:integrity`, publication/path/dependency/infrastructure checks,
  and handoff consistency as applicable to the available local runtime.

After approval and deployment, additionally require Docker/image identity,
authenticated target QA, live/degraded feed proof, capability transition and
decay proof, approval-gated reinforcement proof, actual rollback plus
post-rollback checks, Mario's staged Aurora confirmation, GitHub Quality/Path
Safety/verify-security/CodeQL, and current Dependabot/code/secret-scanning
state.

## Safety boundaries

- No phone/tablet/LAN/QR/PWA acceptance, desktop packaging/signing, new GA
  route, new provider, paid default, broad dependency upgrade, visual overhaul,
  bulk external-source assimilation, history rewrite, tag movement, autonomous
  source editing/deployment, permission escalation, or unrelated cleanup.
- No credentials, tokens, private hostname/topology, provider keys, cookies,
  raw environment exports, personal VAULT content, or private evidence in
  tracked artifacts.
- New repositories or posts may be reviewed separately but do not interrupt
  this milestone without an explicit scope decision.

## Completion proof

The goal remains open until current authority is reconciled, all three waves
are independently truthful, the exact verified RC2 candidate runs on a real
HTTPS staged host, source/image identity and all live product contracts pass,
feeds and adaptive assurance prove their failure/decay behavior, a real
rollback restores the known-good deployment, Aurora receives Mario's staged
confirmation, GitHub checks/security stay clear, and a truthful `v1.0.0`
go/no-go package is ready.

If the host, Docker environment, credentials, or deployment approval is absent,
safe preparation may be complete but the overall goal remains blocked at that
external boundary.
