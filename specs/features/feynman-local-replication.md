# FEYNMAN-LOCAL-REPLICATION

## Objective

Implement the Feynman local-replication-execution source-parity row: an operator-approved executor
that runs pre-approved replication scripts under the project root, captures structured output, and
returns a bounded evidence receipt.

## Runtime Contract

- Expose one protected `exec`-class `feynman_replicate_run` tool.
- Accept a `script_rel_path` input pointing to a script under the operator-controlled allowlist.
- Accept an explicit `approve` boolean that MUST be `true`; execution is blocked otherwise (fail closed).
- Validate the script path against an allowlist of subdirectories under the project root (`scripts/replication/`, `scripts/experiments/`).
- Reject path traversal (`..`), absolute paths, and blocked directory segments.
- Run via Node.js child_process with a configurable timeout (default 30 s, max 120 s).
- Capture `stdout` and `stderr` to a structured `ReplicationResult`; truncate at 32 KB.
- Return a formatted evidence receipt suitable for Feynman research sessions.
- In tests, accept a `deps.spawnImpl` fixture to avoid real subprocess execution.

## Security Model

- Fail closed: if `approve !== true`, return a blocked result with no side effects.
- Allowlist enforced before any spawn: script must be under `scripts/replication/` or `scripts/experiments/`.
- No shell expansion (`shell: false` in spawn).
- Timeout always applied; maximum timeout is 120 s regardless of caller input.
- NEXUS_REPLICATION_APPROVED=1 injected into subprocess env to signal approval context.
- No network access granted to subprocess by default.

## Bounded Defaults

- Default timeout: 30,000 ms.
- Maximum timeout: 120,000 ms.
- Maximum output captured: 32 KB per stream (stdout and stderr).

## Guardrails

- No arbitrary script paths outside the allowlist.
- No shell expansion or interpolation.
- No new provider, dependency, route, visual surface, or ARPG change.
- Replication result is returned as a receipt string; no automatic disk write by the tool.

## Verification

- `npm run feynman:replication:check`
- `npm run feynman:check`
- `npm run source:parity:check`
- `npm run type-check`
- `npm run verify`
