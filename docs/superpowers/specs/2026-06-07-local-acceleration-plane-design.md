# Local Acceleration Plane Design

## Goal

Assimilate the complete useful capability surfaces of `RyanCodrai/turbovec` and
`0xSero/turboquant` into Nexus without copying partial command labels, weakening
security boundaries, or changing the visual shell.

## Architecture

Nexus owns one protected local acceleration control plane:

- TurboVec is an optional MIT-licensed local vector runtime used by VAULT and
  memory retrieval. Nexus talks to it through a loopback-only companion bridge
  and bounded HTTP API so the Next.js server, Tauri desktop shell, MacBook, and
  iPad all keep one retrieval contract.
- TurboQuant is an optional separately installed GPL-3.0 vLLM runtime. Nexus
  never vendors its code. The existing AI proxy can explicitly route requests to
  its OpenAI-compatible endpoint and the acceleration control plane exposes
  sanitized health, capability, limitation, validation, audit, and benchmark
  posture.
- The bridge always binds to loopback. A tailnet host is accepted by the Nexus
  client only when the operator explicitly enables the tailnet acceleration
  policy.

The services are optional. Nexus keeps keyword retrieval and Ollama behavior
when either runtime is unavailable.

## TurboVec Assimilation

The Nexus contract covers:

- 2, 3, and 4-bit compressed vector indexes.
- Stable external IDs mapped to collision-checked unsigned 64-bit TurboVec IDs.
- Online batch ingest, lazy dimension lock, prepare/warm-up, search, filtered
  search, deletion, persistence, reload, rebuild, membership, and statistics.
- Candidate allowlists for ACL, route, tag, domain, and time-window filtering.
- Concurrent query support delegated to TurboVec's thread-safe Rust search.
- Corruption and invalid-vector failures returned as bounded errors.
- VAULT compiled-page auto-indexing and protected semantic-search fallback.
- Local recall, compression, latency, persistence, deletion, filter, and
  corruption acceptance proof.

Framework-specific LangChain, LlamaIndex, Haystack, and Agno adapters are not
duplicated inside Nexus because Nexus is the host application. Their useful
behavior is represented by the stable service API and VAULT integration.

## TurboQuant Assimilation

The Nexus contract covers:

- Explicit optional local provider routing through `app/api/ai`.
- `off`, `capture_only`, and `hybrid` operating modes.
- 2/3/4-bit key posture and 2/4-bit value-quality profiles.
- Dense and MoE/full-attention capability reporting.
- Sanitized KV capacity, compression, throughput, latency, quality, and
  concurrency statistics.
- Paper theorem validation, adversarial claim audit, modular test, proof, and
  benchmark command contracts.
- Honest limitation reporting for prefill allocation, linear-attention/Mamba
  exclusion, value-quality loss, full-history dequantization, and model/GPU
  compatibility.

TurboQuant remains a separate GPL runtime. Nexus adapts its complete useful
operator-facing behavior through standard local HTTP interfaces and does not
claim the upstream algorithm is built into the MIT application.

## Data Flow

1. A compiled VAULT page is saved.
2. Nexus sends a bounded document payload to the configured TurboVec service.
3. The service obtains/accepts embeddings, stores compressed vectors with stable
   IDs, and persists its index locally.
4. A protected semantic search sends a query plus optional allowlist/filter
   metadata. If TurboVec is down, Nexus returns the existing keyword result.
5. Explicit TurboQuant AI requests flow through `app/api/ai`, privacy review,
   free/local policy, and the configured OpenAI-compatible local endpoint.
6. `/api/local-acceleration` exposes sanitized runtime posture and approved
   control operations.

## Security And Failure Handling

- No public routes.
- No secret, raw embedding, document body, prompt, response, or internal host is
  returned by health/status calls.
- Loopback is the default. Tailnet endpoints require an explicit environment
  confirmation.
- Payload sizes, timeouts, operation names, bit widths, modes, IDs, and result
  counts are bounded.
- All service calls use `try/catch` and degrade without taking down VAULT or AI.
- No paid API, automatic install, automatic model download, or automatic runtime
  launch.
- No arbitrary shell command execution. Fixed TurboQuant validation commands
  require an environment opt-in plus an exact per-request confirmation.

## Verification

- Source-parity matrices for both repositories.
- Focused runtime contract tests using injected fetch fixtures.
- Static integration validator under `npm run local:acceleration:check`.
- `npm run source:parity:check`, `npm run type-check`, `npm run verify`, and
  `npm run build`.
