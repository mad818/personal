# Plinius Safety Assimilation

## Intent

Adapt the useful security lessons from CL4R1T4S, L1B3RT4S, G0DM0D3, V3SP3R, and OBLITERATUS into Nexus as defensive AI-safety features only.

## Scope

- Add a shared prompt-threat taxonomy for benign classification of prompt-injection and unsafe tool-control intent.
- Extend passive Model Lab records with optional source-family provenance and local threat-assessment evidence.
- Refresh the Home office injection guard so agents consume a taxonomy summary rather than raw adversarial examples.
- Add source-parity matrices for the Plinius batch and refresh OBLITERATUS status.
- Wire a focused safety-assimilation validator into the full verification gate.

## Out Of Scope

- No jailbreak prompt corpus, leaked system prompts, or upstream prompt text is vendored.
- No AGPL/GPL implementation code is copied.
- No model-weight projection, steering vectors, safeguard removal, model export, upload, or telemetry.
- No OpenRouter dependency, public dataset publishing, or remote leaderboard.
- No Flipper, RF, NFC, BadUSB, or hardware-attack control path.
- No new top-level route and no RPG work.

## Acceptance

- `npm run plinius:safety:check` proves taxonomy wiring, sanitized classifier behavior, passive Model Lab manifests, and source-parity coverage.
- `npm run source:parity:check` accepts all new matrices with implemented, adapted, or excluded rows and no pending capability in complete matrices.
- `npm run type-check`, `npm run lint`, and `npm run verify` pass.
