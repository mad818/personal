# Nexus Prime — Completion Program (2026)

**Status:** execution document  
**Updated:** 2026-04-02  
**Purpose:** finish Nexus Prime without repeating the auth, hydration, stale-runtime, route drift, and UI inconsistency failures already encountered during hardening.

---

## 1. Stage assessment

Nexus Prime is no longer in product-discovery mode. It is in **late pre-GA hardening**:

- **Web lane:** close to release-candidate quality, but still missing final regression automation and deployment proof.
- **Desktop lane:** functionally present, but still short of a full trust chain (signing, SBOM, artifact verification, stronger isolation proof).
- **Design/system lane:** cinematic IA has started, but it is not yet applied evenly across HQ and all GA surfaces.

This means the work ahead is not "invent more product." It is:

1. Lock scope.
2. Remove repeated failure modes.
3. Finish the whole-app shell pass.
4. Prove both release lanes with evidence.

---

## 2. Non-negotiable completion rules

Before any lane is called complete:

- No new GA surface is added.
- No supported GA surface requires a paid API for baseline usefulness.
- No auth, overlay, or route fix ships without a repeatable regression check.
- No release is promoted from a hot dev session alone; it must pass fresh-runtime validation.
- No desktop artifact is called ready without recorded checksum and trust-chain status.

---

## 3. Regression memory

These are now first-class blockers. A release is not ready if any of these can recur:

### Auth and session failures
- Dead `Connect` button
- Endless `Checking token...`
- Login succeeds but protected routes still reject
- Stale cookie or stale client session poisoning retries
- Reset/logout failing to fully clear auth state

### Runtime and environment failures
- Two dev servers fighting over different ports
- Stale bundle or hot-reload state showing old UI after code changed
- Fresh server not actually being the one the user is hitting
- Runtime warm-up or health checks blocking the real auth path

### Hydration and UI integrity failures
- Server/client text mismatch from inline style blocks
- Decorative or hidden layers stealing pointer input
- Overlay stacks trapping clicks or focus
- Inconsistent submit/click/Enter behavior across forms and controls

### Route and support-contract failures
- Root not resolving to `/hq`
- Legacy aliases drifting away from canonical routes
- Beta/internal routes presenting as supported GA surfaces
- Main nav linking directly to deprecated paths

### Shell and design drift
- Login screen looking polished while GA interiors feel unrelated
- Backgrounds, spacing, motion, and section hierarchy drifting between tabs
- Control chrome overlapping or clipping at common viewport widths

Use [../regression-memory-checklist.md](../regression-memory-checklist.md) as the required no-repeat gate.

---

## 4. Workstreams

## A. P0 — Release blockers

### A1. Auth closure
- Keep one primary auth path: secure handoff + session cookie.
- Add browser-level E2E for success, invalid token, stale session, hard refresh, and logout/reset.
- Add lightweight local auth diagnostics for faster troubleshooting.

**Exit criteria**
- Login survives restart, refresh, stale state, and wrong token.
- Protected APIs work after login without second-step auth.
- Auth no longer depends on decorative UI or warm-up state.

### A2. Regression guardrails
- Turn the regression memory list into release checks and smoke steps.
- Require fresh-runtime validation, not just dev hot state.
- Add explicit stale-runtime and stale-bundle detection to operator troubleshooting.
- Browser proof now includes HQ shell hydration checks, top-rail overlay open/close coverage, and route-contract assertions inside the Playwright auth lane.
- Fresh-runtime proof now builds from a clean `.next`, boots the standalone runtime launcher, and validates runtime identity against dynamic introspection routes.

**Exit criteria**
- Previously seen failures are represented by a checklist or executable check.
- Release-readiness requires that checklist to be green.

### A3. Route and support contract lock
- Ensure the canonical GA set is the only public support surface.
- Keep aliases active, but route all docs, nav, and status payloads through the canonical matrix.
- Validate `/`, `/home`, beta redirects, and internal redirects consistently.
- Keep the main top rail limited to the 7 GA tabs while preserving `/resources` as a supported non-nav surface.

**Exit criteria**
- No public-facing UI or docs point at deprecated paths.
- Alias behavior is stable and covered by route-integrity checks.

