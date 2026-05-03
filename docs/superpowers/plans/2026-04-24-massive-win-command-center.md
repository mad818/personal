# Massive Win Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-class Resources lane for large “massive win” plans so broad fixes, improvements, and upgrades are visible, phase-gated, and executable without widening the app into new routes.

**Architecture:** The plan registry lives in `lib/massiveWinPlan.ts`, the UI renders in `components/resources/MassiveWinConsole.tsx`, and `/resources?view=wins` plugs into the existing Resources chamber resolver, view specs, store state, and route canonicalizer. Styling stays scoped to `app/globals.css` and follows the current Homefront mission-strip plus summary-first workplane grammar.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Zustand, Playwright authenticated route tests, existing shell primitives from `components/ui/shell.tsx`.

---

### Task 1: Track The Massive Win Slice

**Files:**
- Modify: `tasks/todo.md`

- [ ] **Step 1: Add an in-progress task before implementation**

Add this under `## In Progress`:

```markdown
- [ ] MW1-MASSIVE-WIN-CENTER — Add a Resources “Massive Wins” command lane that turns large planning requests into visible, phase-gated win plans with route targets, verification gates, design adaptation posture, and next-action handoffs without adding a new public route or deleting replay worktrees.
```

### Task 2: Write Failing Route Coverage

**Files:**
- Modify: `tests/e2e/tab-surfaces.spec.ts`

- [ ] **Step 1: Add the failing authenticated route test**

Append a test that opens `/resources?view=wins` and expects the new lane:

```ts
test("resources exposes massive win planning as a native command lane", async ({
  page,
}, testInfo) => {
  await gotoShell(page, "/resources?view=wins");
  await waitForShell(page, testInfo, { anchorText: "Massive wins" });

  await expect(page.getByText("Massive Win Console", { exact: true })).toBeVisible();
  await expect(page.getByText("Post-UXA3 release confidence", { exact: true })).toBeVisible();
  await expect(page.getByText("Functional ARPG downtime lane", { exact: true })).toBeVisible();
});
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
npm run tabs:e2e
```

Expected: the new test fails because `/resources?view=wins` is not a canonical Resources view yet.

### Task 3: Add The Massive Win Registry

**Files:**
- Create: `lib/massiveWinPlan.ts`

- [ ] **Step 1: Implement typed plan data**

Create `MASSIVE_WIN_PLANS` with stable plan IDs, status, route targets, phase lists, design posture, and verification commands. Include at least:

```ts
post-uxa3-release-confidence
cinematic-ia-standardization
functional-arpg-downtime-lane
desktop-trust-release-chain
```

### Task 4: Add The Resources Console

**Files:**
- Create: `components/resources/MassiveWinConsole.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Render the plan registry**

Create a client component that renders:
- A hero block titled `Massive Win Console`
- Status chips for active plans, planned plans, and route coverage
- Cards for each massive win plan
- Phase chips with current/next/done posture
- Links to the safest next route or doc

- [ ] **Step 2: Add scoped CSS**

Add `.nexus-massive-win-*` rules after the Resources/Vault compaction block so the lane looks like Homefront rather than a generic backlog.

### Task 5: Wire `/resources?view=wins`

**Files:**
- Modify: `components/resources/ResourcesWorkbench.tsx`
- Modify: `lib/surfaceCondensationRegistry.ts`
- Modify: `lib/surfaceRedesignRegistry.ts`
- Modify: `lib/assistantCanonicalRegistry.ts`
- Modify: `store/useStore.ts`

- [ ] **Step 1: Add the `wins` view**

Add `"wins"` to the Resources view unions and canonical view set.

- [ ] **Step 2: Add the `wins` chamber**

Add a `ResourcesChamberId` of `"wins"`, a `CHAMBERS` entry labelled `Massive wins`, and resolver support that maps `view=wins` to that chamber.

- [ ] **Step 3: Add view spec copy**

Add a `RESOURCES_WORKBENCH_VIEW_SPECS.wins` entry with:

```ts
introTitle: "Massive wins"
introDetail: "Large fixes, improvements, and upgrades"
panelTitle: "Massive Win Console"
panelDetail: "Plan, gate, execute, verify"
```

- [ ] **Step 4: Render `MassiveWinConsole`**

Return `<MassiveWinConsole />` from `renderPanelContent("wins")`.

### Task 6: Green Verification And Docs

**Files:**
- Modify: `docs/SYSTEM_STATE.md`
- Modify: `tasks/todo.md`
- Regenerate: `docs/AGENT_HANDOFF.md`, `docs/CLAUDE_HANDOFF.md`, `docs/CODEX_HANDOFF.md`, `docs/CURSOR_HANDOFF.md`

- [ ] **Step 1: Verify GREEN**

Run:

```powershell
npm run tabs:e2e
npm run type-check
npm run build
npm run verify
```

Expected: all commands pass; if `.next` is locked, stop `3100`, rebuild, and relaunch.

- [ ] **Step 2: Update docs and task status**

Record MW1 as shipped in `docs/SYSTEM_STATE.md`, mark `MW1-MASSIVE-WIN-CENTER` complete in `tasks/todo.md`, then run:

```powershell
npm run handoff:write
npm run handoff:check
```

