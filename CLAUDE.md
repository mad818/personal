# CLAUDE.md Compatibility Shim

The canonical Nexus context spine is now:

1. `AGENTS.md`
2. `docs/SYSTEM_STATE.md`
3. `docs/STANDARDS.md`
4. `docs/PROJECT_BIBLE.md`

Use those files in that order.

This file remains only so older tools or prompts that still ask for `CLAUDE.md` do not fail during the compatibility tranche.

Quick pointers:

- agent operating contract → `AGENTS.md`
- current reality / blockers / Next Up → `docs/SYSTEM_STATE.md`
- architecture and engineering rules → `docs/STANDARDS.md`
- stable product intent → `docs/PROJECT_BIBLE.md`
- generated compatibility handoff mirror → `docs/AGENT_HANDOFF.md`
