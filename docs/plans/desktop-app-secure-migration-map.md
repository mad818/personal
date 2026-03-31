# Desktop App Secure Migration Map (Nexus)

> Status: Execution-ready planning map
> Date: 2026-03-31
> Objective: migrate Nexus from browser-first deployment to a secure desktop application profile while preserving current feature coverage and internal-network constraints.

---

## 1) North-star outcomes

1. **Single desktop runtime**: one installer, one launch flow, one operator surface.
2. **Secure-by-default networking**: explicit allow/deny policy per connector and per environment profile.
3. **Feature parity**: existing tabs and API-backed modules continue working behind a unified local gateway.
4. **Deterministic operations**: predictable startup checks, health status, and auditable logs.
5. **Offline-first path**: core workspace remains useful with local models + local data packs.

---

## 2) Current system map (what must be connected)

### UI runtime
- Next.js App Router UI with tabbed modules (Intel, Markets, Cyber, Ops, Signals, etc.).
- PWA metadata + icon path already configured.

### API gateway layer (`/api/*`)
Current route inventory to preserve/bridge:
- Core control: `/api/token`, `/api/health`, `/api/status`, `/api/project`, `/api/verify`, `/api/settings`
- Agent/runtime: `/api/ai`, `/api/tools`, `/api/agent-reach`, `/api/mqtt`, `/api/telegram`
- Intel/feeds: `/api/news`, `/api/gdelt`, `/api/conflict`, `/api/cisa-kev`, `/api/cves`, `/api/threat-intel`, `/api/sec-filings`
- Markets/econ: `/api/prices`, `/api/metals`, `/api/commodities`, `/api/fx`, `/api/fear-greed`, `/api/defi`, `/api/polymarket`
- Geospatial/world: `/api/weather`, `/api/earthquakes`, `/api/fires`, `/api/flights`, `/api/maritime`, `/api/geo-scan`, `/api/hacker-news`, `/api/headers`

### Security controls already in place
- Middleware route allowlist blocks non-internal routes unless approved.
- CSP + header hardening for air-gapped profile.

---

## 3) Target desktop architecture (secure + efficient)

## 3.1 Host shell (Tauri-first)
- **Tauri shell** hosts Nexus UI in a desktop window.
- Embed a local Node service for Next standalone server (`127.0.0.1` only).
- Remove public port exposure by default (desktop process attaches directly).

## 3.2 Local gateway contract
- Keep `/api/*` contract stable for UI continuity.
- Add an internal desktop gateway adapter with three route classes:
  1. `local_only` (health, status, project, settings, verify)
  2. `connector_opt_in` (market/intel feeds behind explicit toggles)
  3. `high_risk` (write/automation tools requiring operator approval)

## 3.3 Secrets + identity
- Move secrets from plaintext env usage to OS keychain-backed storage where possible.
- Keep `NEXUS_TOKEN` semantics for local API calls, but mint session-scoped tokens at app launch.
- Enforce token rotation on restart and profile switch.

## 3.4 Network policy engine
- Centralize outbound controls in one policy file (`allowlist`, `blocklist`, `mode`).
- Modes:
  - `isolated`: local-only (no outbound)
  - `internal`: intranet allowlist
  - `connected`: approved external connectors only
- Route-level policy annotations drive runtime enforcement and UI messaging.

## 3.5 Observability and audit
- Structured local logs: startup, auth, policy decisions, connector calls, failures.
- One-click diagnostics bundle (redacted) for troubleshooting on secured networks.
- Health strip reads from local diagnostics endpoint, never external links.

---

## 4) End-to-end connection map

1. Desktop launches Tauri shell.
2. Shell starts local Nexus server process and waits for `/api/health` ready.
3. UI initializes with local token exchange (`/api/token`) and policy snapshot (`/api/status`).
4. Tabs call existing `/api/*` endpoints unchanged.
5. Gateway enforces policy class:
   - local_only: execute
   - connector_opt_in: execute only when connector enabled
   - high_risk: require explicit operator approval + audit log
6. Results returned to UI with provenance metadata (`source`, `mode`, `policy_decision`).

---

## 5) Migration phases

### Phase A — Foundation (desktop bootstrap)
- Scaffold Tauri container + local Next standalone boot.
- Add startup orchestration and readiness probe.
- Add desktop profile config file + schema validation.

### Phase B — Security unification
- Introduce central route policy registry and refactor middleware to consume it.
- Add session token mint/rotate lifecycle.
- Add connector toggles UI with explicit state and policy rationale.

### Phase C — Connector reliability
- Build per-connector timeout/retry/backoff defaults.
- Add cache layer for read-heavy endpoints (news/markets/intel).
- Add graceful degradation labels in UI when connector disabled by policy.

### Phase D — Packaging + operations
- Produce signed installers (macOS/Windows/Linux as supported).
- Add offline update channel strategy for secured environments.
- Publish operator runbook (install, policy config, diagnostics, recovery).

---

## 6) Data classification + safety matrix

- **Class A (local only):** auth token flow, settings, project metadata, health/status.
- **Class B (external read-only):** intel/market feeds, weather, filings, rss.
- **Class C (action/tooling):** automation tools, messaging, gateway actions.

Controls:
- Class A always enabled in all modes.
- Class B disabled in `isolated`, selective in `internal`, allowlisted in `connected`.
- Class C gated by operator approvals + full audit trail.

---

## 7) Performance + efficiency plan

- Keep API contract unchanged to avoid UI churn.
- Add request coalescing and short-lived caches for repetitive polling endpoints.
- Precompute dashboard startup snapshot to reduce first-paint wait.
- Move heavy transforms server-side and stream partial UI payloads.

---

## 8) Definition of done

1. Desktop app launches and serves Nexus with no manual terminal steps.
2. All current tabs render with policy-aware behavior.
3. Isolated mode passes a no-outbound-network verification.
4. Connected mode allows only declared connectors.
5. Security/audit logs are generated and exportable.
6. Installer + runbook validated in a clean environment.

---

## 9) Execution checklist (ready for task breakdown)

- [x] Add `desktop/` workspace with bootstrap scripts.
- [x] Add `lib/security/routePolicy.ts` registry and migrate middleware to policy-driven checks.
- [x] Add connector policy config + schema + defaults.
- [x] Add settings UI for mode + connector toggles + audit indicators.
- [x] Add diagnostics endpoints and export utility.
- [ ] Add packaging scripts + signed build pipeline docs.
- [x] Add secured-network operator runbook.
