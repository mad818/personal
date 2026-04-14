# Ollama + Groq Connectivity Recovery Batch 2 — 2026-04-10

## Why this batch exists

The current AI lane can fail in a confusing way even when the operator has done the right things:

- Ollama is actually running on `localhost:11434`
- Groq is configured server-side
- but Nexus still falls through to a cloud-policy error because the persisted local model name is stale or invalid

That creates a false impression that Ollama is down when the real problem is often:

1. the saved local model no longer exists locally, or
2. cloud fallback is still blocked by a saved `isolated` network mode

The screenshot pattern for this batch is:

- `Using local model: qwen2.5:7b`
- `Ollama not available — trying free cloud providers...`
- then a cloud-policy block message

When that happens, the system should self-heal instead of expecting the operator to manually discover model drift.

## Goals

- Detect when the configured local Ollama model is not actually installed
- Retry automatically with the strongest detected installed model
- Persist that repaired local model selection so future requests stop failing the same way
- Make Settings show the actual local runtime posture more clearly
- Distinguish:
  - Ollama unreachable
  - Ollama reachable but configured model missing
  - cloud fallback blocked by `isolated` mode

## Non-goals

- No paid dependency additions
- No removal of the free-first/local-first default posture
- No silent automatic switch from `isolated` to `connected`
- No provider-direct browser calls outside the existing app contracts

## Implementation plan

1. Add shared Ollama model-resolution helpers
   - detect installed models from `/api/tags`
   - match exact or family-compatible names
   - choose a good fallback when the requested model is missing

2. Apply the self-heal to the main AI call paths
   - HQ/agent loop local lane
   - direct-call AI helpers used by compact surfaces

3. Improve Settings visibility
   - show whether Ollama is reachable
   - show detected installed models
   - offer an explicit `Use detected model` repair action when needed

4. Improve operator messaging
   - missing model should not masquerade as “Ollama unavailable”
   - blocked cloud fallback should mention the actual saved mode

5. Re-verify
   - `npm run type-check`
   - `npm run verify`
   - targeted unit coverage for model resolution
   - `npm run handoff:write`
   - live site check on `127.0.0.1:3000`

## Acceptance

- If Ollama is reachable and at least one model is installed, Nexus can recover from a stale saved local model name without manual file editing
- The recovered model is visible and persisted in app settings
- The operator can tell whether the failure was local-model drift, local runtime unreachability, or cloud-policy block
- The website is running when the batch is closed
