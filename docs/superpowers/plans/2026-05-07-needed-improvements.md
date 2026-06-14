# Needed Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the most painful current gaps into a ranked, testable improvement program: reliable proof, useful vehicle/drone simulation, reviewable AI operator actions, private RPG closure, and release diagnostics.

**Architecture:** Keep every improvement inside existing routes and contracts. Add small shared helpers and validation scripts instead of new top-level tabs. Preserve Homefront as local-first/free-first, keep Aether Reliquary private inside `/hq`, and keep vehicle/drone work simulation/passive-readiness only.

**Tech Stack:** Next.js 15, React 19, TypeScript, Zustand, Tailwind, existing Node validation scripts, existing Playwright/HTTP proof fallback lane.

---

## Improvement Priority

1. **Runtime proof resilience:** Most needed because repeated `runtime:launch:3100` wrapper timeouts and Windows Playwright `spawn EPERM` keep making good work look broken.
2. **Vehicle/drone scenario simulation:** Most product-important because the landing now promises perimeter/drone capability, but `/vehicle` needs a concrete simulated telemetry/replay lane before hardware exists.
3. **AI operator review workflow:** Most usefulness-per-minute because the assistant can route and answer, but it still needs visible proposed edits, phase/task state, and operator approval history.
4. **Private RPG closure:** Most needed for the personal game lane because art, asset provenance, and release gates are still open-ready or proof-held.
5. **Release diagnostics/runbook:** Most needed for deployment because FD2/CP2 cannot be proven until external env exists, but diagnostics can be made executable now.

---

## Files And Responsibilities

- `scripts/runtime-proof-check.mjs`: one Node proof runner that checks runtime health and key routes after `runtime:launch:3100` times out or succeeds.
- `package.json`: add a script for the proof runner.
- `lib/vehicle/types.ts`: extend the passive telemetry contract if a scenario frame needs missing fields.
- `lib/vehicle/simTelemetry.ts`: keep frame generation deterministic and reusable.
- `lib/vehicle/flightReplayScenarios.ts`: new authored scenario library for perimeter patrol, link degradation, battery descent, and incident review.
- `components/vehicle/TelemetryPanel.tsx`: add replay controls and status explanation.
- `components/vehicle/VehicleArtifactManifestCard.tsx`: surface Vault-ready replay/incident package proof.
- `scripts/validate-vehicle-readiness.mjs`: validate scenario IDs, telemetry schema, and artifact package completeness.
- `lib/assistantOperatorWorkflow.ts`: new shared model for proposed edits, phase state, task plan visibility, and change-log entries.
- `lib/assistantDispatch.ts`: attach workflow signals to dispatch plans without changing provider routing.
- `lib/assistantChatActions.ts`: expose review/edit/change-log action affordances.
- `components/home/HomeChat.tsx`: render the shared workflow actions in Home chat.
- `components/home/office/HQTerminalSection.tsx`: render the shared workflow actions in HQ chronicle.
- `components/ui/CommandBar.tsx`: show compact phase/action state for routed commands.
- `scripts/eval-agent-runtime.js`: add assertions that proposed edits are review-gated and visible.
- `lib/arpgVisualAssetBriefs.json`: define the next approved prologue batch without placeholder or rejected art.
- `lib/arpgAssetManifestData.json`: add only generated/approved runtime asset records after assets exist.
- `docs/assets/arpg-asset-ledger.md`: record provenance, license, and acceptance notes.
- `components/home/arpg/ArpgHud.tsx`: expose approved prologue assets in Adventure/Journal/People only after validation.
- `docs/deployment/fd2-release-runbook.md`: exact staged-host release and rollback procedure.
- `scripts/release-diagnostics-capture.mjs`: capture route/status/build diagnostics into local artifacts without needing Docker.
- `docs/deployment/release-readiness-checklist.md`: link the runbook and diagnostics flow.

---

## Task 1: Runtime Proof Resilience

**Files:**
- Create: `scripts/runtime-proof-check.mjs`
- Modify: `package.json`
- Optional follow-up: `docs/SYSTEM_STATE.md` only after implementation and proof pass

- [x] **Step 1: Add a failing route-proof expectation**

Add this acceptance target to the implementation notes before coding: the command must return nonzero if `/api/health` is not 200, must print per-route status lines, and must allow a launcher timeout to be followed by successful HTTP proof.

Run after implementation:

