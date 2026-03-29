# Pixel-Agents Assimilation Plan
# Nexus Prime HQ Graphics Enhancement

**Source:** https://github.com/pablodelucca/pixel-agents (5,600+ stars)
**Generated:** 2026-03-29
**Scope:** OfficeRoom3D.tsx, constants.ts, animations.css, sprites.ts, palette.tsx

---

## What pixel-agents is and why it matters

pixel-agents is a VS Code extension that renders multi-agent AI systems as animated pixel art characters
in a 2D orthographic office. It is widely cited as the best-looking open-source agent visualization.
Its renderer is Canvas 2D, top-down, tile-based — completely different from Nexus Prime's Three.js 3D scene.

The goal of this plan is NOT to port pixel-agents. It is to identify every idea, technique, and
visual quality that makes pixel-agents look better than what Nexus currently has, and implement
each one using Three.js 3D — keeping the perspective camera and the 3D room, but elevating
character animation, environmental detail, and special effects to match pixel-agents' quality bar.

---

## Capability comparison: pixel-agents vs Nexus Prime

| Capability | pixel-agents | Nexus Prime | Gap |
|---|---|---|---|
| Character animation states | 3 (TYPE / WALK / IDLE) | 2 (active / idle) | Nexus needs TOOL-AWARE states |
| Per-tool body pose | typing vs reading vs waiting | same gait for all tools | Missing |
| Matrix spawn/despawn effect | Full column-cascade rain | None | Missing — high priority |
| Agent outline / selection highlight | White CSS outline | Floor glow circle only | Needs 3D rim highlight |
| Speech bubbles per state | bubble-waiting, bubble-permission | None in 3D scene | Missing |
| Agent state label above head | AgentLabels overlay | Wall board only | Needs head-mounted label |
| Furniture variety | 25 items with pixel art sprites | 7 items as box geometry | Texture + prop upgrade |
| Floor tile variety | Colorizable HSB sprite tiles | Flat plane + line grid | Needs tile texture |
| Real point/spot lights | N/A (2D Canvas) | 0 real lights, emissive only | Needs PointLights |
| Time-of-day palette system | None | Full (morning/afternoon/night) | Nexus leads here |
| City window / backdrop | None | LA skyline texture | Nexus leads here |
| VFX quality tiers | None | 3 tiers (off/low/high) | Nexus leads here |
| Agent-specific VFX | None | EL aura, Hopper beam | Nexus leads here |
| 3D perspective + depth | None (2D only) | Full Three.js 3D | Nexus leads here |
| Draggable furniture | Grid snap drag | Free 3D drag | Nexus leads here |

---

## What to assimilate (ideas only — no pixel-agents code is copied)

### 1. Matrix spawn/despawn effect (HIGH PRIORITY)

**What pixel-agents does:** When an agent spawns or despawns, a column-cascade green rain sweeps
top-to-bottom across the character sprite. Each column starts at a staggered time. A bright
white-green "head" pixel leads a fading green trail. Hash-based flicker adds shimmering.
Two modes: spawn (reveals) and despawn (consumes).

**Nexus 3D implementation:**
Use a canvas texture on a plane mesh placed in front of the agent body group. A `useFrame`
callback updates the canvas per-frame: iterate columns, advance each column's head position
using `clock.getElapsedTime()` plus a per-column seed offset, draw head + trail pixels in
green tones over a sampled copy of the agent body color. Apply this as `THREE.CanvasTexture`
with `needsUpdate = true`.

Trigger: when an agent goes from inactive to active (first tool call of a session) and when
a task completes (matrix-out then back to idle pose).

**Files:** OfficeRoom3D.tsx (new `MatrixOverlay` component inside `AgentFloorShadows`)
**Effort:** M

---

### 2. Per-tool body animation states (HIGH PRIORITY)

**What pixel-agents does:** Maps each tool type to a specific animation. Read/Grep/Glob/WebFetch
triggers a "reading" pose (arms down, slight head tilt). Write/Patch triggers a "typing" pose
(arms forward, rapid micro-movement). Waiting-for-permission triggers a raised-arm waiting pose.

**Nexus 3D implementation:**
Extend the existing `useFrame` gait system. Currently the only branch is `active vs idle`.
Add a `toolPose` state derived from the current tool in `officeMessages` store slice:

