# Secure Runtime Gate Design

## Decision

Add one fail-closed startup command rather than another status-only report or a permissive warning wrapper. The command makes secure local production startup the default and keeps broader private-network binding explicit.

## Profiles

`local` is the default profile. It binds to `127.0.0.1`, requires a strong Nexus token, forces isolated network mode, disables paid APIs and high-risk tools, and requires approval for high-risk writes.

`tailnet` is the private-network profile. It binds to `0.0.0.0` only after `--confirm-private-network` is supplied. This enables operator-managed Tailscale or private-LAN access but does not claim the bind is Tailscale-only.

## Startup Flow

1. Optionally initialize a missing or weak local token through explicit `secure:init`; never rotate an already-strong token and never print token values.
2. Load `.env.local` through the existing dotenv dependency without printing values.
3. Validate the requested profile and token posture.
4. Confirm a production build exists.
5. Run the fast safety gate, or full `npm run verify` when requested.
6. In `--check` mode, stop after reporting safe posture.
7. Otherwise launch `scripts/start-runtime.mjs` with locked-down environment values.

## Error Handling

Any failed policy, token, build, or gate check blocks launch with a value-free recovery message. The launcher never falls back to development mode and never silently broadens the network profile.

## Testing

A functional validator proves local and tailnet profile resolution, weak-token rejection, confirmation enforcement, locked policy values, production-build detection, package wiring, and static no-secret-output/no-development-fallback boundaries. Full repository verification and production build remain final gates.
