# Local Change-Set Map - 2026-05-08

This ledger makes the current dirty local batch reviewable before more feature
expansion. It does not stage, commit, delete, push, prune, or remove branches.

## Live Blocker

- `npm run handoff:pull` is blocked by local `.git` permissions:
  `.git/FETCH_HEAD`, `HEAD.lock`, and `gc.pid.lock` cannot be opened or
  created from this shell.
- Treat remote truth as stale until a Git shell with corrected ACLs can run
  `git fetch --prune` and `npm run handoff:pull`.
- Do not execute the branch cleanup ledger while this blocker is present.

## Review Groups

| Group | Paths / patterns | Decision |
| --- | --- | --- |
| Homefront polish | `app/page.tsx`, `components/landing/*`, `components/ui/shell.tsx`, `app/globals.css`, `lib/homefrontVisualParity.ts`, `public/images/homefront-*`, `public/videos/*`, route E2E specs | Product batch. Keep together as the premium landing/auth-shell visual lane. |
| Assistant/operator | `app/api/ai/*`, `app/api/agent-health/*`, `app/api/ollama/*`, `components/assistant/*`, `components/home/HomeChat.tsx`, `components/ui/CommandBar.tsx`, `lib/assistant*`, `lib/security/routePolicy.ts`, `scripts/eval-agent-runtime.js` | Product batch. Keep together as the shared dispatch/workflow/recovery lane. |
| Vehicle readiness | `app/api/vehicle/*`, `components/vehicle/*`, `lib/vehicle/*`, `scripts/validate-vehicle-readiness.mjs`, `scripts/vehicle-bridge-stub.mjs`, `docs/deployment/vehicle-passive-bridge-stub.md` | Product batch. Simulation/passive telemetry only; no flight-critical control. |
| Private ARPG | `components/home/arpg/*`, `lib/arpg*`, `docs/game/aether-reliquary/*`, ARPG validators, HQ E2E specs | Private lane. Keep separate from public Homefront positioning and prove `/hq` isolation. |
| Source intelligence / resources | `components/resources/*`, `lib/homefrontSourceIntelligence.ts`, `docs/ideas/*`, source-intel specs | Product batch. Ideas only; no vendored external repo code. |
| Deployment / runbooks | `docs/deployment/*`, `scripts/release-diagnostics-capture.mjs`, `scripts/validate-phone-access-readiness.mjs`, `.env.example`, README deployment references | Docs/tooling batch. Keep blocked release claims explicit until real staged host/Docker proof exists. |
| Repo hygiene | `docs/repo-hygiene/*`, `scripts/branch-cleanup-report.ps1`, `tasks/todo.md`, `docs/SYSTEM_STATE.md`, handoff docs | Review-only batch. No cleanup commands run without approval. |
| Local agent tooling | `.agents/*`, `.codex/*`, `.claude/hooks/*`, `.claude/settings.json` | Decide before staging. Keep as local-only unless intentionally adopting repo-native Codex tooling; do not treat Claude hooks as active product workflow. |
| Generated temp | `tmp-codex-runtime/*`, runtime pids/logs/screenshots | Ignore/remove from product batch. Runtime proof artifacts belong in docs/metrics only when intentionally captured and sanitized. |
| Unknown / inspect before stage | Any file outside the groups above | Read diff before staging. Do not bulk-add the dirty tree. |

## Next Review Steps

1. Fix `.git` ACL/lock access outside this shell, then rerun `npm run handoff:pull`.
2. Run `git status --short --branch` and refresh this ledger if new files appear.
3. Use `git diff --check` and the merge-marker sweep before any commit.
4. Stage by group, not by `git add .`.
