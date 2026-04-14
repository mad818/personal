# Claude Code + Obsidian + Ghidra Batch 5 — promoted analyst briefs

## Why this batch exists

The reverse-engineering loop is now durable and reopenable, but it still stops too early. A strong binary triage note is useful archive material, yet analysts often need one higher-order artifact that explains what the triage means, what evidence actually matters, and what follow-up should happen next.

## Problems to solve

1. Durable reverse-engineering prep notes still behave like end-state artifacts instead of seeds for deeper analyst work.
2. There is no deterministic local way to promote a binary triage note into a reusable analyst brief without depending on another AI call.
3. The second-brain export does not yet distinguish higher-order reverse-engineering briefs from raw prep notes.

## Scope for this batch

1. Add a deterministic local brief-draft builder for filed binary triage pages.
2. Add a `Promote to brief` path inside VAULT for reverse-engineering prep notes.
3. Give promoted reverse-engineering briefs their own visual/export treatment so the second brain can separate raw prep from higher-order synthesis.

## Out of scope

- New reverse-engineering engines or cloud analysis
- Automatic triage-to-brief promotion without operator intent
- Full malware-report authoring workflows beyond one compact analyst brief artifact

## Constraints

- Preserve the raw-sample-local-only boundary.
- Keep promotion deterministic and local-first.
- Reuse the existing compiled-memory contract instead of creating a parallel artifact store.
- The website must still run after the batch.

## Acceptance signals

1. A filed reverse-engineering prep note can be promoted into a higher-order analyst brief from VAULT.
2. Promoted briefs are visibly distinct from raw triage notes.
3. The second-brain export distinguishes reverse-engineering briefs from reverse-engineering prep.
4. Repo verification and live route checks stay green.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- Live route checks on `/vault?focus=vault-compiled-pages&compiledFilter=reverse-engineering`, `/recon?view=binary&focus=recon-binary`, `/vault`, and `/resources?view=playbooks&playbook=reverse-engineering-follow-through`