```powershell
npm run runtime:proof:3100 -- --routes=/,/hq?focus=hq-chronicle,/command,/resources,/vehicle,/internal/vehicle
```

Expected success includes lines shaped like:

```text
[runtime-proof] /api/health 200
[runtime-proof] / 200
[runtime-proof] /hq?focus=hq-chronicle 200
```

- [x] **Step 2: Implement `scripts/runtime-proof-check.mjs`**

Use built-in Node APIs only. Keep it independent from Playwright.

```js
#!/usr/bin/env node

const BASE_URL = process.env.NEXUS_RELEASE_BASE_URL || "http://127.0.0.1:3100";
const DEFAULT_ROUTES = ["/api/health", "/", "/hq?focus=hq-chronicle", "/command", "/resources", "/vehicle"];

function parseRoutes(argv) {
  const routeArg = argv.find((arg) => arg.startsWith("--routes="));
  if (!routeArg) return DEFAULT_ROUTES;
  return routeArg
    .slice("--routes=".length)
    .split(",")
    .map((route) => route.trim())
    .filter(Boolean)
    .map((route) => (route.startsWith("/") ? route : `/${route}`));
}

async function checkRoute(route) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(new URL(route, BASE_URL), {
      cache: "no-store",
      signal: controller.signal,
    });
    const ok = response.status >= 200 && response.status < 400;
    console.log(`[runtime-proof] ${route} ${response.status}`);
    return ok;
  } catch (error) {
    console.log(`[runtime-proof] ${route} ERROR ${error instanceof Error ? error.message : String(error)}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const routes = Array.from(new Set(["/api/health", ...parseRoutes(process.argv.slice(2))]));
  const results = [];
  for (const route of routes) {
    results.push(await checkRoute(route));
  }
  if (results.some((ok) => !ok)) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [x] **Step 3: Add the package script**

Modify `package.json`:

```json
"runtime:proof:3100": "node scripts/runtime-proof-check.mjs"
```

- [x] **Step 4: Prove it works**

Run:

```powershell
npm run runtime:launch:3100
npm run runtime:proof:3100 -- --routes=/,/hq?focus=hq-chronicle,/command,/resources,/vehicle,/internal/vehicle
```

Expected: even if launch times out in the known wrapper path, `runtime:proof:3100` returns 0 when HTTP routes are healthy.

Completed proof: `npm run runtime:launch:3100` found the managed runtime already healthy on `127.0.0.1:3100`; `npm run runtime:proof:3100 -- --routes=/,/hq?focus=hq-chronicle,/command,/resources,/vehicle,/internal/vehicle` returned 0 and printed per-route status; protected `/api/agent-health` and `/api/ollama/catalog` returned `401 AUTH-PROTECTED` from raw shell as expected; `npm run type-check` and `npm run verify` passed.

---

## Task 2: Vehicle/Drone Scenario Replay

**Files:**
- Modify: `lib/vehicle/types.ts`
- Modify: `lib/vehicle/simTelemetry.ts`
- Create: `lib/vehicle/flightReplayScenarios.ts`
- Modify: `components/vehicle/TelemetryPanel.tsx`
- Modify: `components/vehicle/VehicleArtifactManifestCard.tsx`
- Create: `scripts/validate-vehicle-readiness.mjs`
- Modify: `package.json`

- [x] **Step 1: Define scenario contract**

Add a scenario type that is explicitly passive and simulated:

```ts
export interface VehicleReplayScenario {
  id: string;
  label: string;
  posture: "simulation_only";
  summary: string;
  frames: VehicleTelemetryFrame[];
  vaultPackage: {
    title: string;
    tags: string[];
    incidentType: "routine_patrol" | "link_degradation" | "battery_return" | "operator_review";
  };
}
```

- [x] **Step 2: Create authored replay scenarios**

Create `lib/vehicle/flightReplayScenarios.ts` with four scenarios:

```ts
import type { VehicleReplayScenario } from "@/lib/vehicle/types";
import { makeSimulatedTelemetryFrame } from "@/lib/vehicle/simTelemetry";

export const VEHICLE_REPLAY_SCENARIOS: VehicleReplayScenario[] = [
  {
    id: "perimeter-patrol-review",
    label: "Perimeter patrol review",
    posture: "simulation_only",
    summary: "Simulated patrol orbit with operator review and no flight-control authority.",
    frames: [0, 1, 2, 3, 4].map((step) => makeSimulatedTelemetryFrame({ step, mode: "LOITER" })),
    vaultPackage: {
      title: "Vehicle replay - perimeter patrol review",
      tags: ["vehicle", "simulation", "perimeter", "review-first"],
      incidentType: "routine_patrol",
    },
  },
];
```

