# SECURE-RUNTIME-GATE

## Goal

Make the safest efficient Nexus runtime posture the easiest way to start the project.

## Scope

- Add `npm run secure:start` as a fail-closed production-runtime launcher.
- Default to the `local` profile:
  - bind `127.0.0.1`
  - use `NEXUS_NETWORK_MODE=isolated`
  - disable paid APIs and high-risk tools
  - require approval for high-risk writes
- Add an explicitly confirmed `tailnet` profile:
  - bind `0.0.0.0` for operator-managed Tailscale/private-network access
  - require `--confirm-private-network`
  - preserve the same isolated, unpaid, high-risk-disabled posture
  - report private-network phone/iPad access enabled on the selected port
- Require a non-placeholder `NEXUS_TOKEN` of at least 24 characters.
- Add `npm run secure:init` to create or replace a missing/weak local token in ignored `.env.local` without printing it.
- Never replace a token that already satisfies the secure policy.
- Require an existing production build; never silently fall back to `next dev`.
- Run a fast startup safety gate before launch.
- Support `--check` for policy/build/gate validation without starting the runtime.
- Support `--full-verify` when the operator wants the complete `npm run verify` gate before launch.
- Add `npm run secure:start:check` and wire its validator into `npm run verify`.

## Fast Gate

The default fast gate runs:

- `npm run publication:safety:check`
- `npm run security-scan`
- `npm run security:boundaries`

It does not run the full repository verification suite on every normal start.

## Guardrails

- Never print, hash, or expose the token value; only explicit `secure:init` may persist a generated token to ignored `.env.local`.
- Never weaken route policy, middleware, protected actions, or auth.
- Never enable connectors, paid APIs, high-risk tools, or connected network mode.
- Never bind beyond localhost without explicit private-network confirmation.
- Never claim `0.0.0.0` is Tailscale-only; firewall and tailnet policy remain operator-managed.
- No dependency installs, network calls from the gate, background scheduling, UI, public-route, provider, or ARPG changes.

## Acceptance

- Local profile resolves to localhost plus the locked-down runtime policy.
- Tailnet profile is blocked without explicit confirmation and locked down when confirmed.
- Weak, missing, or placeholder tokens are blocked without printing their value.
- Missing production builds are blocked.
- `--check` validates without starting a runtime.
- Fast gates block launch on failure.
- Shutdown signals propagate through the secure gate and existing runtime launcher so foreground servers do not remain orphaned.
- `npm run secure:start:check` and `npm run verify` pass.
