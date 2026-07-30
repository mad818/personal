# Desktop isolated-mode acceptance

Use this checklist after `OLLAMA-FIRST-STANDALONE` changes to prove the desktop/local posture.

## Commands

```powershell
npm run desktop:isolation:status
npm run secure:start:check
npm run offline:local:check
npm run local-inference:check
npm run agentshield:check
npm run ollama:stack:check
OLLAMA_ONLY=1 npm run eval:agent-runtime:ci
```

`npm run desktop:isolation:status` is the no-network application-policy baseline. With an already-running desktop-secure runtime, set `NEXUS_RELEASE_BASE_URL` and `NEXUS_TOKEN`, then run `npm run desktop:isolation:status -- --live` to read only `/api/health` and protected `/api/status`. A live pass proves Nexus application posture, not packaged-shell provenance or OS-level packet behavior.

## Expected

1. Secure runtime defaults: isolated network, paid APIs blocked, high-risk tools off.
2. With Ollama running: `/api/ai` uses `provider=ollama` only in isolated mode.
3. With Ollama stopped: intel tabs load; HQ/COMMAND show the intel-only agent gate; agent path does not call cloud providers.
4. `local-inference:check` passes without network access.
5. `desktop:isolation:status` reports every connector/high-risk policy denied in isolated mode and keeps packaged-shell plus OS no-outbound proof explicitly pending.

## Artifact

Optional sanitized rollup paths:

- `docs/metrics/readiness-rollup-*.json`
- `docs/metrics/ollama-stack-*.json`

Do not commit tokens, cookies, or raw LAN IPs into metrics artifacts.