If `makeSimulatedTelemetryFrame` does not currently accept this shape, add the smallest overload to `lib/vehicle/simTelemetry.ts` and keep existing callers working.

- [x] **Step 3: Add replay controls to the vehicle panel**

In `components/vehicle/TelemetryPanel.tsx`, render:

```tsx
<section data-testid="vehicle-replay-scenarios">
  <p>Simulation only. Nexus does not arm, steer, or mode-switch an aircraft.</p>
  {VEHICLE_REPLAY_SCENARIOS.map((scenario) => (
    <button key={scenario.id} type="button" onClick={() => setActiveScenarioId(scenario.id)}>
      {scenario.label}
    </button>
  ))}
</section>
```

- [x] **Step 4: Add Vault package preview**

In `components/vehicle/VehicleArtifactManifestCard.tsx`, show the active scenario package title, tags, and incident type with `data-testid="vehicle-replay-vault-package"`.

- [x] **Step 5: Add validator**

Create `scripts/validate-vehicle-readiness.mjs` to assert:

```js
const scenarios = require("../lib/vehicle/flightReplayScenarios.ts");
```

If direct TS import is awkward in Node, export a JSON companion or validate via a simple source read that checks these strings: `simulation_only`, `perimeter-patrol-review`, and `vaultPackage`.

- [x] **Step 6: Add script and proof**

Add to `package.json`:

```json
"vehicle:readiness:check": "node scripts/validate-vehicle-readiness.mjs"
```

Run:

```powershell
npm run vehicle:readiness:check
npm run type-check
npm run verify
npm run runtime:proof:3100 -- --routes=/vehicle,/internal/vehicle
```

Completed proof: added `VehicleReplayScenario`, deterministic replay frames, four simulation-only scenarios, `data-testid="vehicle-replay-scenarios"` controls, `data-testid="vehicle-replay-vault-package"` package preview, `scripts/validate-vehicle-readiness.mjs`, and `npm run vehicle:readiness:check`. `npm run vehicle:readiness:check`, `npm run type-check`, `npm run verify`, and `npm run runtime:proof:3100 -- --routes=/vehicle,/internal/vehicle` passed.

### V1.1/V1.2 Extension: Bench + Passive Bridge Readiness

- [x] Add a shared F450 bench/passive-bridge gate model that combines props-off checklist proof, first hardware-day proof, connector posture, and Vault package readiness.
- [x] Render the gate in Vehicle Lab with `data-testid="vehicle-bench-bridge-readiness"` so the operator can see why bridge ingest is blocked or ready.
- [x] Implement `/api/vehicle/telemetry` as a protected local-only passive ingest route for normalized telemetry frames.
- [x] Add `scripts/vehicle-bridge-stub.mjs` as a dry-run read-only payload generator that can optionally post one local frame.
- [x] Add `docs/deployment/vehicle-passive-bridge-stub.md` with the arrival-day runbook and explicit guarantee that Nexus does not arm, steer, or mode-switch the aircraft.
- [x] Extend `npm run vehicle:readiness:check` to catch missing bridge docs, missing stub script, missing route, missing bench gate, and forbidden flight-command strings.

Completed proof: `npm run vehicle:readiness:check`, `npm run type-check`, `npm run lint`, `npm run verify`, and `npm run runtime:proof:3100 -- --routes=/vehicle,/internal/vehicle,/api/vehicle/telemetry` passed; the raw-shell telemetry API check returns `401 AUTH-PROTECTED` as expected. Handoff refresh remains the closeout gate for this extension.

---

## Task 3: AI Operator Review Workflow

**Files:**
- Create: `lib/assistantOperatorWorkflow.ts`
- Modify: `lib/assistantDispatch.ts`
- Modify: `lib/assistantChatActions.ts`
- Modify: `components/home/HomeChat.tsx`
- Modify: `components/home/office/HQTerminalSection.tsx`
- Modify: `components/ui/CommandBar.tsx`
- Modify: `scripts/eval-agent-runtime.js`

- [ ] **Step 1: Add shared workflow model**

Create:

