# OPERATOR-PREFLIGHT-RUNNER

## Goal

Reduce daily operating burden by adding one local command that answers: "Is Nexus ready enough for me to use from this machine and continue the phone/iPad flow?"

## Scope

- Add `npm run ops:preflight` as a readable operator preflight runner.
- Run existing no-network readiness checks instead of duplicating their logic.
- Continue through all checks even when one fails, then return a single pass/fail exit code.
- Print concise next-action copy for failed checks and the remaining physical phone/iPad acceptance step.
- Add focused validator coverage and wire it into `npm run verify`.

## Guardrails

- No cloud calls, GitHub calls, Docker checks, physical-device simulation, dependency install, background service launch, auth-token reads, `.env.local` reads, raw LAN IP collection, public routes, proxy/VPN/IP-hiding behavior, or ARPG work.
- The runner only executes existing local npm checks and summarizes their output.
- The runner must not write metrics or local proof artifacts.

## Acceptance

- `node scripts/validate-operator-preflight.mjs` passes.
- `npm run ops:preflight:check` passes.
- `npm run ops:preflight` runs all configured checks and prints a summary.
- `npx tsc --noEmit` passes.
- `npm run verify` passes.
