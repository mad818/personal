# Code Review Graph Assimilation Batch 1 — Local Project Impact Lane

## Why this batch

`code-review-graph` proves the value of blast-radius guidance, but Nexus does not need the full parser/database stack to benefit from that idea. The highest-value local-first version for this repo is a lightweight impact helper that answers:

- what this file imports
- what local files import it
- which files are most likely touched next

That fits Nexus better than a full semantic graph because it stays:

- free-first
- local-only
- instant to reason about
- easy to maintain inside the existing protected `/api/project` boundary

## Goals

1. Add a new protected `/api/project?section=impact` mode for one local file.
2. Keep the analysis approximate but useful, using repo-local import parsing only.
3. Surface it in the Resources workbench as an internal operator tool.
4. Avoid any external dependency, background indexer, or persistent graph store.

## Implementation plan

### CRG1 — Plan + task tracking

- Publish this plan.
- Track the batch in `tasks/todo.md`.

### CRG2 — Protected local impact response

- Extend `app/api/project/route.ts` with `section=impact`.
- Accept a repo-relative `file` query param.
- Return:
  - normalized target file
  - direct local imports
  - local importers
  - likely touched files
  - lightweight warnings when the file cannot be resolved or is outside source roots
- Keep the scan bounded to local source roots like `app`, `components`, `lib`, `hooks`, and `store`.

### CRG3 — Resources workbench impact console

- Add an `Impact` tab to `components/resources/ResourcesWorkbench.tsx`.
- Add a new `ProjectImpactConsole` component that:
  - lets the operator search or paste a repo-relative file path
  - calls the protected local route
  - shows imports, importers, and likely touched files
  - keeps copy concise and internal-tool oriented

### CRG4 — Verification

- Run:
  - `npm run type-check`
  - `npm run verify`
  - `npm run handoff:write`
- Confirm the running site still responds on:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/resources`

## Constraints

- No cloud service
- No paid dependency
- No full code intelligence system
- No secret or private file leakage outside the existing local protected route contract

## Follow-on

If this first batch is useful, the next step is a second local-only pass:

- recent changed files
- quick “review pack” suggestions
- touched tests if detected
- optional integration into HQ or internal review flows
