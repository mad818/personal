# Office Module Boundaries

This folder is the visual command interface for HQ Prime. The office is now **3D-only**.

## Ownership (what to edit)

### `OfficeCommandCenter.tsx`
Agent/tool execution + chat terminal wiring.
- Owns: `runAgent()` loop state (`activeAgent`, `routingAgent`, `dispatchedTo`, `liveSteps`, `emotion`, input/output messages).
- Owns: mapping agent state to room positions via `agentPos`.
- Writes: `store.officeMessages` (consumed by 3D parity indicators for fuel/trash/server load).

If you want to change routing logic, tool step display, or chat behavior, edit this file.

### `OfficeRoom3D.tsx`
The only office renderer.
- Owns: room shell, furniture, drag/edit mode, agent bodies, and ambient motion.
- Owns: dispatch travel beam visual in 3D.
- Owns: 3D parity signals replacing legacy 2D widgets:
  - server rack vitals
  - fuel/context gauge
  - trash saturation fill

If you want to add/modify environmental objects, extend this file with native Three.js/R3F objects.

## Visual contract: `OfficeRoom3D` props

`OfficeRoom3D` expects:
- `agentPos: Record<AgentId, { x: number; y: number }>`: where each agent is placed.
- `activeAgent`: agent currently executing.
- `officeEditMode`: whether drag/edit handles are enabled.
- `officeLayout`: persisted object layout.
- `sceneMode`: `auto`/`morning`/`afternoon`/`night`.
- `motionIntensity`: quality/motion tuning.
- `dispatchBar`: temporary dispatch travel state used for the 3D beam.

