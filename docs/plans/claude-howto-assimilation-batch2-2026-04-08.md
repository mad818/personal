# Claude Howto Assimilation Batch 2 — playbooks into working sessions

## Why

Batch 1 made Resources playbooks readable, but they still stop at guidance. The next useful step is to turn them into operator-ready working sessions:

- copyable briefs for handoff or focused execution
- direct jump-offs into the right Nexus surfaces
- no duplicated tools or parallel workflow model

This keeps the `claude-howto` influence practical: structured engineering workflow, but localized to Nexus and tied to real routes that already exist.

## Goals

1. Add a reusable brief generator to the shared playbook contract.
2. Add explicit follow-on actions per playbook so the UI can open the right surface directly.
3. Add local-only `Copy brief` and `Download brief` actions in Resources.
4. Preserve free-first / local-first posture and avoid adding any new backend or third-party dependency.

## Implementation notes

- Keep playbooks data-driven in `lib/engineeringPlaybooks.ts`.
- Reuse existing routes only:
  - `/resources?view=system...`
  - `/resources?view=impact...`
  - `/hq`
  - `/command`
  - `/recon`
  - `/vault`
- Include the long-session quality reminder in the generated brief so the working discipline remains visible during extended tasks.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- live reachability:
  - `http://127.0.0.1:3000/resources`
  - `http://127.0.0.1:3000/resources?view=playbooks`
  - `http://127.0.0.1:3000/command`