```
SEARCH  → web_search, fetch_url, hf_papers_search   → scanPose: body sways ±X, head forward
TYPE    → write_file, patch_project_file, draft_file → typePose: arms angled forward, rapid gait
READ    → read_file, list_files, read_project_file   → readPose: arms lowered, head tilted down
COMPUTE → calculate, sec_edgar_search                → computePose: arms crossed, micro-bob
WAIT    → ask_max, propose_project_edit              → waitPose: one arm raised ±Y oscillation
```

Each pose drives `armL.rotation.x / armR.rotation.x / body.rotation.x` differently from the
current single gait value.

**Files:** OfficeRoom3D.tsx (extend `AgentFloorShadows` useFrame), store/useStore.ts (expose
current tool per agent), components/home/office/constants.ts (TOOL_POSE_MAP)
**Effort:** M

---

### 3. Agent rim highlight / selection outline (MEDIUM PRIORITY)

**What pixel-agents does:** Active (selected) agent gets a full white CSS outline. Hovered agent
gets 50% opacity white outline. This is a standard game selection indicator.

**Nexus 3D implementation:**
Add a second pass mesh for the active agent: a slightly-scaled copy of the body + head geometry
with `side: THREE.BackSide` and an emissive white/agent-color material. This is the standard
Three.js outline technique — render the back-faces at scale 1.08 with agent color, then render
the front faces normally on top. The outline only activates for `activeAgent === id`.

This replaces the current floor glow circle as the primary "who is active" indicator. The glow
circle stays for ambient ambience.

**Files:** OfficeRoom3D.tsx (add OutlineMesh component, render inside agent group)
**Effort:** S

---

### 4. Speech bubbles in 3D space (MEDIUM PRIORITY)

**What pixel-agents does:** Separate sprite definitions for `bubble-waiting` and `bubble-permission`.
Bubbles appear above the character head when waiting states are active.

**Nexus 3D implementation:**
Use `<Html transform>` (already established in WallMountedPanels) above the agent head mesh
position. Show two variants:
- WAIT bubble: "⏳ WAITING" — triggers when `ask_max` tool is called or agent is in thinking state
- PERMISSION bubble: "🔒 APPROVAL" — triggers when `propose_project_edit` or high-risk write is pending
- TASK bubble: show the current tool icon from TOOL_ICON map while a tool call is in flight

The bubble animates in with a CSS `bubbleUp` keyframe (already in animations.css) and fades
out after the tool call resolves.

**Files:** OfficeRoom3D.tsx (AgentFloorShadows — add Html bubble above headRef position)
**Effort:** S

---

### 5. Real point lights per desk zone (HIGH PRIORITY)

**What pixel-agents does:** N/A (2D Canvas has no 3D lighting). But this is the biggest visual gap
in Nexus Prime that pixel-agents visually sidesteps by being 2D.

**Nexus 3D implementation:**
Add five `<pointLight>` instances, one per agent desk, positioned 0.8 units above each desk center.
Color: match each agent's brand color at very low intensity (0.18–0.35) so it tints the desk
surface without overpowering the ambient. Add three more from the ceiling bars (replace the current
emissive-only fluorescent bar meshes with emissive mesh + a pointLight at the same position).

Add `castShadow` on the ceiling pointLights and `receiveShadow` on the floor and desk surfaces.
Enable `shadowMap.type = THREE.PCFSoftShadowMap` in the Canvas `gl` prop.

Night mode: raise desk light intensity to 0.45 and ceiling light intensity to 0.6.

**Files:** OfficeRoom3D.tsx (CeilingLights component + Furniture3D desk section)
**Effort:** S–M

---

### 6. Window night adaptation (MEDIUM PRIORITY)

**What pixel-agents does:** N/A. But this fixes a known placeholder in Nexus.

**Nexus 3D implementation:**
The `CityWindow` `useFrame` currently does `void nightFactor` — it was always a placeholder.
Wire it properly:
- Night: raise `emissiveIntensity` on the skyline plane from 0.08 → 0.55 (city glows at night)
- Night: add a `<pointLight color="#4060c8" intensity={nightFactor * 0.4}>` just inside the window
  to cast a cool blue wash onto the floor and nearby desks (simulates city light spill)
- Morning: warm emissive (0.12), no interior spill
- Afternoon: neutral (0.08), no spill

**Files:** OfficeRoom3D.tsx (CityWindow component)
**Effort:** S

---

### 7. Ceiling + ambient occlusion (MEDIUM PRIORITY)

**What pixel-agents does:** Being 2D, it renders ceiling fixtures as floor-level decals. But the
visual completeness of a closed room is present.

