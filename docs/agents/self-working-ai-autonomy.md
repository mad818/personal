# Self-Working AI Autonomy

Nexus Prime autonomy is local-first and review-gated. The self-work runner prepares bounded project work, records sanitized proof, and refuses to treat risky work as merge-ready without operator review.

## Command

```powershell
npm run autonomy:self-work
```

Default mode is a dry run. It reads `tasks/todo.md` and `docs/SYSTEM_STATE.md`, selects the first active open-ready task, classifies the risk, checks git cleanliness, checks Docker availability, and writes a sanitized `docs/metrics/autonomy-self-work-*.json` artifact.

```powershell
npm run autonomy:self-work -- --execute
```

Execute mode is guarded. It starts only from a clean working tree. If the selected task is automatable, it prepares an isolated git worktree and records rollback commands. This tranche deliberately does not auto-merge, auto-push, or bypass review gates.

```powershell
npm run autonomy:self-work -- --approve-run <run-id>
```

Approval mode prepares merge instructions for a verified run that is already marked `readyForMerge`. It does not merge or push automatically.

## Policy

- Read/analyze work can be selected without approval.
- Code edits require isolated work and review before merge.
- Auth, security, dependency, deployment, GitHub, Docker, `.env`, token, cookie, private-key, payment, or account-adjacent work always requires explicit approval.
- Manual/external work such as phone/PWA proof, staged-host proof, Docker proof, and Dependabot metadata is reported as blocked instead of simulated.
- The runner never reads `.env.local`, never calls AI providers directly, and never commits private proof values.

## Required Gates

Self-work runs must carry these gates before any merge-ready claim:

```powershell
npm run publication:safety:check
npm run security-scan
npm run security:boundaries
npm run dependency:risk:check
npm run verify
```

If the run changes task or handoff state, it must also run:

```powershell
npm run handoff:write
npm run handoff:check
```
