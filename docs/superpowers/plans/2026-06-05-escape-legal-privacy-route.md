# Escape Legal Privacy Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a legal VPN/proxy/Tailscale exit-node readiness layer to the existing Escape secure-link shelf.

**Architecture:** Keep the privacy route as session-only UI state. A small pure helper in `lib/legalPrivacyRoute.ts` defines route modes and readiness text, while `SecureLinkOpenPanel` uses it to lock or unlock public HTTPS links. A static validator protects the contract through `npm run verify`.

**Tech Stack:** Next.js React client component, TypeScript helper module, local Node validator.

---

### Task 1: Contract And Red Validator

**Files:**
- Create: `specs/features/escape-legal-privacy-route.md`
- Create: `docs/superpowers/plans/2026-06-05-escape-legal-privacy-route.md`
- Create: `scripts/validate-escape-legal-privacy-route.mjs`
- Modify: `package.json`
- Modify: `tasks/todo.md`

- [x] **Step 1: Write the spec and task entry**

Record the legal route boundary, supported route modes, and no-false-anonymity guardrails.

- [x] **Step 2: Write the failing validator**

The validator must require `lib/legalPrivacyRoute.ts`, the route selector test IDs, explicit confirmation copy, package script wiring, and verify wiring.

- [ ] **Step 3: Run the validator red**

Run: `node scripts/validate-escape-legal-privacy-route.mjs`

Expected: fail on the missing `lib/legalPrivacyRoute.ts`.

### Task 2: Helper Contract

**Files:**
- Create: `lib/legalPrivacyRoute.ts`

- [ ] **Step 1: Add the legal privacy route helper**

Define `LegalPrivacyRouteKind`, route labels, route descriptions, and `buildLegalPrivacyRoutePosture(routeKind, confirmed)`.

- [ ] **Step 2: Run the validator**

Run: `npm run escape:privacy-route:check`

Expected: fail until the UI uses the helper and exposes required test IDs.

### Task 3: Secure Link UI

**Files:**
- Modify: `components/resources/SecureLinkOpenPanel.tsx`

- [ ] **Step 1: Replace the single privacy checkbox with route selection plus confirmation**

Keep route state session-only and default to `none`.

- [ ] **Step 2: Gate public links through the posture helper**

Public links unlock only when the selected route is legal and confirmed.

- [ ] **Step 3: Add readiness/status markup**

Expose route kind, confirmation status, locked public count, and no-false-anonymity copy.

### Task 4: Verification And Handoff

**Files:**
- Modify: `docs/SYSTEM_STATE.md`
- Modify: `tasks/todo.md`

- [ ] **Step 1: Run focused checks**

Run `npm run escape:privacy-route:check`, `npm run type-check`, `npm run verify`, and `npm run build`.

- [ ] **Step 2: Mark shipped state**

Update task progress and latest shipped state with proof.

- [ ] **Step 3: Commit and push attempt**

Commit the scoped changes and attempt `git push`.
