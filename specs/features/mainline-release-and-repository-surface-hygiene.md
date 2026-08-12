# Mainline Release and Repository Surface Hygiene

## Outcome

Nexus Prime has one clean release-candidate tree in which the public showcase
and adaptive capability assurance coexist, obsolete tracked material is removed
only with current proof, and GitHub's active repository surface describes the
current Nexus product. Existing Git history remains intact.

## Current status

PR 69 was squash-merged as `cd0654ec`, PR 70 as `011ee649`, hygiene-only PR 72
as `ae0eab3c`, and the post-merge record in PR 73 as `84f5521`, each with the
exact approved title. The implementation baseline tree `cf995c58` passes
post-merge canonical verification, the optimized 41-page build, performance,
secure startup, Quality, Path Safety, verify-security, and both CodeQL
languages. PR 71 is closed as a preserved, superseded integration draft.

Manual GitHub inspection confirms `desktop`, `public`, and `tests/e2e` now show
the current RC1 baseline label. Dependabot, code scanning, and secret scanning
each report zero open alerts. Repository settings enforce squash-only merges,
PR-title/PR-body squash messages, and automatic merged-branch deletion. Git
history was not rewritten.

Final pre-publication record PR 74 was squash-merged as `5160ac9`. After
Mario's separate approval, tag `v1.0.0-rc.1` and release
`Nexus Prime v1.0.0-rc.1` were published at exact commit
`5160ac9863725a10230a51c4d45c4cb0be218540`; GitHub comparison reports the tag
identical to `main`. The post-publication audit closes every scoped requirement
without a history rewrite, unrelated change, private evidence, or phone/PWA
work. The goal is complete; phone/PWA acceptance remains deferred.

## Starting gap

- PR 69 contains the current public showcase, privacy-reviewed media, metrics
  retention contract, and a large cleanup, but its branch history contains
  superseded capture attempts.
- PR 70 contains the 13 capability-assurance contracts, privacy-safe outcome
  receipts, six readiness states, approval-gated reinforcement, protected APIs,
  and shared operator UI.
- Both PRs started from the same `main` revision and overlap in `package.json`,
  `tasks/todo.md`, and `docs/SYSTEM_STATE.md`; neither proves the combined tree.
- `CHANGELOG.md` still describes StockBot instead of Nexus Prime, and future PR
  hygiene is not enforced by the public contribution surface or repository
  settings.
- GitHub displays the old RPG-retirement commit beside active `public`,
  `tests/e2e`, and `desktop` paths because it is the latest mainline commit that
  touched them. That history is valid, but it should be superseded only by
  substantive current Nexus work.

## Product and repository contract

### 1. Isolated convergence

- Start from the refreshed `origin/main` head in a dedicated worktree.
- Preserve Mario's unrelated dirty root checkout.
- Apply PR 69 first as a squash candidate, then PR 70.
- Reconcile their three overlapping authority/manifest files while preserving
  both tranches and their verification commands.
- Do not merge either upstream PR or mutate GitHub settings during preparation.

### 2. Evidence-backed surface inventory

Every GitHub-visible root path receives one compact inventory row containing:

- current purpose;
- runtime, package-command, test, validator, security, recovery, compatibility,
  or historical ownership;
- current reachability evidence;
- latest `main` commit message;
- disposition: keep, substantively update, consolidate, relocate, remove, or
  retain as historical evidence.

Age, naming, or an unattractive GitHub label is never sufficient removal proof.

### 3. Safe cleanup and ledger

- Consolidate recurring timestamped evidence into canonical `*-latest`
  artifacts where the active validators support that contract.
- Remove dead scripts, duplicate generated output, abandoned capture attempts,
  stale current-product prose, and detached assets/components only after
  reference and package-command checks.
- Preserve active source, build/runtime configuration, security/privacy
  boundaries, executable tests, package-owned validators, task/spec authority,
  required archive evidence, recovery material, licensing, attribution,
  desktop inputs, and ignored private/local boundaries.
