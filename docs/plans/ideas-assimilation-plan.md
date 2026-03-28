# Ideas Assimilation Plan

**Rule:** Ideas assimilate into Nexus on Nexus's terms. Nothing replaces what's built.
We take the concept, improve it, and wire it natively. Free APIs only. No paid services.

Sources: article skills (7), GitHub repos (14), agent architecture concepts (6).

---

## What we skip and why

| Idea | Reason |
|------|--------|
| Composio | Paid credential management |
| Shannon (pentest) | Nexus security boundary: read-only/advisory only |
| Twenty (CRM) | Irrelevant to an intelligence dashboard |
| awesome-claude-code / antigravity | Reference lists — link, don't merge |
| agent-infra/sandbox | Requires Docker infra change, out of scope |
| obsidian-skills | External tooling, only relevant if Mario uses Obsidian |
| create-context-graph | Neo4j dependency — concept only (entity extraction feeds Phase 1) |
| MCP / Skills / Single-Agent / Multi-Agent | Already in Nexus |

---

## Phase 1 — Agent Intelligence (no new infrastructure)

**Goal:** Make the five agents sharper without touching the UI or adding services.
All changes live in `lib/`, `components/home/office/prompts.ts`, and `.claude/`.

### 1A — Agentic RAG pattern (from LightRAG + agent architecture concepts)

Right now agents receive a flat `[NEXUS LIVE INTEL]` dump. The agentic RAG concept routes each query to the most relevant data source, validates the context before using it, and cites what it used.

**What to build:**
- `lib/ragRouter.ts` — maps query intent to source slice (prices → FLUX, CVEs → CIPHER, news → NOVA, geopolitics → JANSKY, code → ORBIT)
- Each agent's system prompt gets a `[DATA SOURCES AVAILABLE]` block listing what it can pull and how to validate freshness
- Agents must state which source they used in their response (grounding requirement)
- No vector DB — uses existing live context + `/api/project` file reads as the retrieval layer

**Effort:** Medium. Prompt changes + one new lib file.

### 1B — ORBIT / NOVA / CIPHER prompt sharpening (from superpowers + everything-claude-code + GSD)

Three specific upgrades extracted from the patterns:

**ORBIT** gets the superpowers discipline baked in:
- design → plan → smallest patch → verify (tsc) — already in rules but not enforced in the prompt
- Phase-based execution: breaks multi-step tasks into phases with a checkpoint after each (GSD context-rot prevention)
- After each patch: state what changed, what to verify, what the next phase is

**NOVA** gets research-first enforcement:
- Always search before answering — no speculation
- Cross-reference minimum 2 sources before citing
- Flag confidence level (confirmed / likely / unverified)

**CIPHER** gets triage-first framing:
- Lead with impact × exploitability score
- Only surface actionable findings — no noise
- Link every CVE to the affected Nexus surface if applicable

**Effort:** Low. Prompt-only changes in `components/home/office/prompts.ts`.

### 1C — Passive auto-memory (from claude-mem pattern)

Nexus has `/.auto-memory/` but it requires manual writes. Claude-mem captures tool usage and generates semantic summaries automatically.

**What to build:**
- After each agent run, extract: what was asked, what tools fired, what the outcome was
- Write a compact entry to `/.auto-memory/session_log.md` automatically
- On next session load, the relevant entries surface in `buildLiveContext()`
- Search: natural language query against memory files using existing file-read tools

**Effort:** Medium. New post-run hook in `OfficeCommandCenter.tsx` + memory writer util.

---

## Phase 2 — Design Pass (visible, no new data)

**Goal:** Make the existing UI feel intentional, not assembled. Use ui-ux-pro-max principles without replacing the token system.

### 2A — Typography and spacing audit

ui-ux-pro-max enforces: one type scale, deliberate weight contrast, consistent spacing rhythm.

**What to audit and tighten:**
- Settings drawer: label sizes (10px / 10.5px / 12px mix) → normalize to a 3-level scale
- HQ telemetry HUD: font sizes are inconsistent across chips
- Tab headers: some use uppercase tracking, some don't — pick one
- Card padding: `p-3` / `p-4` / `16px` / `12px` used interchangeably — align to token

