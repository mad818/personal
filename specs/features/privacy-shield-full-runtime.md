# PRIVACY-SHIELD-FULL-RUNTIME

## Goal

Finish Privacy Shield 2.0 as a real runtime boundary, not only a CLI preview: every cloud-bound AI request fragment must be locally reviewed, blocked or redacted before provider dispatch, and the operator must be able to inspect the same shield posture from COMMAND without sending anything to a model.

## Scope

- Extend the runtime privacy shield to sanitize all provider-bound request fragments:
  - `messages`
  - `system`
  - `tools`
  - `tool_choice`
- Return structured summary metadata:
  - policy label
  - class counts
  - protected fields
  - dispatch mode
  - blocked reason
- Add protected local `POST /api/privacy-shield/preview` for in-app preview.
- Add a COMMAND provider-health preview panel using the protected API.
- Keep `npm run privacy:shield:preview` as the no-network terminal preview.
- Keep all checks under `npm run privacy:shield:check` and `npm run verify`.

## Out of Scope

- No AI/provider calls from the preview route or UI panel.
- No network calls from the CLI preview.
- No reading `.env.local`, token stores, cookies, auth headers, raw receipts, or local files except CLI stdin.
- No file writes, metric artifacts, dependency installs, public routes, background workers, or provider-routing changes.
- No proxy/VPN/IP-hiding guarantee.
- No ARPG work.

## Done When

- The validator fails before the full runtime/UI pieces exist, then passes.
- `protectCloudBoundPayload()` returns sanitized `tools` and `toolChoice` alongside `messages` and `system`.
- `/api/ai` dispatches sanitized `tools` and `tool_choice` to cloud providers.
- `/api/privacy-shield/preview` exists, is route-policy protected as `local_only`, and returns only sanitized preview metadata.
- COMMAND provider health mounts a privacy shield preview panel.
- `npm run privacy:shield:check`, `npm run type-check`, `npm run verify`, and `npm run build` pass.
