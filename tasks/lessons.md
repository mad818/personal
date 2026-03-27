# Nexus Prime — Lessons Learned

## How to use this file
- After ANY correction from Mario, add the pattern here
- Write a rule that prevents the same mistake
- Review this file at the start of each session

---

## Rules

1. When Mario says STOP — stop immediately. No tool calls, no responses, nothing.
2. Never mark a task complete without proving it works first.
3. Keep edits small and targeted — large file edits in one call cause API timeouts.
4. Read the exact line with grep -n before any Edit call. Never guess line numbers.
5. Always search for existing patterns before adding new ones to nexus-final.html.
6. Write the plan to tasks/todo.md before starting any implementation.
7. Do not skip features or lose functionality when refactoring.
8. Avoid the Gemini image generation API — causes ECONNRESET in current setup.
9. Every agent-run exit path (success, error, timeout, fallback) must finalize phase/task-plan state to prevent stale UI panels.
10. When migrating surfaces (2D -> 3D), remove old state toggles from the store in the same pass to avoid dead persisted config and split behavior.
11. Chat-triggered capabilities should route through one centralized intent map (prompt + tool) to keep tab navigation consistent across Home chat and HQ chat.
12. Scene presets must carry behavior policy (scheduler + notification rules), otherwise users perceive them as cosmetic and low value.
13. Auto-ops jobs must be opt-in and cooldown-limited by default; never enable autonomous high-frequency runs silently.
14. If UI previews depend on runtime scheduler state, persist lightweight last-run timestamps so users can see real cooldown/next-run windows.
15. Manual override controls (Run now/Force) should be explicit and visibly differentiated, with safe defaults disabled during cooldown unless user forces.
16. UI modernization scales best when anchored to global design tokens first, then applied to high-traffic panels to avoid one-off style drift.
17. Avoid fixed pixel splits for mixed visual/chat layouts; use responsive clamp/flex ratios so chat keeps usable height on common laptop viewports.
18. For split-pane dashboards, add a direct drag handle with reset affordance; static ratios are never ideal across all monitors.
19. Any user-adjustable layout control should persist in store settings so workspace preferences survive reloads.
20. Pair non-obvious gestures (like double-click reset) with an explicit visible control to improve discoverability.
21. Resizable UI separators should support keyboard arrows/Home/End for accessibility and precision, not mouse-only drag.
22. Resizable panels should support a lock toggle to prevent accidental drag changes during regular interaction.
23. Never place dense interactive controls outside an overflow-hidden canvas via transform offsets; use a dedicated layout row to avoid clipping and paint artifacts.
24. On narrow layouts, prioritize primary controls and collapse secondary actions into a compact overflow menu to avoid horizontal crowding.
25. Keep passive status telemetry off the chat boundary; mount it in-scene (wall area) so chat space remains dedicated to conversation.
26. If a wall panel uses perspective transforms, increase internal padding/line-height of tiny labels to prevent visual overlap artifacts.
27. First wall pass should be conservative in size/placement; oversized overlays can still dominate the scene and obscure utility.
28. For "mounted in environment" requirements, implement panels as in-scene entities in `OfficeRoom3D` (wall-anchored groups), not screen-space overlays.
29. In-scene HTML panels need larger default typography and distance factor than normal UI to remain readable from the fixed camera.
30. If in-scene wall text remains too small, relocate panels to walls closer to camera/agents before only increasing font scale.
31. After relocating in-scene boards, run a collision pass against nearby props and adjust board Y/Z before changing layout intent.
32. For dashboard-like in-scene boards, add subtle hover interaction and board brightening so they behave like interactive environmental displays.
33. Camera framing changes should balance zoom with back-wall visibility so window and mounted boards stay legible without dead space.
34. Expose frequent camera framing choices as persistent presets to avoid repeated manual retuning after visual/layout updates.
35. Keep camera presets config-driven (single preset map + UI metadata) so new framing modes can be added without touching scene/render branching logic.
36. Keep AI wiring contract-aligned across runtime/docs: inject capability blocks in active prompt path, keep `/api` route contracts real, and avoid model-map drift between client/server helpers.
37. Add lightweight repository guardrails (path-collision checks + CI enforcement) when cross-platform path behavior can silently diverge.

