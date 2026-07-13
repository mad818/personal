## no-mistakes — Analysis complete

**What it is:** A local Git release gate that validates committed changes before forwarding them to the real remote.
**Stack:** Go 1.25, Cobra, Bubble Tea, SQLite, Git worktrees, agent skill/AXI protocol
**Intent detected:** both

**Plan headline:**
Adapt intent-aware ordered validation into Nexus's existing release commands.
Keep all push, PR, CI mutation, auto-fix, and merge behavior operator-controlled.

**Files created:**
- REPO_CONTEXT.md
- AGENTS.md
- .cursorrules

**Open questions:** Disposable-worktree execution and ignored local evidence persistence remain later tranches.