```ts
export type AssistantWorkflowPhase = "answer" | "plan" | "review" | "apply_ready" | "blocked";

export interface AssistantProposedEditSummary {
  id: string;
  label: string;
  files: string[];
  risk: "low" | "medium" | "high";
  requiresApproval: true;
}

export interface AssistantOperatorWorkflowState {
  phase: AssistantWorkflowPhase;
  proposedEdits: AssistantProposedEditSummary[];
  changeLog: string[];
  skillInvocations: string[];
}

export function buildAssistantOperatorWorkflowState(input: string): AssistantOperatorWorkflowState {
  const lower = input.toLowerCase();
  const wantsCodeChange = /\b(fix|implement|edit|change|refactor|update)\b/.test(lower);
  return {
    phase: wantsCodeChange ? "review" : "answer",
    proposedEdits: wantsCodeChange
      ? [{ id: "proposed-edit-1", label: "Review code change before apply", files: [], risk: "medium", requiresApproval: true }]
      : [],
    changeLog: [],
    skillInvocations: [],
  };
}
```

- [ ] **Step 2: Attach workflow state to dispatch**

In `lib/assistantDispatch.ts`, add `operatorWorkflow` to `AssistantDispatchPlan` and call `buildAssistantOperatorWorkflowState(cleanInput)`.

- [ ] **Step 3: Add action labels**

In `lib/assistantChatActions.ts`, map workflow state to shared buttons:

```ts
{ id: "review-proposed-edits", label: "Review proposed edits", kind: "review" }
{ id: "view-change-log", label: "View change log", kind: "diagnostic" }
```

- [ ] **Step 4: Render in all chat surfaces**

Home chat, HQ chronicle, and CommandBar should render the same actions when present. Use the same style pattern already used for `Open workspace`, `Retry local`, and `Reset session`.

- [ ] **Step 5: Extend eval**

In `scripts/eval-agent-runtime.js`, add assertions:

```js
assertFileContains("lib/assistantDispatch.ts", "operatorWorkflow");
assertFileContains("lib/assistantOperatorWorkflow.ts", "requiresApproval: true");
assertFileContains("components/home/HomeChat.tsx", "Review proposed edits");
assertFileContains("components/home/office/HQTerminalSection.tsx", "Review proposed edits");
assertFileContains("components/ui/CommandBar.tsx", "Review proposed edits");
```

- [ ] **Step 6: Prove**

Run:

```powershell
npm run eval:agent-runtime:ci
npm run type-check
npm run verify
npm run runtime:proof:3100 -- --routes=/hq?focus=hq-chronicle,/command
```

---

## Task 4: Private RPG Asset Closure

**Files:**
- Modify: `lib/arpgVisualAssetBriefs.json`
- Modify: `lib/arpgIllustratedAssetBenchContent.json`
- Modify: `lib/arpgAssetManifestData.json`
- Modify: `docs/assets/arpg-asset-ledger.md`
- Modify: `components/home/arpg/ArpgHud.tsx`
- Modify: `scripts/validate-arpg-assets.mjs`
- Modify: `scripts/validate-arpg-visual-briefs.mjs`

- [ ] **Step 1: Lock the next prologue batch list**

Use the open-ready assets from the triage ledger:

```json
[
  "bellroot-vestibule-location",
  "wardens-antechamber-card",
  "ilo-keeper-portrait",
  "descent-ledger-icon",
  "oath-lamp-icon",
  "oracle-cradle-icon",
  "gate-monolith-icon",
  "loom-shard-icon",
  "quiet-forge-icon"
]
```

- [ ] **Step 2: Add provenance records before runtime wiring**

Every asset must have:

```json
{
  "id": "bellroot-vestibule-location",
  "source": "project-original",
  "license": "project-owned",
  "status": "approved",
  "runtimePath": "/images/arpg/..."
}
```

- [ ] **Step 3: Keep rejected art rejected**

Add validator checks that fail if any retired flat/vector prologue sheets are assigned to runtime preview fields.

- [ ] **Step 4: Wire only approved assets into `/hq`**

In `components/home/arpg/ArpgHud.tsx`, expose the assets only in Adventure, Journal, and People panels. Do not restyle or reposition the playfield.

- [ ] **Step 5: Prove**

Run:

```powershell
npm run arpg:visual-briefs:check
npm run arpg:assets:check
npm run arpg:production:check
npm run arpg:release:check
npm run type-check
npm run verify
npm run runtime:proof:3100 -- --routes=/hq?focus=hq-chronicle
```