## B. P1 — Whole-app cinematic IA completion

**Status 2026-04-25:** Complete in the protected shell. The `cinematic-ia-v1`
contract now stamps root chrome, route stages, lead/support/continuity zones,
and shared empty/loading state primitives across HQ plus every GA surface.
`npm run type-check`, `npm run build`, `npm run hq:e2e`, `npm run verify`, and
`NEXUS_RELEASE_BASE_URL=http://127.0.0.1:3100 npm run route:integrity` passed;
later Playwright reruns were blocked by local Windows `spawn EPERM`, not by a
reported route failure.

### B1. Shared shell rollout
- Extend the cinematic shell, backgrounds, and panel hierarchy across HQ and every GA tab.
- Standardize section headers, viewport framing, spacing rhythm, and motion timing.
- Make the app feel like one product, not one polished gate plus mixed interiors.

**Exit criteria**
- HQ, COMMAND, INTEL, ALPHA, CYBER, RECON, VAULT, and Resources share one obvious visual language.
- No visible overlap, clipping, or random style drift at supported widths.

### B2. Control and overlay safety
- Standardize buttons, segmented controls, drawers, notifications, and floating panels.
- Ensure hidden layers are inert and open layers own z-index and focus intentionally.
- Verify mouse and keyboard safety on every supported GA page.

**Exit criteria**
- No click traps.
- No mixed interaction primitives on the same control family.
- Shared controls expose distinct hover, focus, active, disabled, and loading states.

### B3. Editorial lock-screen polish
- Keep the Sadie treatment safe and non-NSFW.
- Push it through crop, lighting, contrast, composition, styling, and typography so it feels glamorous and intimate without crossing policy lines.

**Exit criteria**
- The lock screen feels premium and aligned with the broader shell.
- The visual treatment remains compliant and does not depend on unsafe content.

## C. P1 — Surface-by-surface hardening

### C1. HQ
- Stabilize the office experience, hydration safety, motion layering, and live status surfaces.
- Make the background and shell feel integrated with the new cinematic system.

### C2. COMMAND / INTEL / ALPHA / CYBER / RECON / VAULT
- Review each surface for layout integrity, empty/degraded states, provenance, and free-first usefulness.
- Remove accidental paid dependency assumptions from the supported experience.

**Exit criteria**
- Every GA surface has a smoke checklist.
- Every GA surface degrades gracefully when optional providers are absent.

## D. P2 — Release engineering closure

### D1. Web lane proof
- Perform a clean Docker + Coolify/VPS release rehearsal.
- Capture diagnostics and rollback evidence.
- Verify TLS, CSP, auth, and smoke gates on the deployed environment.

### D2. Desktop trust chain
- Finish end-to-end isolation verification.
- Record signing/SBOM status for the release.
- Generate and verify checksums for distributable artifacts.

**Exit criteria**
- Both deployment lanes have real runbook-backed proof, not assumed readiness.

---

## 5. Required verification

The following must pass before calling the project complete:

- `npm run type-check`
- `npm run lint`
- `npm run verify`
- `npm run route:integrity`
- `npm run eval:agent-runtime:ci`
- `npm run release:smoke`
- `npm run auth:e2e`
- `npm run runtime:consistency`
- `npm run runtime:fresh-proof`
- auth/browser E2E checks
- target-lane release rehearsal

Required supporting docs:

- [../release-support-matrix.md](../release-support-matrix.md)
- [../interaction-safety-checklist.md](../interaction-safety-checklist.md)
- [../auth-hardening-plan.md](../auth-hardening-plan.md)
- [../regression-memory-checklist.md](../regression-memory-checklist.md)
- [../deployment/release-readiness-checklist.md](../deployment/release-readiness-checklist.md)

---

## 6. Definition of complete

Nexus Prime is complete for this cycle only when:

1. Auth is stable under restart, refresh, stale state, and bad token scenarios.
2. The cinematic shell language is applied coherently across all supported GA surfaces.
3. Supported surfaces remain useful with free/public defaults and optional BYOK only.
4. Web deployment is repeatable with rollback evidence.
5. Desktop artifacts have recorded trust-chain status.
6. Previous regressions are guarded by tests or checklists, not memory alone.
