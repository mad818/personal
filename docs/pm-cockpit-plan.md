# PM cockpit — implementation plan

Operator model: [docs/pm-operator-model.md](./pm-operator-model.md) (you = PM, agents = engineers).

## Goal

A **single surface** in Nexus that answers: *Is my engineering loop green, and what should I unblock next?*

## Phase A — Read-only “health strip” (low risk)

1. **Data sources (existing)**  
   - `GET /api/verify` or status rollup (if exposed) for last verify/eval posture  
   - `GET /api/status` (or equivalent) for degraded flags  
   - Client: read `docs/SYSTEM_STATE.md` directly is not viable from browser — use `GET /api/project?section=state` or extend `/api/status` with `{ nextUpCount, handoffStale?: boolean }` only if already cheap.

2. **UI**  
   - Settings page or HQ footer: compact row — **Verify**, **Eval grade**, **Next Up** (manual link to `docs/SYSTEM_STATE.md` in repo until API exists).  
   - No writes; links to run `npm run verify` / docs.

3. **Done when**  
   - Operator sees green/yellow/red without leaving Settings (or one agreed tab).

## Phase B — PM checklist (interactive)

1. Checklist persisted in **Zustand** + `localStorage` (optional): e.g. “Handoff synced”, “CI green”, “Next Up groomed”.  
2. “Copy diagnostics” button reusing existing export patterns from Settings.  
3. **Done when**  
   - Mario can run through a daily loop inside the app.

## Phase C — Automation hooks (optional)

1. GitHub Actions `workflow_dispatch` + optional `schedule` for eval smoke.  
2. Optional webhook or polling for **last workflow conclusion** (requires token — treat as advanced).

## HTTP 500 triage (when you see it)

1. **Browser Network** — note exact path (e.g. `/api/ai`, `/api/tools`).  
2. **`401`** — session token: sign in again; `NEXUS_TOKEN` must match server.  
3. **`503`** on `/api/ai` — no provider reachable (keys / Ollama).  
4. **`500`** — server threw: check terminal running `npm run dev` or production logs; common causes: malformed JSON body on POST, upstream timeout, rare invariant failure.  
5. **Whole page 500** — React render error: check server console stack trace.

---

*Last updated: adjust phases in `docs/SYSTEM_STATE.md` when starting work.*