- Record path family, previous purpose, disposition, reason, replacement, and
  proof in a grouped removal ledger. Do not create one noisy row per expired
  timestamped artifact.

### 4. Legitimate current-product updates

- `public`: accept PR 69's approved Nexus showcase assets and remove only
  unreferenced superseded artifacts.
- `tests/e2e`: add executable combined-release coverage proving the showcase,
  Nexus shell, and Capability Assurance coexist while preserving auth, route,
  performance, landing, and HQ coverage.
- `desktop`: correct genuinely stale startup, release-baseline, packaging, or
  security documentation/configuration only after verifying Tauri, Rust,
  capability, icon, schema, and generated-runtime ownership.
- Never touch a file solely to change the message GitHub displays beside it.

### 5. Release communication and future hygiene

- Replace the StockBot changelog with a Nexus Prime changelog organized by
  capability, UX, intelligence/data, security/privacy, desktop/operations,
  repository hygiene, verification, and deferred work.
- Prepare concise, factual `v1.0.0-rc.1` release notes without creating the tag
  or release.
- Require PR descriptions to cover change, reason, operator impact,
  verification, security/privacy, removals/migrations, and deferred work.
- Prepare an exact settings proposal for squash-only merging, PR-title commit
  titles, and automatic deletion of merged branches. Apply it only after Mario's
  explicit approval.

## Safety boundaries

- No history rewrite, commit deletion, force-push of `main`, orphan branch, SHA
  invalidation, or blame-history replacement.
- No deletion based only on age, naming, or desired GitHub cosmetics.
- No secret, `.env.local`, private vault/device evidence, browser session,
  generated temporary proof, or machine-specific state in publication scope.
- No unrelated Dependabot merge, branch closure, deployment, dependency batch,
  provider change, phone/PWA acceptance, or `main.bat` inclusion.
- Merges, repository-setting changes, tag creation, and release publication each
  require explicit operator approval immediately before execution.

## Verification

- focused retention, reachability, cleanup-ledger, capability-assurance, docs,
  publication, path-safety, dependency, security, and infrastructure checks;
- TypeScript, lint, formatting, and `git diff --check`;
- canonical `npm run verify` on the exact combined revision;
- optimized production build and post-build performance gate;
- clean secure operational startup with owned-runtime cleanup;
- authenticated browser QA across every GA route, including proof that the
  showcase and Capability Assurance coexist;
- one sanitized receipt moves one capability from `unverified` to `ready`;
- exact-scope and ignored/private-artifact review before publication;
- remote quality, path-safety, verification, JavaScript/TypeScript CodeQL, and
  Rust CodeQL proof before any merge approval request;
- after approved merge, repeat required checks on exact `main`, query live
  Dependabot/code/secret alerts, and inspect GitHub root labels.

## Benefits

- The default branch becomes a coherent release candidate instead of two
  independently verified feature branches.
- GitHub presents the current Nexus identity without falsifying or erasing the
  repository's history.
- Cleanup becomes reproducible and reviewable because every removal has an
  owner, replacement, or non-use proof.
- Release communication becomes useful to operators rather than a raw file or
  commit dump.
- Future mainline history stays concise while detailed evidence remains in PRs,
  specifications, changelogs, and release notes.

## Completion proof

Completion requires authoritative evidence for every item in the user-approved
goal: combined behavior, preserved vital files, removal ledger, updated active
root labels, Nexus changelog and release notes, future squash policy, exact-main
local and remote checks, live security reconciliation, and zero unrelated or
private publication scope. Preparation may stop at the explicit approval gate;
the overall goal remains open until approved external mutations and post-merge
proof are complete.

Completed on 2026-08-11. The final audit confirmed the approved tag, published
release, exact commit identity, successful remote gates, truthful security and
repository-surface evidence, preserved history, and deferred phone/PWA lane.
