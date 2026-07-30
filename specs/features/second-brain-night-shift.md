# SECOND-BRAIN NIGHT SHIFT

## Intent

Turn the existing file-first second brain into an operational, Obsidian-ready refinery inspired by the attached Kimi course while preserving Nexus safety, privacy, and bounded-orchestrator rules.

## Source ideas adapted

- Organize knowledge by refinement stage: raw intake, scratch desk, atomic notes, synthesis threads, sources, and briefings.
- Keep raw captures and original sources immutable.
- Require every durable atom to cite a real raw capture or source file.
- Surface contradictions as `[FRICTION]`; never silently reconcile them.
- Stage scout/refinery/editor work before permanent writes.
- Run integrity audits as report-only work.
- Use plain Markdown so the live vault can be opened directly in Obsidian.

## Nexus decisions

- Do not create 300 durable agents. Reuse the existing MAX/JANSKY control plane and bounded AI route.
- Process at most 12 source items per shift with explicit character budgets.
- Automatic runs may write only review proposals to the scratch desk. Human approval is required before atoms, threads, or final briefings are promoted.
- Do not automate a logged-in browser or paywalled capture. The operator pastes content or adds source files locally.
- Keep live knowledge under ignored `data/second-brain/`, never in tracked public files.
- Keep the charter, playbooks, skill, validators, and runtime code tracked in Git.
- Preserve raw files in place and track processed fingerprints separately instead of moving or rewriting originals.
- Run scheduled work only while the Nexus scheduler runtime is active. Desktop/PM2 operation can keep it active overnight.

## Live vault

The protected runtime creates this ignored structure on first use:

```text
data/second-brain/
├── 0-raw/
├── 1-desk/
│   └── archive/
├── 2-atoms/
│   └── archive/
├── 3-threads/
├── sources/
├── briefings/
├── playbooks/
├── .nexus/
└── house-rules.md
```

## Runtime flow

1. Capture writes one new immutable Markdown file to `0-raw/` after an explicit operator action.
2. Prepare reads only unprocessed raw/source files plus a bounded index of existing atoms and threads.
3. Nexus AI returns a strict JSON proposal. Source material is treated as untrusted data.
4. Stage validates source IDs, bounds, slugs, and proposal shape, then writes only to `1-desk/`.
5. Approve revalidates the proposal and current source fingerprints, writes new atom/thread/briefing files without overwriting existing files, and marks source fingerprints processed.
6. Reject archives the proposal without changing permanent knowledge.
7. Audit scans links, source references, tentative age, and friction age, then writes a report-only briefing.

## ChatGPT/Codex protocol

- Add a concise `night-shift-second-brain` skill with tracked house rules and playbook references.
- Update `AGENTS.md` and `SECOND_BRAIN.md` so project-aware ChatGPT/Codex sessions use the same source-trace, friction, and write-authority rules.
- Add `night-shift` to the protected second-brain prompt mode and fail closed if its tracked contract files are unavailable.

## UI and schedules

- Add a VAULT workbench for capture, status, manual staging, proposal review, approve/reject, and audit.
- Provide one-click installation of two review-first scheduler jobs: nightly refinery staging at 03:00 and Sunday audit at 22:00.
- Nightly schedules create proposals only. Weekly audits report only. Neither silently promotes permanent knowledge.
- Show that schedules require the Nexus runtime to remain open.

## Security and privacy

- Fixed local root; no caller-supplied paths.
- Safe slugs only; no traversal or arbitrary extensions.
- Bound file counts, per-file characters, proposal counts, and output lengths.
- Never return arbitrary live-vault contents from status endpoints.
- Never expose secret files, browser sessions, cookies, or logged-in capture.
- Never overwrite raw/source files or existing permanent notes.
- No deletion. Rejected and completed proposals move to the desk archive.

## Acceptance

- Tracked skill validates.
- Focused runtime tests cover initialization, immutable capture, bounds, source enforcement, stale-fingerprint rejection, no-overwrite promotion, friction rendering, and report-only audit.
- Static validation covers API protection, VAULT wiring, scheduler templates, ignored live data, prompt mode, and ChatGPT/Codex rules.
- `npm run verify`, `npm run build`, `npm run handoff:check`, and `git diff --check` pass.
