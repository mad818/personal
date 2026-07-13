# Nexus File-First Second Brain

This file is the human-owned index for durable project context. Models can read it. They do not own it.

## Authority

Within project work, use this order after system safety and Mario's current explicit request:

1. Human-maintained files named below.
2. Verified current repository and runtime state.
3. AI-generated summaries, compiled memory pages, browser memory, and inferred preferences.

If two sources conflict, surface the conflict. Do not silently merge them. Newer explicit human direction wins over older AI memory.

## Canonical files

- `AGENTS.md` — operating and safety rules
- `docs/AGENT_HANDOFF.md` — current generated handoff
- `tasks/todo.md` — active queue and next work
- `tasks/lessons.md` — rules created from corrections
- `docs/ideas/skills/human-editor/SKILL.md` — natural-writing and rewrite protocol
- `docs/ideas/skills/premortem/SKILL.md` — prospective failure-analysis workflow
- `docs/ideas/source-parity/` — honest external-source capability accounting

Load only the files relevant to the current task. Do not dump the entire archive into a prompt.

## File over AI

- Files are the durable record. AI memory is a recall aid.
- AI-generated memory never edits these files by itself.
- A model may propose a change, but it may write only when the current task authorizes that project edit.
- Preserve attribution: human-authored facts, verified runtime facts, and AI inference are different things.
- Keep private or secret material out of tracked files. Use existing protected local storage for sensitive data.
- Preserve exact output contracts. File-first context must not add commentary to JSON-only or schema-bound responses.

## Writing protocol

For prose editing, rewriting, social posts, captions, messages, articles, or other reader-facing copy, apply the Human Editor skill. Mega mode is the default unless Mario names another mode. Keep the meaning, remove the machine rhythm, and return the rewritten text without a preamble.

## Maintenance

This index should stay short. Add a canonical file only when it changes how future work should be understood. Do not turn this into a chat transcript or a dump of generated notes.
