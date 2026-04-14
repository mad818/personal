# Claude Code + Obsidian Second Brain Batch 1 — Nexus-native second-brain flow

## Why this batch exists

The linked AI Edge post points at a valuable pattern: pair an AI coding/workflow surface with a durable markdown knowledge system so ideas, research, and decisions compound instead of disappearing into transient chat.

Nexus already has many of the right pieces:

- HQ for live synthesis
- VAULT for durable artifacts
- Memory Spine for retrieval
- Scheduler for recurring upkeep
- Specs / Playbooks / Impact for disciplined engineering

What is still missing is the connective tissue that makes this feel like a real second brain instead of several adjacent features.

## Problems to solve

1. VAULT artifacts are durable inside Nexus, but they are not yet easy to export as an Obsidian-ready markdown corpus.
2. Archive upkeep depends too much on the operator remembering to revisit stewardship manually.
3. The second-brain workflow is implicit in the product, but not yet explicit in Specs / Playbooks.

## Scope for this batch

1. Fix the remaining browser-side Groq chat failure by making saved network posture immediately visible to middleware.
2. Add a reusable second-brain spec/playbook starter in Resources.
3. Add Obsidian-ready markdown export for saved clips + compiled pages with frontmatter and lightweight wiki-link relationships.
4. Add a scheduler template for a recurring "second brain heartbeat" upkeep pass.

## Out of scope

- Full external Obsidian sync
- Live filesystem watchers
- A separate note editor or a fork of Obsidian
- New paid services or cloud storage

## Constraints

- Free-first and local-first remain the default posture.
- No external dependency is required for the export flow.
- Restricted content must remain protected; export should respect existing visibility boundaries.
- The website must still run at the end of the batch, with live route checks.

## Acceptance signals

1. Changing Settings to `internal` or `connected` immediately unblocks `/api/ai` in the browser without waiting for a restart.
2. VAULT can export a markdown-based second-brain pack that is ready for local folder use in Obsidian-style tooling.
3. Resources exposes a second-brain starter so the workflow is discoverable and reusable.
4. Scheduler surfaces a `Second brain heartbeat` template for recurring upkeep.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- Live route checks on `/hq`, `/vault`, `/resources?view=specs`, and `/resources?view=playbooks`
- Live chat probe proving `/api/ai` is no longer blocked after settings save
