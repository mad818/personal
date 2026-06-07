# Secure Runtime Gate

Use the secure runtime gate when the goal is to run Nexus with the smallest practical attack surface and no paid-service dependency.

## First Secure Setup

Build the production runtime, then initialize a strong local token:

```powershell
npm run build
npm run secure:init
```

`secure:init` creates or replaces only a missing or weak `NEXUS_TOKEN` in ignored `.env.local`. It never prints the token and never rotates an already-strong token. Existing browser sessions may need to sign in again after a weak token is replaced.

## Local-Only Startup

Check without starting:

```powershell
npm run secure:start -- --check
```

Start the foreground production runtime:

```powershell
npm run secure:start
```

The local profile binds to `127.0.0.1:3000`, forces isolated network mode, disables paid APIs and high-risk tools, and requires approval for high-risk writes.
Use `Ctrl+C` to stop it; shutdown signals propagate through the launcher to the production server.

## Tailscale Or Private-Network Startup

Check without starting:

```powershell
npm run secure:start -- --profile=tailnet --confirm-private-network --check
```

Start:

```powershell
npm run secure:start -- --profile=tailnet --confirm-private-network
```

The tailnet profile binds to `0.0.0.0`, marks private-network phone access enabled, and preserves the same locked-down runtime policy. Binding to `0.0.0.0` is not Tailscale-only: keep the host firewall restricted to private networks and maintain explicit Tailscale ACL/device access.

## Ports And Full Verification

Choose a different port:

```powershell
npm run secure:start -- --port=3100
```

Run the complete repository verification gate before starting:

```powershell
npm run secure:start -- --full-verify
```

Normal startup uses the faster safety gate:

- publication safety
- static security scan
- security boundary validation

## Fail-Closed Conditions

Startup is blocked when:

- the token is missing, weak, or a placeholder
- a production build is missing
- the profile is unsupported
- private-network binding lacks explicit confirmation
- a startup safety gate fails

The command never falls back to a development server, enables paid APIs, enables high-risk tools, or prints the token.
