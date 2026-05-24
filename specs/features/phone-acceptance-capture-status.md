# PHONE-ACCEPTANCE-CAPTURE-STATUS

## Goal

Make `npm run phone:acceptance:capture` produce the same operator-readable proof status that the Free Local Readiness panel shows. The terminal artifact should tell Mario which phone/iPad proof items landed and which are still missing without opening `data/phone-acceptance-receipts.json`.

## Scope

- Consume the protected receipt API `status` payload during phone acceptance capture.
- Store a sanitized `receiptLiveStatus` block in the generated metrics artifact.
- Store `missingReceiptProofItems` as label-only proof gaps from the receipt live status.
- Keep the existing `receiptPhoneProof`, `combinedPhoneProof`, blockers, and manual flags.
- Add a focused validator and wire it into the phone acceptance receipt check chain.

## Guardrails

- No visual redesign, route widening, public endpoint, cloud service, dependency install, proxy/VPN/anonymity behavior, or ARPG work.
- Do not store token values, cookies, auth headers, raw LAN IPs, full user-agent strings, screenshots, prompt text, response text, transcripts, file contents, or account/payment proof.
- Missing items must be labels only, not receipt bodies or device metadata.
- If the local runtime or protected receipt API is unavailable, capture should continue to write an honest blocked artifact.

## Acceptance

- `node scripts/validate-phone-acceptance-capture-status.mjs` passes.
- `npm run phone:acceptance:receipts:check` runs the new validator.
- `npm run phone:acceptance:capture -- --out-dir=tmp-codex-runtime` writes `receiptLiveStatus` and `missingReceiptProofItems`.
- `npx tsc --noEmit` passes.
- `npm run verify` passes.
