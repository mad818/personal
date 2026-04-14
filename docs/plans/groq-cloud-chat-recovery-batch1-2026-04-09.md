# Groq Cloud Chat Recovery Batch 1

## Why

Groq and other free cloud chat lanes can be configured in Settings, but the app currently treats `/api/ai` like a high-risk action route. That makes a normal operator chat request fail under isolated posture even when a free cloud key is present, and the UI still labels those providers as `ready`. The result feels like a broken key instead of a policy mismatch.

## Goals

1. Let normal cloud inference follow the correct connector-style network posture instead of the same gate as tool/action routes.
2. Make Settings show truthful cloud-chat readiness, including when policy is the blocker.
3. Make chat fallback errors explain the exact self-heal path when Ollama is down and cloud inference is blocked.
4. Keep high-risk tool/action routes protected.

## Non-goals

1. Do not broaden `/api/tools` or other action routes.
2. Do not auto-enable paid providers.
3. Do not add a second provider configuration model.

## Acceptance

1. A configured Groq key no longer looks `ready` when the active security posture still blocks cloud chat.
2. `/api/ai` is not forced behind the same `high_risk` gate as action/tool routes.
3. When Ollama is unavailable and cloud chat is policy-blocked, the user sees a concrete fix path instead of a generic provider outage.
4. Free-first/local-first posture remains unchanged.

## Verification

1. `npm run type-check`
2. `npm run verify`
3. `npm run handoff:write`
4. Live checks for `/`, `/hq`, and the touched chat/settings routes on `127.0.0.1:3000`
