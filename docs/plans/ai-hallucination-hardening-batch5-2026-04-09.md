# AI Hallucination Hardening Batch 5 — 2026-04-09

## Why

The visible evidence-posture pattern now covers the heaviest COMMAND advice panels, but two compact high-trust surfaces still present AI guidance as plain prose:

- `BuyBot` trade rationales
- HQ `/meta` prompt-improvement proposals

Those surfaces influence real action or internal code changes, so they should show grounding posture too.

## Scope

In scope:

- Apply the shared structured-evidence contract to `components/alpha/BuyBot.tsx`
- Preserve structured trade rationale in live rows and saved history
- Harden `components/home/office/officeCommandCenterMeta.ts` so meta-analysis returns visible observed / inferred / verify-next posture alongside queued edits

Out of scope:

- Reworking dense multi-message agent conversations
- Rewriting scheduler or archive surfaces in this pass
- Adding new providers, tools, or APIs

## Implementation plan

1. Add structured trade-rationale support to `BuyBot`
2. Persist structured trade posture in saved signal history
3. Convert HQ `/meta` proposal generation to a structured JSON contract with visible evidence posture in the returned message
4. Re-run verification and live route checks on `/hq`, `/alpha`, and the hallucination-hardening resources lane

## Done when

- `BuyBot` no longer hides trade uncertainty inside a two-sentence prose note
- HQ `/meta` replies visibly distinguish observations from inferred fix recommendations
- The shared evidence pattern remains compact and reusable
- `npm run type-check`, `npm run verify`, and `npm run handoff:write` pass
- Live `127.0.0.1:3000` checks succeed on the touched routes
