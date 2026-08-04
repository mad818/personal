# Changelog

Meaningful Nexus Prime changes are recorded here. The project follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses semantic
versioning for release tags.

## [Unreleased]

### Deferred work

- Physical phone and iPad acceptance remains deferred.
- Signed desktop installers, staged-host proof, and Docker rehearsal remain
  release evidence rather than completed claims.

## [1.0.0-rc.1] - Pending publication

### Capabilities

- Added versioned assurance contracts for all 13 assistant capabilities.
- Added privacy-safe outcome receipts, six honest readiness states, evidence
  decay, safe-action ranking, and operator-approved reinforcement.
- Restored protected learning, assurance, and RECON status APIs.
- Exposed the same capability truth in COMMAND, Skills, and Field Manual.

### User experience

- Rebuilt the public README around real operator outcomes, the eight supported
  surfaces, five specialist agents, setup, architecture, and trust boundaries.
- Added a privacy-reviewed production capture and kept the route artwork as the
  deeper product tour.
- Preserved the Homefront Aurora shell and truthful loading, retained-data, and
  unavailable states across the GA routes.

### Intelligence and data

- Kept external feeds behind protected server routes with strict response and
  unavailable-data behavior.
- Consolidated recurring tracked reports into stable `*-latest` evidence so
  current status remains easy to find without accumulating snapshots.

### Security and privacy

- Kept local Ollama as the free default while retaining explicit BYOK lanes,
  including Azure OpenAI.
- Preserved protected-route policy, approval gates, Privacy Shield, publication
  checks, path safety, dependency checks, and JavaScript/TypeScript plus Rust
  CodeQL coverage.
- Raised the global `brace-expansion` floor to `5.0.9` after the newer
  GHSA-rgw5-rvv9-x895 advisory superseded the previous `5.0.8` floor.
- Kept prompts, answers, credentials, private vault data, and live capability
  evidence out of tracked release files.

### Desktop and operations

- Standardized startup on the health-gated `NexusPrime.bat` and
  `npm run operational:start` path.
- Kept Tauri packaging tied to the canonical `.next/standalone` build instead
  of a second tracked frontend snapshot.
- Documented the current Windows/macOS build, isolation, SBOM, signing, and
  trust-chain boundaries.

### Repository hygiene

- Removed StockBot-era release documentation from the active product record.
- Retired duplicate generated desktop output, unreferenced README/capture
  exports, placeholder workspace data, and the superseded PowerShell launcher
  from Git tracking while preserving local runtime boundaries.
- Moved ownership to `.github/CODEOWNERS`, added a review template, and added a
  conventional pull-request title gate.
- Preserved all existing commits, PR links, SHAs, blame history, executable
  tests, current specifications, security controls, recovery material, and
  required archive evidence.

### Verification

- PR 69 was squash-merged as `cd0654ec`, PR 70 as `011ee649`, and PR 72 as
  `ae0eab3c`; the resulting `main` tree is `cf995c58`.
- PR 72 passed Quality, Path Safety, verify-security, JavaScript/TypeScript
  CodeQL, and Rust CodeQL on that exact tree.
- The exact merged tree passes canonical verification, the optimized 41-page
  build, performance, and secure-start checks. Earlier authenticated proof also
  covered every GA route, all three assurance mounts, and a sanitized readiness
  transition with local cleanup.
- Live security-alert inspection, repository settings, the release tag, and
  release publication remain approval-gated or pending external proof.

### Limitations and migration notes

- Existing local `agent-workspace/` data remains on the operator's machine but
  is no longer a tracked publication source. Fresh clones create local runtime
  state from the canonical source seeds.
- Use `NexusPrime.bat` or `npm run operational:start`; `start-nexus.ps1` is no
  longer part of the supported repository surface.
- Desktop output must be rebuilt from source. `desktop/frontend-dist/` is not a
  release input.
