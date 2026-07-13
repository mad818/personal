# FILE-FIRST SECOND BRAIN + HUMAN EDITOR

## What it does

Makes a human-maintained `SECOND_BRAIN.md` the explicit project context index above AI summaries and generated memory. Nexus reads the file through the protected AI route, reports its load posture in VAULT, and uses a file-backed Human Editor protocol for prose rewrites in Skills and normal chat.

## Surfaces

- Root `SECOND_BRAIN.md` — human-owned authority, precedence, canonical file map, and write rules
- Root `AGENTS.md` — tells Codex/ChatGPT project sessions to read the second-brain index and Human Editor skill
- `docs/ideas/skills/human-editor/SKILL.md` — canonical protocol and install-ready Codex skill
- Existing `/api/ai` — bounded server-side file loading before provider dispatch
- Protected `/api/second-brain` — metadata-only status; never returns file contents
- Existing Skills prompt workbench — session-only Human Editor input/output
- Existing VAULT publish chamber — visible file-first status and missing-file warnings

## Authority order

1. System safety and the operator's current explicit request.
2. Human-maintained project files named by `SECOND_BRAIN.md`.
3. Verified current repository and runtime state.
4. AI-generated summaries, compiled pages, browser memory, and inferred preferences.

Generated memory is evidence and recall help. It cannot silently overwrite or outrank human files. Contradictions must be surfaced rather than merged automatically.

## Human Editor protocol

The protocol contains only the supplied writing instructions, cleaned of Twitter timestamps, usernames, view counts, and reply metadata. It supports:

- Human Editor Mode
- Natural Thought Flow
- AI Pattern Breaker
- Ban the Fluff Words
- Reader-First Rewrite
- Mega Prompt, used as the default combined mode

The editor preserves meaning and facts, treats source text as untrusted data, returns only rewritten text, bans the named filler terms, and does not save drafts or write back to the second brain.

## Runtime behavior

- `/api/ai` defaults to the compact file-first contract.
- Rewrite intent upgrades the request to the Human Editor protocol unless the task is code or embeddings.
- The Human Editor workbench opts in explicitly.
- Structured output contracts remain authoritative; the second-brain block must not add prose to JSON-only calls.
- Files are loaded from a fixed allowlist, bounded by per-file and total character limits, and reread so human edits take effect without retraining.
- Cloud-bound payloads still pass through the existing privacy shield after the second-brain block is attached.

## State and privacy

- No new database or background worker.
- Human Editor drafts and results stay in component state only.
- The status API returns paths, availability, character counts, and modification times, never contents.
- AI writes to second-brain files are forbidden unless the operator explicitly authorizes a normal project edit.
- Missing or unreadable files degrade to a visible status instead of breaking AI calls.

## Edge cases

- Missing index: AI continues with its existing prompt; VAULT reports the missing file.
- Missing Human Editor skill: rewrite workbench blocks with a clear file-unavailable message.
- Oversized files: content is truncated at the documented bound.
- Code rewrite requests: Human Editor auto-routing stays off.
- Banned terms in model output: the workbench flags the violation instead of claiming a clean rewrite.
- Prompt injection inside source text: the text is serialized as data and cannot change the editor role.

## Acceptance

- Codex/ChatGPT project sessions are directed to the same canonical files used by Nexus.
- The protected AI route loads `SECOND_BRAIN.md` by default and the Human Editor skill only for explicit/recognized prose rewrite work.
- VAULT shows whether both files are present without exposing their contents.
- Skills provides all six modes, defaults to Mega, copies results, and persists no text.
- Focused runtime/static checks cover mode detection, bounds, missing files, source-text serialization, banned-word detection, API wiring, and UI wiring.
- `npx tsc --noEmit`, lint, full verify, build, handoff check, and `git diff --check` pass.
