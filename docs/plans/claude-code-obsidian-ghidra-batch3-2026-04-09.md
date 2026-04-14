# Claude Code + Obsidian + Ghidra Batch 3 — reverse-engineering maintenance lane

## Why this batch exists

The reverse-engineering loop is now durable and discoverable, but it is not yet maintained as intentionally as the rest of the archive. Binary triage notes should have their own repair lane inside VAULT stewardship and second-brain upkeep instead of blending back into generic compiled pages.

## Problems to solve

1. VAULT stewardship does not explicitly track reverse-engineering prep as a maintenance category.
2. Compiled-page repair views cannot isolate reverse-engineering prep notes directly.
3. The second-brain heartbeat note counts reverse-engineering prep, but does not expose its route/tag upkeep posture clearly enough.

## Scope for this batch

1. Add a shared reverse-engineering artifact detector.
2. Extend VAULT stewardship with reverse-engineering posture and repair actions.
3. Add a focused compiled-page repair view for reverse-engineering prep notes.
4. Tighten second-brain upkeep copy so reverse-engineering maintenance is visible in the heartbeat loop.

## Out of scope

- New reverse-engineering analysis engines
- Disassembly or decompilation
- Sample upload or sandboxing
- Changes to the underlying compiled-memory storage model

## Constraints

- Preserve the local-only raw sample boundary.
- Keep reverse-engineering prep inside the existing compiled-memory and second-brain contract.
- Keep the UI lighter, not more cluttered.
- The website must still run at the end of the batch with live route checks.

## Acceptance signals

1. VAULT stewardship shows reverse-engineering prep as its own archive-maintenance posture.
2. VAULT can open a focused reverse-engineering compiled-page repair view directly.
3. The second-brain heartbeat surfaces reverse-engineering route/tag upkeep more explicitly.
4. Repo verification and live route checks remain green.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- Live route checks on `/vault?focus=vault-stewardship`, `/vault?focus=vault-compiled-pages&compiledFilter=reverse-engineering`, `/resources?view=playbooks&playbook=second-brain-heartbeat`, and `/recon?view=binary&focus=recon-binary`
