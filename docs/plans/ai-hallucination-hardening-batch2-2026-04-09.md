# AI Hallucination Hardening Batch 2 — 2026-04-09

## Why

Batch 1 hardened the main shared system prompt and the specialist HQ prompt layer, but one important drift lane remained: `callAI(...)`.

That helper powers several compact panels and utility flows, and it previously sent raw user prompts with no shared system boundary. In practice that meant those surfaces could still:

- sound more certain than the available evidence
- imply verification or live data checks they never performed
- drift away from the same truthfulness rules the main HQ runtime now follows

This batch closes that gap.

## Scope

In scope:

- Add a direct-call system prompt for raw `callAI(...)` usage
- Make that prompt explicitly deny implicit browsing, file access, and fabricated verification
- Apply the prompt to both cloud and local direct-call lanes
- Harden a remaining legacy prompt path so it reuses the shared truthfulness posture

Out of scope:

- Rewriting every AI feature surface individually
- Adding new providers or new UI bureaucracy
- Changing the main `runAgent(...)` execution model

## Implementation plan

1. Add a reusable direct-call boundary block for AI calls that do not have tool access
2. Add `buildDirectCallSystemPrompt(...)` to `lib/ai.ts`
3. Update `callAI(...)` so both cloud and local paths include that system prompt by default
4. Reuse the shared truthfulness posture in the legacy `AgentOffice` prompt path
5. Add/extend tests for the direct-call prompt contract
6. Re-run repo verification and confirm live route reachability

## Done when

- `callAI(...)` no longer runs as an unbounded raw completion lane
- Direct-call answers are explicitly forbidden from implying searches, file reads, or verification they did not perform
- Legacy prompt paths no longer drift behind the main HQ truthfulness policy
- `npm run type-check`, `npm run verify`, `npm run handoff:write` pass
- Live `127.0.0.1:3000` checks succeed on the touched routes