**Nexus 3D implementation:**
- Add a ceiling plane: `planeGeometry [10, 6]` at y=2.45, flipped, matching pal.wall color
  with slight darkening. This closes the room.
- Add subtle AO shadow discs under the sofa legs and desk bases: small dark `circleGeometry`
  planes at y=0.009, `opacity: 0.18`, gives contact shadow impression without raytracing.
- Add a ceiling trim band at y=2.44 around all four walls.

**Files:** OfficeRoom3D.tsx (RoomShell component)
**Effort:** S

---

### 8. Animated wall clock (LOW PRIORITY / QUICK WIN)

**What pixel-agents does:** Clock furniture item is a static pixel art sprite. Nexus clock is also
static. Neither animates.

**Nexus 3D implementation:**
Wire the existing clock hand meshes (already in RoomShell) to `useFrame`:
```typescript
const now = new Date()
hourHand.rotation.z   = -(now.getHours() % 12 + now.getMinutes() / 60) * (Math.PI * 2 / 12)
minuteHand.rotation.z = -(now.getMinutes() / 60) * Math.PI * 2
```
Runs at 60fps, no external state needed.

**Files:** OfficeRoom3D.tsx (RoomShell or separate ClockHands component)
**Effort:** XS

---

### 9. Missing character accessories (LOW PRIORITY / QUICK WIN)

**What pixel-agents does:** Uses 6 distinct character sprites from an open-source pack (Metro City
by JIK-A-4). All six are visually distinct at a glance.

**Nexus 3D implementation:**
Three accessories defined in `AGENT_3D_STYLES` but never rendered:
- HOPPER (`cipher`): `hat: true, accessoryColor: '#4a3b2c'` → add a brim (flat cylinder) + crown
  (taller cylinder) above the hair sphere
- NOVA (`nova`): `glasses: true` → add two small torus rings at eye level, connected by a thin bridge box
- LUCAS (`flux`): `cap: true, accessoryColor: '#111827'` → add a cap brim (flat box, slight forward
  angle) above the hair sphere

**Files:** OfficeRoom3D.tsx (AgentFloorShadows render block)
**Effort:** XS–S

---

### 10. Desk surface pixel art textures (MEDIUM PRIORITY)

**What pixel-agents does:** Every furniture item has hand-crafted pixel art sprites with detail that
plain box geometry cannot match. The DESK sprite shows a monitor bezel, keyboard tray, paper stacks.

**Nexus 3D implementation:**
Create canvas textures using the existing palette `P{}` color map and `Sprite()` renderer.
For each desk surface (top face of the desk box), generate a 64×32 canvas at startup with:
- Monitor stand base shape
- Keyboard rectangle
- Notebook rectangle
- A few scattered pixel dots for papers / post-its

Apply as `map` on the desk top face `meshStandardMaterial`. This is a one-time canvas operation
per agent — no per-frame cost.

**Files:** OfficeRoom3D.tsx, palette.tsx (extend Sprite to render to OffscreenCanvas)
**Effort:** M

---

### 11. Floor tile texture (LOW PRIORITY)

**What pixel-agents does:** Colorizable HSB floor tile sprites with a grid that looks like real
office flooring (tile seams, subtle grain).

**Nexus 3D implementation:**
Replace the current line-segment floor grid with a canvas texture applied to the floor plane.
Generate a 512×512 canvas with:
- Dark base fill matching `pal.floor`
- Lighter tile-seam grid lines at 64px intervals (simulates 1-unit tile seams)
- Very subtle noise dots for floor grain (random pixel scatter at 5% opacity)

Apply as `map` on the floor meshStandardMaterial. Regenerate when `tod` changes.

**Files:** OfficeRoom3D.tsx (RoomShell or new FloorTexture component)
**Effort:** S–M

---

### 12. Post-processing bloom (MEDIUM PRIORITY)

**What pixel-agents does:** Pixel art naturally has high-contrast edges that read well flat.
Three.js 3D emissive surfaces look dull without bloom — the glow circles, monitor screens,
and agent aura rings all need it.

**Nexus 3D implementation:**
Add `@react-three/postprocessing` (already compatible with the current drei version).
Use `<EffectComposer>` with `<Bloom threshold={0.6} intensity={0.35} luminanceSmoothing={0.9}`.
Gate behind `vfxQuality !== 'off'`. At `low` quality: intensity 0.2, at `high`: 0.5.

