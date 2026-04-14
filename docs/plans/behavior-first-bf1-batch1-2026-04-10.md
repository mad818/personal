# Behavior-First BF1 Batch 1 — 2026-04-10

## Goal

Make HQ chat feel like a real assistant first by splitting simple chat, product help, repo work, and live/current questions into different answer postures before generation starts.

## Implemented

1. Added a pure HQ answer-style router in `components/home/office/hqAnswerStyle.ts`.
   - Classifies prompts as `conversational`, `live_current`, `product_help`, `repo_work`, or `workflow`.
   - Resolves the safest default agent for each style without breaking explicit pins or workflow overrides.
   - Defines one shared answer-style prompt block instead of scattering one-off logic across HQ.

2. Scoped prompt/context injection by answer style in `components/home/office/OfficeCommandCenter.tsx`.
   - Conversational/product-help turns no longer inherit the full live ops bundle by default.
   - Repo-work keeps RAG + lessons while skipping irrelevant live-intel narration.
   - Live/current turns now suppress local speculative context and require retrieval-first behavior.

3. Added retrieval safeguards for live/current questions.
   - HQ now retries once with a forced retrieval directive when a live-sensitive answer finishes without any verified retrieval tool call.
   - If retrieval still does not happen, the final answer is marked unverified instead of pretending local context was enough.

4. Added chronicle reply self-heal.
   - Casual/product-help turns now collapse `Background / Analysis / Recommendation` drift into a direct assistant answer.
   - Greeting-like prompts only auto-rewrite into a simple greeting when the reply actually drifted into memo format.
   - Evidence posture remains hidden on low-friction turns and visible on evidence-sensitive ones.

5. Added regression coverage.
   - `__tests__/hqAnswerStyle.test.ts` covers answer-style routing and healing logic.
   - `tests/e2e/hq-shell.spec.ts` now verifies that simple chat can self-heal memo-style replies.

## Safeguards / Auto-Heals

- Retrieval-sensitive turns self-retry when the first pass fails to verify.
- Casual greetings no longer degrade into project/task-tracker narration.
- Evidence panels only surface when the answer style is evidence-sensitive.
- HQ browser regression now submits via Enter in the composer, which is closer to real usage and avoids transient overlay interception.

## Follow-on

- Finish `BF1C` by improving product-help and repo-help rendering polish further.
- Start `BF2A` so conversational turns can reopen the strongest unfinished exact session quietly in the background.