---

## Session Log

### 2026-03-14
- ECONNRESET errors caused by large file edits and heavy context — keep edits smaller
- User rejected Gemini image generation — skip this feature entirely
- Stop command must be obeyed instantly with zero tool calls

### 2026-03-27
- Stale TaskPlanPanel came from non-finalized run paths and missing auto-clear; always close run lifecycle and clear terminal plans.
- Completed HQ office 2D -> 3D migration; keep one renderer path only and mirror runtime parity signals natively in 3D before deleting legacy components.
- Added shared chat capability routing layer and wired both chat surfaces to auto-open matching tabs for prompt intent and tool calls.
- Bound War Room/Night Ops presets to operational mode settings so runtime scheduler and alert policy change with the selected profile.
- Added mode auto-jobs with explicit settings toggles and strict global cooldown to prevent noisy or runaway autonomous scheduling.
- Added Auto Ops Preview with persisted last-run timestamps so armed state, cooldown, and next-run windows are explainable in UI.
- Added Run now/Force controls and compacted roster/stat card containers to improve usability and visual density without changing core behavior.
- Added global spacing/radius/type/elevation tokens and aligned key HQ scheduler/roster/footer panels to the shared token scale.
- Added mode briefing stream + Night Ops handoff writeback and replaced fixed office height with responsive split to prevent chat viewport starvation.
- Added user-resizable HQ office/chat splitter with drag + double-click reset to keep chat visibility controllable at runtime.
- Persisted HQ splitter height in settings to keep the preferred office/chat ratio after refresh.
- Added visible RESET LAYOUT chip next to the splitter handle so users can restore defaults without hidden gestures.
- Added keyboard resizing + inline feedback on splitter actions so layout adjustments are accessible and clearly confirmed.
- Added LOCK/UNLOCK SPLIT toggle with persisted preference so drag resizing can be intentionally disabled while keeping reset/keyboard controls.
- Moved splitter controls into a dedicated divider row between office and chat to eliminate clipping/black band overdraw from absolute+transform positioning.
- Added responsive splitter controls that collapse lock action into a More menu under narrow widths to keep the divider clean and usable.
- Repositioned live status panel to a wall-mounted office overlay and converted Welcome roster to compact non-scroll cards to prevent chat-height and roster-scroll friction.
- Moved both SYS telemetry and full agent roster to wall overlays in Office scene, removed duplicate scroll-heavy chat roster, and fixed SYS label overlap with stronger spacing.
- Reduced wall overlay footprints, anchored both below header controls, and removed leftover Welcome note to keep first-view composition clean.
- Converted SYS and roster to true in-scene wall-mounted boards inside the 3D room and removed screen-space wall overlay wrappers from `OfficeCommandCenter`.
- Increased wall board distanceFactor and text scale so roster/SYS content is readable at standard HQ camera distance.
- Relocated wall boards from back wall to side walls near agent area and increased board/text scale again for practical readability.
- Resolved left wall board overlap by nudging mount point up/forward and increased right SYS board font scale while preserving placement.
- Removed left-board cabinet overlap by moving mount further away in Z/Y, raised right SYS text block, increased right font again, and enabled interactive hover brightening.
- Tightened HQ camera position/FOV/lookAt so the office fills more viewport while still showcasing wall/window context.
- Added persistent camera presets (Cinematic and Close Ops) and wired quick controls for instant framing switches.
- Added a Wall Readability preset and moved camera handling to a centralized preset map to make future framing profiles low-risk and fast to extend.
- Completed AI connection pass: wired capability injection in HQ, added `/api/health`, fixed `/api/project` tree fidelity, aligned local model maps/defaults, and updated `.claude` rules to match runtime architecture.
- Added a cross-platform path-collision guard script + GitHub Actions workflow and published an interactive 90-day improvement plan map with gates, KPIs, and phased work packages.
