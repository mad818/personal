# Handoff Actionable Queue Truth

## Purpose

Keep the canonical Codex handoff from presenting blocked, manual, or remote-only tasks as immediate work when the repository already has a deterministic actionable-queue classifier.

## Contract

- `scripts/generate-handoff.js` must reuse `buildOrbitQueue()` from `scripts/orbit.js`; it must not maintain a second independent unchecked-task selector.
- When actionable tasks exist, the handoff may list at most the first three locally actionable top-level tasks in queue order.
- When none exist, the handoff must say that no locally actionable task is currently proven.
- In the generated `What’s next` section, blocked/manual work may appear only as bounded counts and review guidance, not as promoted task titles; existing non-queue continuation notes are outside this selector.
- The generated handoff must continue linking the full canonical queue and the read-only `npm run orbit:next -- --all` review command.

## Verification

- Runtime fixtures cover mixed actionable/blocked queues, zero-actionable queues, output ordering, the three-item cap, and suppression of blocked task titles.
- The real current queue must generate the truthful zero-actionable posture already reported by ORBIT.
- `handoff:write`, `handoff:check`, ORBIT checks, instruction checks, documentation checks, publication safety, canonical verification, and a changed-path audit must pass.

## Boundaries

- No task is completed, reprioritized, or made actionable by this feature.
- No task file mutation occurs during handoff generation beyond the existing generated handoff outputs.
- No route, API/runtime behavior, provider, dependency, phone/PWA implementation, RPG implementation, deployment, or external state changes.
