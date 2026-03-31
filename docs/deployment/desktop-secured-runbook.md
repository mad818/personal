# Desktop Secured-Network Runbook

## 1) Baseline secure profile

Use these defaults unless operations explicitly approves broader access:

```env
NEXUS_NETWORK_MODE=isolated
NEXUS_ENABLE_HIGH_RISK_TOOLS=false
NEXUS_ALLOW_PAID_APIS=false
```

## 2) Build + launch runtime

```bash
npm run desktop:build-runtime
npm run desktop:start-runtime
```

This binds to localhost by default (`127.0.0.1:3000`).

## 3) Validate security posture

- Health: `GET /api/health`
- Status: `GET /api/status`
- Diagnostics (redacted): `GET /api/diagnostics`

Expected in isolated mode:
- connector routes blocked by policy
- high-risk routes blocked unless explicitly enabled
- paid AI providers blocked unless explicitly enabled

## 4) Temporary escalation workflow

When an operator needs broader access:

1. Set required flags (`NEXUS_NETWORK_MODE=internal|connected`, optional high-risk/paid toggles).
2. Restart runtime.
3. Perform approved task window.
4. Revert to baseline secure profile.
5. Capture `/api/diagnostics` snapshot before and after.

## 5) Incident response quick actions

- Suspected misconfiguration: revert env profile to baseline and restart.
- Unexpected outbound behavior: switch to `NEXUS_NETWORK_MODE=isolated` and verify blocking via status/diagnostics.
- Unauthorized route attempts: review middleware 403 responses and route class in returned payload.