This single change makes EL's aura rings, the HOPPER beam, monitor screen glows, and ceiling
lights all read as genuinely luminous.

**Files:** OfficeRoom3D.tsx (Canvas wrapper)
**Effort:** S

---

## Implementation phases

### Phase G1 — Foundation lighting + quick wins
Commits can be one or two. All are isolated changes.

Items: 5 (real point lights), 6 (window night), 7 (ceiling + AO), 8 (clock hands), 9 (accessories)
Expected visual gain: HIGH — point lights transform the flat look. Ceiling closes the room.
Clock and accessories are polish with zero risk.
Effort: 1 focused session

---

### Phase G2 — Character depth
Items: 2 (per-tool body poses), 3 (rim highlight), 4 (speech bubbles)
Expected visual gain: HIGH — agents suddenly communicate what they are doing.
Effort: 1–2 sessions

---

### Phase G3 — The matrix effect
Items: 1 (matrix spawn/despawn)
Expected visual gain: VERY HIGH — signature effect that will make HQ feel cinematic.
Standalone phase because it needs careful canvas texture management and perf testing.
Effort: 1 session

---

### Phase G4 — Texture and post-processing
Items: 10 (desk textures), 11 (floor tiles), 12 (bloom)
Expected visual gain: MEDIUM — polish that reads as "professional" vs "prototype."
Effort: 1 session

---

## What pixel-agents does that Nexus intentionally will NOT adopt

- **2D top-down perspective** — Nexus keeps the 3D perspective camera. The depth and camera
  presets are core to the HQ identity.
- **Tile-based layout editor** — Nexus has a free-drag 3D editor. Tile snapping would regress.
- **VS Code extension architecture** — Not relevant to a Next.js web app.
- **External asset loading from disk** — Nexus sprites live in palette.tsx and sprites.ts by design.

---

## Files touched per phase

### Phase G1
- `components/home/office/OfficeRoom3D.tsx` — point lights, ceiling, AO discs, clock hands, accessories

### Phase G2
- `components/home/office/OfficeRoom3D.tsx` — rim highlight, speech bubbles, pose system
- `components/home/office/constants.ts` — TOOL_POSE_MAP
- `store/useStore.ts` — expose activeToolPerAgent derived state

### Phase G3
- `components/home/office/OfficeRoom3D.tsx` — MatrixOverlay component

### Phase G4
- `components/home/office/OfficeRoom3D.tsx` — bloom wrapper, floor texture, desk textures
- `components/home/office/palette.tsx` — OffscreenCanvas renderer extension

---

## Non-negotiables across all phases

- `npx tsc --noEmit` must pass before any phase is marked done
- VFX additions must respect the `vfxQuality` gate — nothing at `off`, lighter at `low`, full at `high`
- No new npm packages except `@react-three/postprocessing` for bloom (Phase G4)
- All canvas texture operations are one-time or low-frequency — no per-frame canvas writes except MatrixOverlay
- Performance target: 60fps at `low` quality on an integrated GPU

---

## Tasks to add to tasks/todo.md when building begins

```
### Phase G1 — Foundation lighting + quick wins
- [ ] G1A — Add 5 desk-zone point lights + 3 ceiling point lights with shadow support
- [ ] G1B — Wire CityWindow nightFactor: raise emissiveIntensity + add night spill pointLight
- [ ] G1C — Add ceiling plane + AO shadow discs under furniture
- [ ] G1D — Animate wall clock hands with useFrame + Date()
- [ ] G1E — Render HOPPER hat, NOVA glasses, LUCAS cap from AGENT_3D_STYLES

### Phase G2 — Character depth
- [ ] G2A — Add TOOL_POSE_MAP in constants.ts + derive toolPose per agent from store
- [ ] G2B — Extend AgentFloorShadows useFrame with 5 tool-aware pose states
- [ ] G2C — Add rim highlight OutlineMesh (back-side scaled mesh, agent color)
- [ ] G2D — Add Html speech bubbles above agent head for wait/permission/tool states

### Phase G3 — Matrix effect
- [ ] G3A — Implement MatrixOverlay canvas texture component (spawn mode)
- [ ] G3B — Add despawn mode + trigger on task complete

### Phase G4 — Texture + post-processing
- [ ] G4A — Add @react-three/postprocessing + Bloom effect (vfxQuality gated)
- [ ] G4B — Canvas desk surface textures using palette P{} colors
- [ ] G4C — Canvas floor tile texture replacing line-segment grid
```