**Effort:** Low-medium. CSS-only, no logic changes.

### 2B — Simplify pass (from simplify skill concept)

Run a cleanup pass on the three heaviest components after the design audit:
- `OfficeRoom3D.tsx` — already memoized but has dead props
- `SettingsDrawer.tsx` — local state that could be derived
- `components/home/office/prompts.ts` — repeated string patterns that could be constants

**Effort:** Low. Read → identify → remove. No new code added.

### 2C — Animation polish

ui-ux-pro-max flags animations that feel bolted-on vs. purposeful.

**What to check:**
- Transition durations: `var(--t)` is defined but not used consistently — some components hardcode `transition: all 0.2s`
- Entrance animations: HQ chips fade in correctly; settings drawer slides in but has no exit animation
- Loading states: some show spinners, some show "Loading…" text — pick a pattern

**Effort:** Low. Token consistency + one exit animation for the drawer.

---

## Phase 3 — OPS Tab: AI Geospatial Layer (from GeoDeep)

**Goal:** Add an AI-powered detection layer to the World map. GeoDeep runs object detection on GeoTIFFs with no GPU. Free. Open source Python.

**What the layer does:**
- User enables "AI Scan" toggle on the OPS map
- Nexus fetches a satellite tile for the selected area (free NASA/Copernicus tiles)
- Sends tile to a local Python micro-service wrapping GeoDeep
- Returns GeoJSON of detected objects (buildings, vehicles, fire perimeters) overlaid on the Leaflet map

**Architecture:**
- `app/api/geo-scan/route.ts` — proxy to local GeoDeep service (port 5050)
- `components/ops/GeoScanLayer.tsx` — Leaflet layer + toggle UI
- `scripts/geodep-service.py` — thin FastAPI wrapper around GeoDeep (user runs this locally alongside `npm run dev`)
- Graceful degradation: if service is not running, toggle is disabled with "Start geo-scan service" hint

**Effort:** High. New API route + component + Python service. Worth it for the OPS tab capability jump.

**Free data sources for tiles:**
- NASA WorldView: `worldview.earthdata.nasa.gov` (free, no key)
- Copernicus: `dataspace.copernicus.eu` (free account)

---

## Phase 4 — Automation Backbone (external service, document like Coolify)

**Goal:** Let agents build and trigger n8n workflows across hundreds of services without hand-coding each integration.

**What n8n-mcp provides:**
- 1,396 n8n nodes with full documentation
- 2,709 workflow templates
- AI can create/update workflows in a live n8n instance via MCP

**Nexus approach (same as Coolify):**
- User self-hosts n8n (free, Docker, runs on same machine or VPS)
- `docs/deployment/n8n.md` — setup guide, env vars, how to point agents at it
- Agents get an `n8n_workflow` tool in `/api/tools` — wraps n8n API calls
- Template library from n8n-workflows (4,343 workflows) becomes the agent's automation reference

**Not bundled into Nexus.** Runs alongside it. Zero cost.

**Effort:** Medium for the doc + tool wrapper. High if building full MCP integration.

---

## Priority order

| Phase | Impact | Effort | Do when |
|-------|--------|--------|---------|
| 1B — Agent prompt sharpening | High | Low | Now |
| 1C — Passive auto-memory | High | Medium | After 1B |
| 1A — Agentic RAG router | High | Medium | After 1C |
| 2A — Typography audit | Medium | Low | Parallel with 1C |
| 2B — Simplify pass | Medium | Low | After 2A |
| 2C — Animation polish | Low | Low | After 2B |
| 3 — GeoDeep OPS layer | High | High | Standalone sprint |
| 4 — n8n automation backbone | High | Medium | Standalone sprint |

---

## What this does NOT touch

- Existing agent architecture (5 agents, detection logic, dispatch bar)
- Existing design tokens — the audit sharpens usage, not the tokens themselves
- Any paid API or external service embedded in Nexus
- Telegram integration — that comes when Mario is ready

---

*Created: 2026-03-28. Update this doc when a phase ships.*
