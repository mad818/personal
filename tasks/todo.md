# Nexus Prime — Compatibility Backlog Ledger

This file is a compatibility mirror only.

The canonical source of current project state and queue ordering is:

- `docs/SYSTEM_STATE.md`

Use this file only for older tooling that still expects `tasks/todo.md` during the compatibility tranche.

## Next Up

- Active program: XR2 Project-Local Assimilation Polish — FD2 through FD5 remain blocked on the missing staged `NEXUS_RELEASE_BASE_URL`, so the next tranche stays inside this repo and deepens the shipped XR1 surfaces.
- Project-local rule: upstream repos remain idea sources only; implementation must land inside Nexus routes, contracts, state, and docs under `C:\Users\mario\Desktop\personal`.
- [x] XR1 — Keep Nexus native to its existing shell, routes, governance posture, and trust boundaries while sequencing market research, memory plus OSINT caseflow, and vehicle plus radar readiness as one meta-program
- [x] MR1 — Market Research Workbench inside `/hq`, `/alpha`, and `/vault`, using trader-journaling and artifact-first patterns for decision support only
- [x] MO1 — Memory + OSINT Casefile Loop inside `/vault`, `/recon`, and `/cyber`, using native memory stewardship and passive-first investigation patterns only
- [x] VR1 — Vehicle + Radar Readiness inside `/vehicle` plus VAULT continuity, using readiness, artifact, and radar-session framing without flight-critical control
- [ ] XR2 — Polish the shipped XR1 flows inside the project folder only, keeping upstream repos as reference inputs rather than new implementation targets
- [ ] MR2 — Market review continuity polish across `/hq`, `/alpha`, and `/vault`
- [ ] MO2 — Memory + OSINT stewardship polish across `/vault`, `/recon`, and `/cyber`
- [ ] VR2 — Vehicle + radar continuity polish inside `/vehicle` plus VAULT
- [ ] FD2 — Blocked until the real staged Coolify hostname is added to repo-root `.env.local`, then stand up the first Coolify/VPS staging deployment from the repo-root `Dockerfile`
- [ ] FD3 — Blocked on FD2 host config; run `npm run launch:gate:target` against the staged host
- [ ] FD4 — Blocked on staged-host proof; capture remote `/api/diagnostics` plus GA route/manual smoke on the staged host
- [ ] FD5 — Blocked on staged-host proof; document the first production rollback target and promotion checklist before going live
- [x] A6 — Add shared governance metadata (risk tier, approval requirement, domain tags, operator-only/automation posture) and cyber pack baseline across skills, workflow packs, assistant capabilities, readiness lanes, and CYBER support rails
- [ ] A7b — Blocked forecast execution lane: compare a TimesFM companion provider against the native baseline only after decision-lift measurement and staging proof are stable

## Reference

- Current blockers, release posture, and latest shipped tranche live in `docs/SYSTEM_STATE.md`.
- Durable rules live in `docs/STANDARDS.md`.
- Historical execution detail lives in `docs/plans/`, `docs/ideas/`, and git history.
- Curated external-stack fits now live in the RESOURCES chamber rail; see `docs/SYSTEM_STATE.md` for the current integration posture.
