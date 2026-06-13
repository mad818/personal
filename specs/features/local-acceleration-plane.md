# LOCAL-ACCELERATION-PLANE

## Objective

Add a secure, optional, free/local acceleration control plane that assimilates
TurboVec for VAULT semantic retrieval and TurboQuant for long-context local
inference.

## Required Behavior

- Protected local API for sanitized status and bounded operator controls.
- Loopback-only companion bridge with optional upstream imports, private
  persisted ledger, local Ollama embeddings, and sanitized command receipts.
- Loopback-only endpoints by default; explicit confirmation for tailnet hosts.
- TurboVec health, stats, upsert, search, filtered search, remove, prepare,
  persist, reload, and rebuild contracts.
- VAULT compiled-page indexing and keyword fallback when TurboVec is unavailable.
- TurboQuant health, capabilities, limitations, stats, actual upstream proof
  and benchmark commands, and OpenAI-compatible provider routing.
- Exhaustive source-parity matrices and focused proof.
- Nexus integration completion based on useful adapted capability coverage,
  protected boundaries, and the offline fallback lifecycle.
- Separate optional upstream-runtime readiness with a strict operator-invoked
  gate that never blocks Nexus integration completion.

## Guardrails

- No public route, paid API, automatic install, automatic model download,
  automatic process launch, secret output, raw embedding output, raw document
  output in status, or visual-shell change.
- No arbitrary command runner. TurboQuant proof/benchmark commands require an
  execution opt-in plus an exact per-request confirmation and use `shell=False`.
- TurboQuant GPL code remains outside Nexus and is never vendored.
- All service calls degrade safely through `try/catch`.

## Verification

- `npm run local:acceleration:runtime:check`
- `npm run local:acceleration:check`
- `npm run local:acceleration:acceptance:require-complete`
- `npm run local:acceleration:acceptance:require-upstream-runtime` when optional
  upstream runtimes are installed
- `npm run source:parity:check`
- `npm run type-check`
- `npm run verify`
- `npm run build`
