# Claude Code + Obsidian + Ghidra Batch 2 — guided reverse-engineering follow-through

## Why this batch exists

Batch 1 made binary triage durable. The next gap is discoverability and repeatability: reverse-engineering prep should be easy to reopen from Resources as a spec-first working session instead of staying hidden behind one RECON panel and one export path.

## Problems to solve

1. There is no dedicated spec starter for reverse-engineering memory work.
2. There is no playbook that connects local triage, durable archive filing, and second-brain upkeep as one workflow.
3. Finder can reopen the underlying routes, but there is no high-signal reverse-engineering follow-up entry that ties the whole loop together.

## Scope for this batch

1. Add a reverse-engineering memory spec starter.
2. Add a reverse-engineering follow-through playbook.
3. Let Finder discover those new workflows automatically through the shared Resources catalog.

## Out of scope

- Running Ghidra itself inside Nexus
- Decompilation or disassembly in the browser
- Sample detonation or sandbox automation
- External reverse-engineering services

## Constraints

- Keep the raw sample local to the browser.
- Treat the durable artifact as triage memory, not raw evidence storage.
- Stay free-first and local-first.
- Keep the live site healthy at the end of the batch.

## Acceptance signals

1. Resources has a dedicated reverse-engineering memory spec starter.
2. Resources has a dedicated playbook that connects RECON, VAULT, and second-brain upkeep.
3. Finder can discover that workflow as a first-class route-to-work session.
4. Repo verification and live route checks remain green.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- Live route checks on `/resources?view=specs&spec=reverse-engineering-memory`, `/resources?view=playbooks&playbook=reverse-engineering-follow-through`, `/resources?view=finder`, and `/recon?view=binary&focus=recon-binary`