---

## Task 5: Release Diagnostics And Runbook

**Files:**
- Create: `docs/deployment/fd2-release-runbook.md`
- Create: `scripts/release-diagnostics-capture.mjs`
- Modify: `package.json`
- Modify: `docs/deployment/release-readiness-checklist.md`

- [ ] **Step 1: Write the runbook**

The runbook must include:

```markdown
# FD2 Release Runbook

## Prerequisites
- Real staged hostname in repo-root `.env.local` as `NEXUS_RELEASE_BASE_URL`.
- Valid `NEXUS_TOKEN`.
- Docker available for container proof.

## Local Proof
1. `npm run type-check`
2. `npm run verify`
3. `npm run build`
4. `npm run runtime:proof:3100 -- --routes=/,/hq?focus=hq-chronicle,/command,/resources,/vehicle`

## Staged Proof
1. `npm run launch:gate:target`
2. `npm run release:smoke`
3. `npm run release:diagnostics:capture`

## Rollback
- Record deployed image/tag.
- Restore previous deployment in Coolify.
- Re-run `/api/health`, `/`, `/hq?focus=hq-chronicle`, and `/command`.
```

- [ ] **Step 2: Implement diagnostics capture**

`release-diagnostics-capture.mjs` should write a timestamped JSON file under `docs/metrics/` with:

```json
{
  "capturedAt": "ISO timestamp",
  "baseUrl": "resolved base URL",
  "routes": [{ "route": "/api/health", "status": 200 }],
  "environment": {
    "hasReleaseBaseUrl": true,
    "hasToken": true,
    "dockerExpected": true
  }
}
```

- [ ] **Step 3: Add script**

Add:

```json
"release:diagnostics:capture": "node scripts/release-diagnostics-capture.mjs"
```

- [ ] **Step 4: Prove local capture without staging**

Run:

```powershell
npm run release:diagnostics:capture
npm run type-check
npm run verify
```

Expected: capture succeeds locally and records missing staged-host/Docker prerequisites as blocked, not failed release proof.

---

## Task 6: Route Workplane Compression Pass

**Files:**
- Modify: `lib/homefrontVisualParity.ts`
- Modify: `components/ui/shell.tsx`
- Modify: `tests/e2e/tab-surfaces.spec.ts`
- Optional: `components/resources/ResourcesWorkbench.tsx`

- [ ] **Step 1: Add surface summary density contract**

Each non-HQ route should expose:

```ts
{
  primaryQuestion: string;
  nextBestAction: string;
  proofLine: string;
}
```

- [ ] **Step 2: Render one compact summary strip**

In the shell, render a summary strip above dense module stacks with `data-testid="homefront-workplane-summary"`.

- [ ] **Step 3: Keep RPG isolated**

Add a test assertion that `/hq?focus=hq-chronicle` does not inject `homefront-workplane-summary` inside the ARPG playfield container.

- [ ] **Step 4: Prove**

Run:

```powershell
npm run type-check
npm run verify
npm run runtime:proof:3100 -- --routes=/command,/intel,/alpha,/cyber,/recon,/vault,/resources,/vehicle
```

---

## Acceptance Checklist

- [ ] The plan is executed in this order unless Mario explicitly reprioritizes.
- [ ] No new top-level routes are introduced.
- [ ] No hardware control is added.
- [ ] No private RPG content is promoted on the public landing.
- [ ] Every tranche ends with `npm run type-check`, `npm run verify`, route proof, and handoff refresh when task/state docs change.
- [ ] If Playwright fails with Windows `spawn EPERM`, record it and use the HTTP/Node proof fallback instead of mislabeling the product as broken.

---

## Self-Review

- Spec coverage: covers proof resilience, vehicle/drone readiness, AI operator workflow, private RPG closure, release diagnostics, and route workplane compression.
- Placeholder scan: no `TBD`, no unresolved implementation placeholders, and no "write tests later" steps.
- Type consistency: shared types are introduced before downstream UI usage; runtime proof script is independent from Playwright; vehicle/drone work remains simulation-only.

---

## Execution Options

Plan complete and saved to `docs/superpowers/plans/2026-05-07-needed-improvements.md`.

1. **Subagent-Driven (recommended):** dispatch a fresh worker per task, review between tasks, faster iteration.
2. **Inline Execution:** execute tasks in this session using executing-plans, batch execution with checkpoints.
