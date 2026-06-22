# OLLAMA-FIRST-STANDALONE

## Goal

Nexus Prime runs as a standalone intelligence product on local Ollama (including Hugging Face models pulled into Ollama). Cloud LLMs and editor harnesses are optional operator choices, never runtime dependencies.

## Scope

- `lib/localInferencePosture.ts` — inference posture, local provider chains, Ollama endpoint SSRF guard, cloud escalation policy.
- `lib/intelOnlyDegradedMode.ts` — intel-only degraded mode when Ollama is down.
- Agent and `/api/ai` — no silent cloud escalation under free/local posture.
- HQ/COMMAND degraded gate — agent recovery UX; intel tabs stay up.
- `docs/deployment/ollama-huggingface-local.md` — HF → Ollama operator runbook.
- Settings Ollama catalog model picker.
- Route policy closure for geocode, papers, mcp/gateway, ideas/intake.
- `npm run local-inference:check` validator under verify.

## Guardrails

- No in-app billing; MIT / BYOK only for optional cloud.
- No vendoring ECC, AgentShield binaries, or HF weights.
- Ollama endpoints must validate as loopback (or explicit tailnet when enabled).
- Tier-2 tools remain approval-gated in degraded mode.

## Acceptance

- Isolated mode + Ollama up: agent uses `provider=ollama` only.
- Ollama down: intel dashboard works; agent shows recovery gate; no cloud `/api/ai` from agent auto path.
- `npm run local-inference:check` and `npm run verify` pass.
- Missing API routes registered in `routePolicy.ts`.
