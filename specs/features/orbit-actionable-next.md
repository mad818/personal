# ORBIT Actionable Next Task

## Purpose

Make `npm run orbit:next` select the next locally actionable, non-RPG top-level task instead of repeatedly returning work that is remote-only, physical-device/manual, externally blocked, or inside the excluded RPG queue.

## Inputs and output

- Read only `tasks/todo.md`; make no network calls or file writes.
- Prefer actionable work in the canonical `## Next Up` section, fall through to `## In Progress` only when Next Up has no actionable task, and inspect the full file only when both headings are absent.
- Parse top-level unchecked checklist blocks with their indented evidence; do not promote nested checklist steps into separate ORBIT tasks.
- Classify each task as `actionable`, `blocked_or_manual`, or `excluded_rpg` with a deterministic reason code.
- Print the first actionable task plus queue counts in human mode.
- Support `--json` for a bounded machine-readable classification receipt and `--all` for a human review list.
- When no actionable task exists, report that truthfully and show the first blocker instead of claiming the backlog is clear.

## Classification contract

- RPG classification is limited to explicit task identifiers and product language such as `ARPG`, `Aether Reliquary`, full-game production, game asset pipelines, or game-focus work.
- A human-owned top-level task may declare `Queue posture: blocked_external` or `Queue posture: blocked_manual` in its indented evidence. ORBIT treats that narrow marker as authoritative after the RPG exclusion check and exposes a distinct deterministic reason code.
- Blocked/manual classification requires explicit task evidence such as remaining physical/manual acceptance, remote-only closure, GitHub reachability, a staged hostname, packaged artifact/signing prerequisites, or merge/acceptance dependencies.
- A declared blocked posture may not be inferred from generic prose, may not declare local readiness, and never marks the underlying task complete.
- General words such as `external`, `approval`, `review`, or `local` do not block a task by themselves.
- Actionable work remains visible even when its guardrails mention things it must not do.

## Boundaries

- Do not edit, execute, validate, or reprioritize RPG implementation work.
- Do not treat completed tasks, nested checklists, historical numbered lists, or generated prose as active top-level work.
- Do not mutate `tasks/todo.md`, create branches, launch services, call GitHub, or infer that a blocker is complete.
- Preserve the existing `orbit:next` command name and Windows-compatible Node runtime.

## Verification

- Static validator covers package wiring, no-write/no-network boundaries, CLI modes, and canonical verification integration.
- Runtime fixtures cover top-level parsing, nested checklist suppression, each classification class, declared external/manual blockers, false-positive guardrails, fallback behavior, zero-actionable truth, JSON receipts, and the current real queue.
- Focused ORBIT check, TypeScript, lint/format, publication/security checks, canonical verification, handoff, and zero-RPG changed-path audit.
