# Phone Access, Free Local Path

## Purpose

Use this when you want phone access with no in-app charges, no paid VPS default, and no required cloud AI provider. The desktop stays on, Homefront runs locally, Ollama answers locally, and the phone connects to the desktop over the same private network.

If the desktop is off, desktop-local Ollama cannot answer. For desktop-off access, use an always-on machine you already own or the optional hosted runbook in `phone-access-coolify.md`.

## V1 operating model

- Host: this desktop runtime
- AI: local Ollama
- Cost posture: no in-app charges, no required paid APIs, no paid hosting default
- Network: private LAN, or optional Tailscale personal/free tier
- State: phone-local browser/PWA storage for v1
- Safety: token-gated, isolated network mode, high-risk tools disabled

## Environment

Keep the free local defaults:

```env
NEXUS_TOKEN=<long-random-password>
NEXUS_DEPLOYMENT_PROFILE=local-dev
NEXUS_NETWORK_MODE=isolated
NEXUS_ALLOW_PAID_APIS=false
NEXUS_ENABLE_HIGH_RISK_TOOLS=false
NEXUS_HIGH_RISK_WRITES_REQUIRE_APPROVAL=true
NEXUS_PHONE_LAN_ENABLED=false
NEXUS_PHONE_LAN_PORT=3100
```

`NEXUS_PHONE_LAN_ENABLED=false` is intentional. LAN exposure should be explicit for the session where you need phone access.

## Start phone LAN mode

From the repo root:

```powershell
npm run phone:lan:check
npm run offline:local:check
npm run phone:lan:start
```

The launcher binds the runtime to `0.0.0.0`, keeps `NEXUS_NETWORK_MODE=isolated`, keeps `NEXUS_ALLOW_PAID_APIS=false`, and prints both the phone home URL plus the direct HQ URL:

```env
NEXUS_PHONE_LAN_ENABLED=true
```

```text
http://<LAN-IP>:3100
http://<LAN-IP>:3100/hq?focus=hq-chronicle
```

If Windows asks for firewall permission, allow Node/Next on the private network only.

## Phone flow

1. Keep the desktop on and Ollama running.
2. Put the phone on the same Wi-Fi, or connect through Tailscale if LAN is unavailable.
3. Open one printed LAN URL, or copy the direct HQ URL from the **Free Local Readiness** panel.
4. Log in with `NEXUS_TOKEN`.
5. Open `/hq?focus=hq-chronicle`.
6. Send `ping`; it should answer quickly.
7. Ask a real local AI prompt; Provider Health should show Ollama/local posture.
8. Install:
   - iPhone: Safari -> Share -> Add to Home Screen
   - Android: Chrome -> Install app / Add to Home screen

## Readiness proof

Inside the app, open COMMAND or HQ and check **Free Local Readiness**:

- Free invariant: ready
- Network mode: `isolated`
- Paid APIs: blocked
- Ollama: reachable
- Resolved model: installed/running local model
- Session: authenticated
- Phone LAN: enabled with LAN URL
- Phone handoff: copyable phone home URL and direct HQ URL
- Tool posture: high-risk blocked / review-gated

## Boundaries

- This path does not work after the desktop is fully off.
- Homefront does not place calls, charge users, sell subscriptions, or require paid APIs.
- Tailscale is optional and outside Homefront; use the free personal tier only if it fits your setup.
- Phone-local state does not automatically sync with desktop localStorage or Vault state in v1.
