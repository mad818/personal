# Phone Access via Coolify

## Purpose

Use this optional hosted mode when the desktop can be fully off and Homefront still needs to be usable from a phone. The phone does not connect to the desktop `localhost` runtime; it connects to an always-on HTTPS deployment on a VPS through Coolify.

This is not the default fully free path because VPS/hosting can involve infrastructure costs outside Homefront. For the no-charge desktop-on path, use [`phone-access-free-local.md`](./phone-access-free-local.md).

## V1 operating model

- Host: VPS / Coolify using the repo-root `Dockerfile`
- Port: `3000`
- Access: phone browser or installed PWA
- AI: free/BYOK cloud provider key configured on the VPS
- State: phone-local browser state first; no cross-device Vault/localStorage sync yet
- Safety: high-risk tools disabled by default

## Coolify environment

Use these defaults for the first phone-access deployment:

```env
NEXUS_TOKEN=<long-random-password>
NEXUS_DEPLOYMENT_PROFILE=web-self-hosted
NEXUS_NETWORK_MODE=internal
NEXUS_ENABLE_HIGH_RISK_TOOLS=false
NEXUS_HIGH_RISK_WRITES_REQUIRE_APPROVAL=true
NEXUS_ALLOW_PAID_APIS=false
```

Add one free/BYOK AI provider key so phone chat still works while desktop Ollama is off:

```env
GROQ_API_KEY=
# or GOOGLE_AI_KEY=
# or OPENROUTER_API_KEY=
```

Optional data connectors can be controlled without code changes:

```env
NEXUS_CONNECTOR_POLICY_JSON={"news":true,"prices":true,"flights":false}
```

## Setup flow

1. In Coolify, create an Application from the Git repo.
2. Select the repo-root `Dockerfile` build.
3. Expose port `3000`.
4. Add the environment variables above.
5. Attach a domain and enable TLS.
6. Deploy.
7. Open `https://your-domain` on the phone and sign in with `NEXUS_TOKEN`.
8. Install from the browser:
   - iPhone: Safari -> Share -> Add to Home Screen
   - Android: Chrome -> Install app / Add to Home screen

## Acceptance checks

Run before deployment:

```powershell
npm run phone:access:check
npm run verify
npm run build
```

Run after deployment:

```powershell
$env:NEXUS_RELEASE_BASE_URL="https://your-domain"
$env:NEXUS_TOKEN="<same-token-used-in-coolify>"
npm run release:smoke
```

Phone checks:

- Log in with `NEXUS_TOKEN`.
- Open `/hq?focus=hq-chronicle`.
- Send `ping`; it should answer quickly without a long model wait.
- Ask a real AI prompt; it should use the configured cloud provider.
- Open `/command?focus=provider-health` and confirm the Provider health lane loads.
- Relaunch from the phone home-screen PWA icon.

## V1 boundaries

- Desktop Ollama is unavailable when the desktop is off.
- Desktop-only sidecars and local services do not exist on the VPS unless separately installed there.
- Browser state is per device in v1; desktop and phone do not automatically share localStorage, saved Vault items, or RPG saves.
- Keep high-risk tools disabled for the public web deployment unless a later review explicitly opens them.
