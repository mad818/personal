# FEYNMAN-DOCKER-EXPERIMENTS

## Objective

Implement the Feynman docker-isolated-experiments source-parity row: a policy contract that
validates Docker run parameters, enforces a strict image allowlist and safety flags, and executes
experiments in an isolated container only when both the operator environment variable and the
per-call approve flag are set.

## Runtime Contract

- Expose one protected `exec`-class `feynman_docker_experiment` tool.
- Accept `image`, `command`, optional `work_dir`, `env_vars`, `timeout_ms`, and explicit `approve` inputs.
- `approve` MUST be `true` in tool input and `NEXUS_FEYNMAN_DOCKER_APPROVED=1` MUST be set in the
  server environment; either condition absent → dry-run manifest returned, no Docker spawn (fail closed).
- Validate the image against the allowlist (`python:X.Y`, `node:X`, `jupyter/*-notebook`, `pytorch/pytorch:X`,
  `tensorflow/tensorflow:X`, `ghcr.io/astral-sh/uv:X`).
- Always include safety flags: `--rm`, `--read-only`, `--network=none`, `--security-opt=no-new-privileges`,
  `--cap-drop=ALL`. Never include `--privileged`.
- Capture `stdout` and `stderr`; truncate at 64 KB.
- Return a `DockerRunManifest` (JSON-serializable) with image, flags, command, exit code, output, and
  `dryRun` flag indicating whether the container was actually started.
- In tests, accept a `deps.spawnImpl` fixture to avoid real Docker execution.

## Security Model

- Fail closed on both gates: approve flag AND env var required independently.
- Image allowlist blocks private registries, user-controlled images, and `:latest` without digest.
- No `--privileged` ever accepted; no volume mounts accepted from tool input.
- `--read-only` and `--network=none` always set; cannot be overridden by tool input.
- Env vars passed through Docker `--env` must have names matching `[A-Z_][A-Z0-9_]*`.
- Timeout always applied; maximum timeout is 300 s regardless of caller input.

## Bounded Defaults

- Default timeout: 60,000 ms.
- Maximum timeout: 300,000 ms.
- Maximum output captured: 64 KB per stream (stdout and stderr).

## Guardrails

- No private registry images; no `--privileged`; no volume mounts via tool input.
- No new provider, dependency, route, visual surface, or ARPG change.
- Dry-run manifest returned when either gate is missing; no partial execution.

## Verification

- `npm run feynman:docker:check`
- `npm run feynman:check`
- `npm run source:parity:check`
- `npm run type-check`
- `npm run verify`
