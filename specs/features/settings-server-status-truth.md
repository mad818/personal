# Settings Server Status Truth

## Problem

`SettingsDrawer` currently treats a failed `GET /api/settings` as a non-fatal empty result. Because API-key rows read that empty map as authoritative, every server-side key is displayed as `not set` even though the browser has only unknown state and no verified server state. The post-save refresh repeats the same unchecked, silent request pattern.

## Contract

- One pure loader owns the settings response boundary for both drawer-open and post-save refreshes.
- HTTP failures, network failures, malformed JSON, and payloads without a boolean key-status map resolve to a safe unavailable result.
- The drawer distinguishes idle, checking, verified, and unavailable states. Only a verified response may render `set` or `not set`.
- Loading and success use accessible status feedback. Failure uses an accessible alert with a local retry action.
- A stale request cannot overwrite a newer refresh.
- A successful settings mutation remains successful if its follow-up read fails; the follow-up failure is reported separately as unavailable status.

## Boundaries

- Keep raw key values server-side and never include them in read results, errors, tests, or browser persistence.
- Do not call providers, start a runtime, write `.env.local`, add a dependency, or change the settings API route.
- Do not touch phone/PWA acceptance or RPG paths.

## Verification

- Runtime fixtures cover success, non-2xx, malformed JSON, missing/invalid key status, and a rejected request.
- A static contract gate checks shared-loader use, honest labels, retry and live-region semantics, canonical verification wiring, and task/spec evidence.
- TypeScript, lint, formatting, canonical verification, production build, publication safety, handoff, diff, and changed-path checks complete before handoff.
