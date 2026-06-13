# ESPectre And MasterDnsVPN Native Assimilation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a consent-aware ESPectre WiFi-sensing integration and a loopback-only MasterDnsVPN readiness integration to their existing Nexus surfaces.

**Architecture:** Pure TypeScript contracts normalize and assess both external runtimes. Protected local API routes expose sanitized status and bounded operations; route-local React panels consume those APIs without changing the established visual system. Upstream runtimes remain separate and operator-managed.

**Tech Stack:** Next.js 15 route handlers, React 19 client components, TypeScript, local Node acceptance validator, existing protected API and route-policy boundaries.

---

### Task 1: Acceptance Contract

**Files:**
- Create: `scripts/check-network-source-integrations.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write a failing validator**

Require the spec, both pure helper modules, both protected API routes, both UI panels, source parity matrices, route-policy entries, explicit consent, loopback-only probing, strong encryption, and no tunnel-launch behavior.

- [ ] **Step 2: Run the validator red**

Run: `node scripts/check-network-source-integrations.mjs`

Expected: FAIL because `lib/espectre.ts` does not exist.

### Task 2: ESPectre Contract And Route

**Files:**
- Create: `lib/espectre.ts`
- Create: `app/api/espectre/route.ts`

- [ ] **Step 1: Define normalized telemetry and readiness**

Add `normalizeEspectreTelemetry`, `buildEspectreReadiness`, and `buildEspectreControlEnvelope`. Reject invalid scores, thresholds, hit counts, detector/filter/traffic modes, and missing consent.

- [ ] **Step 2: Add protected local integration route**

`GET` returns sanitized multi-sensor state with a simulated fixture when no real ingest exists. `POST` accepts authenticated telemetry ingestion or creates a bounded control envelope; it never calls an external host.

- [ ] **Step 3: Run focused gate**

Run: `node scripts/check-network-source-integrations.mjs`

Expected: FAIL because the ESPectre UI and MasterDnsVPN files do not exist.

### Task 3: Existing WiFi-Sensing Viewer

**Files:**
- Create: `components/iot/EspectreWifiViewer.tsx`
- Modify: `app/iot/page.tsx`

- [ ] **Step 1: Build the viewer**

Poll protected `/api/espectre`, render multi-sensor motion/score/readiness, and provide threshold/detector/filter/traffic/hit-filter/recalibration controls that create bounded command envelopes.

- [ ] **Step 2: Mount it in IoT**

Add it as a deferred panel beside the existing sensor dashboard and device registry, preserving the current route structure and visual language.

### Task 4: MasterDnsVPN Readiness

**Files:**
- Create: `lib/masterDnsVpn.ts`
- Create: `app/api/masterdnsvpn/readiness/route.ts`
- Create: `components/resources/MasterDnsVpnReadinessPanel.tsx`
- Modify: `components/resources/SecureLinkOpenPanel.tsx`
- Modify: `lib/security/routePolicy.ts`
- Modify: `.env.example`

- [ ] **Step 1: Define safe readiness**

Add `buildMasterDnsVpnReadiness` with authorization, delegated-domain, resolver-count, AES/ChaCha-only, and loopback-only requirements.

- [ ] **Step 2: Add sanitized loopback probe**

The protected readiness route may probe only the configured loopback listener with a short timeout. It must never contact DNS resolvers, the delegated domain, an exit server, or a public IP.

- [ ] **Step 3: Surface readiness**

Mount the readiness panel inside the existing IP-privacy route section. It must state that this is an emergency external transport and does not unlock public links or hide an IP.

### Task 5: Source Parity And Documentation

**Files:**
- Create: `docs/ideas/source-parity/espectre.json`
- Create: `docs/ideas/source-parity/masterdnsvpn.json`
- Create: `docs/deployment/espectre-masterdnsvpn-integrations.md`
- Modify: `docs/ideas/external-links-mapping.md`
- Modify: `docs/SYSTEM_STATE.md`
- Modify: `tasks/todo.md`

- [ ] **Step 1: Record exhaustive capability matrices**

Mark every useful capability implemented/adapted/excluded with proof and keep unsafe or unavailable upstream capabilities explicitly excluded.

- [ ] **Step 2: Document operator setup**

Explain external runtime prerequisites, consent, protected HTTP ingest, loopback-only readiness, and why MasterDnsVPN is not an anonymity layer.

### Task 6: Verification And Handoff

**Files:**
- Modify: `docs/AGENT_HANDOFF.md` and compatibility copies through `npm run handoff:write`

- [ ] **Step 1: Run focused and full verification**

Run: `npm run network:source-integrations:check`, `npm run source:parity:check`, `npm run type-check`, `npm run verify`, and `git diff --check`.

- [ ] **Step 2: Commit and push**

Commit the scoped changes and attempt to push. If GitHub remains unreachable, report the local commit and blocker.
