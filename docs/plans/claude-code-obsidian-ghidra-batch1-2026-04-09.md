# Claude Code + Obsidian + Ghidra Batch 1 — durable reverse-engineering memory

## Why this batch exists

The strongest overlap between the second-brain idea and the Ghidra idea is simple: reverse-engineering prep should compound. If RECON binary triage only lives in one browser session, Nexus loses the long-term value of hashes, format hints, strings, and IOC leads.

## Problems to solve

1. Binary triage currently produces useful local analysis, but it is transient.
2. There is no direct path from suspicious-file triage into durable VAULT memory.
3. Reverse-engineering prep should reopen useful follow-up sessions after filing, not stop at a copied report.

## Scope for this batch

1. Add direct VAULT filing for binary triage reports.
2. Reuse the compiled-memory contract instead of inventing a second archive model.
3. Add continuation actions after filing so the operator can keep moving through VAULT or memory follow-up.

## Out of scope

- Full sample storage in Nexus
- Malware detonation or sandboxing
- Live Obsidian sync
- A browser-based decompiler

## Constraints

- Free-first and local-first remain the default posture.
- Files still never leave the browser for triage; the durable artifact is the summary/report, not the raw sample.
- Visibility should default to `internal`.
- The website must still run at the end of the batch, with live route checks.

## Acceptance signals

1. RECON binary triage can file a durable report into VAULT.
2. The filed report includes hashes, format hints, entropy, and IOC candidates in a reusable summary.
3. After filing, the operator gets continuation actions into VAULT or memory-oriented follow-up.
4. Repo verification and live route checks remain green.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- Live route checks on `/recon?view=binary&focus=recon-binary`, `/vault?focus=vault-compiled-pages`, and `/resources?view=playbooks&playbook=second-brain-heartbeat`
