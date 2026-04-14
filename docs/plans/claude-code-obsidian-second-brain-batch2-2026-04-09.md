# Claude Code + Obsidian Second Brain Batch 2 — scoped packs + map notes

## Why this batch exists

The first second-brain batch made VAULT exportable, but the export still behaves more like a markdown dump than a real knowledge workspace. A stronger Obsidian-ready system should open with navigable map notes, intentional export scope, and a clear path back into Nexus.

## Problems to solve

1. The current markdown bundle is durable, but still mostly flat once it leaves Nexus.
2. Operators cannot intentionally export a full workspace versus a compiled-only pack or upkeep-oriented heartbeat pack.
3. Resources can describe second-brain work, but VAULT does not yet expose a focused export session for that workflow.

## Scope for this batch

1. Add scoped second-brain export modes in VAULT.
2. Generate map-of-content notes for domains, routes, and workflows inside the markdown bundle.
3. Add a compact manifest/export summary note so packs remain understandable after download.
4. Add a focused `vault-export-second-brain` session and point the second-brain spec/playbook into it.

## Out of scope

- Live Obsidian filesystem sync
- Markdown import back into Nexus
- A dedicated external note editor
- Full archive auto-tagging or auto-linking beyond the current local metadata

## Constraints

- Free-first and local-first remain the default posture.
- Existing visibility boundaries still apply; restricted content must remain withheld.
- The export UI should stay compact and not add another wall of always-visible copy.
- The website must still run at the end of the batch, with live route checks.

## Acceptance signals

1. VAULT can export different second-brain pack shapes intentionally instead of always generating one broad bundle.
2. Exported packs include navigable map notes for domains, routes, or workflows where relevant.
3. The second-brain spec/playbook can open the exact VAULT export session instead of only broader archive routes.
4. The site still passes repo verification and live route checks on HQ, VAULT, and second-brain Resources surfaces.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- Live route checks on `/hq`, `/vault`, `/vault?focus=vault-export-second-brain`, `/resources?view=specs&spec=second-brain-system`, and `/resources?view=playbooks&playbook=second-brain-heartbeat`
