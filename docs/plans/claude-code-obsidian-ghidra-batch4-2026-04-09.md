# Claude Code + Obsidian + Ghidra Batch 4 — reopenable RE maintenance

## Why this batch exists

The reverse-engineering lane is now durable, discoverable, and maintainable inside VAULT, but it still needs better reopenability from both sides of the loop: inside the markdown export and inside Resources Finder.

## Problems to solve

1. The second-brain pack does not yet have a dedicated reverse-engineering index note.
2. Finder can discover the playbook/spec, but there is no direct first-class result for reverse-engineering maintenance itself.
3. Reopening the RE maintenance loop should take fewer decisions once the archive already contains reverse-engineering prep notes.

## Scope for this batch

1. Add a dedicated reverse-engineering prep index note to the second-brain export.
2. Add a first-class Finder entry for reverse-engineering maintenance with exact working context.
3. Keep the implementation local-first and aligned with the existing playbook/spec/VAULT flow.

## Out of scope

- New RE analysis engines
- File upload or cloud sync
- More archive repair categories beyond reverse-engineering prep

## Constraints

- Preserve the local-only raw sample boundary.
- Reuse the existing reverse-engineering memory detector.
- Keep the UI simpler, not noisier.
- The website must still run after the batch.

## Acceptance signals

1. Second-brain export includes a dedicated reverse-engineering prep index note.
2. Finder exposes reverse-engineering maintenance as a first-class result.
3. Repo verification and live route checks stay green.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- Live route checks on `/resources?view=finder`, `/resources?view=playbooks&playbook=reverse-engineering-follow-through`, `/vault?focus=vault-compiled-pages&compiledFilter=reverse-engineering`, and `/recon?view=binary&focus=recon-binary`
