# AI Hallucination Hardening Batch 3 — 2026-04-09

## Why

The runtime now has a stronger truth boundary, but that only helps if the user can see when an answer is grounded versus inferred.

The highest-risk direct-call panels still render compact AI output as one undifferentiated block of text. That makes a careful answer and an overconfident answer look too similar in the UI.

This batch closes that trust gap by making evidence posture visible on selected answer surfaces.

## Scope

In scope:

- Add one shared helper for compact structured AI answers with:
  - summary
  - observed facts
  - inferred reasoning
  - verify-next checks
- Add one shared UI panel to render that posture without adding heavy copy
- Apply the pattern to:
  - `components/command/AIBriefing.tsx`
  - `components/intel/StrategyFrameworks.tsx`

Out of scope:

- Reworking every AI surface in one pass
- Large new state systems or backend APIs
- Forcing structured output onto long-form agent conversations

## Implementation plan

1. Add a small structured-evidence helper in `lib/`
2. Add a reusable compact evidence-posture component in `components/ui/`
3. Update `AIBriefing` to request JSON-only structured output and render the grounding posture
4. Update `StrategyFrameworks` to use the same pattern with facts derived from the entered framework inputs
5. Add targeted tests for the new parser/helper
6. Re-run verification and live route checks

## Done when

- Briefing and strategy answers visibly separate observed facts from inference
- The UI exposes `verify next` guidance instead of hiding uncertainty in prompt text alone
- The change stays compact and consistent with existing shell components
- `npm run type-check`, `npm run verify`, `npm run handoff:write` pass
- Live `127.0.0.1:3000` checks succeed on `/command` and `/intel`
