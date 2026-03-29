# Ideas Assimilation Plan — Batch 2

> Rule: Assimilate ideas on Nexus's terms. Never replace what already works. Free APIs only. MIT.
> Date: 2026-03-28

---

## Quick Reference — Verdict Table

| Source | Verdict | Reason |
|--------|---------|--------|
| QuantAgent | SKIP | Trading-specific, LangGraph + image LLM dependency, no free tier |
| Agent Reach | ASSIMILATE | Platform connectors (Reddit, GitHub, RSS) for enriching agent signals |
| Roboflow Trackers | SKIP | Computer vision / video tracking — irrelevant to Nexus |
| GEO-SEO Claude | SKIP | Website SEO tool — wrong domain entirely |
| claude-subconscious | SKIP | Session memory hooks — Nexus already has richer persistent memory |
| project-nomad | SKIP | Offline-first Docker stack — different architecture entirely |
| developer-roadmap | SKIP | Educational content site — no technical transferability |
| system-design-primer | SKIP | Study material — no implementation patterns |
| public-apis | REFERENCE | Free API discovery resource — mine for new data sources |
| AlphaEarth / Earth Engine | ASSIMILATE | DeepMind free satellite embeddings + Earth Engine free API — OPS tab layer |
| Capability Evolver | ASSIMILATE | Agent lesson auto-logging with human review gate |
| Self-Improving Agent | SKIP | Keyword heuristics — we have better context-aware memory |
| Summarize (steipete) | SKIP | CLI summarizer — NOVA already does synthesis better |
| Agent Team Orchestration | ASSIMILATE | RACI roles + state machine + quality gates — formalize PM model |
| Deep Research Agent | ASSIMILATE | Mode detection + source credibility + caveat structure → sharpen NOVA |
| Security Audit Toolkit | ASSIMILATE | Secret detection + OWASP scanner + dependency audit in CI |

---

## Phase A — Security Foundation
**Source:** Security Audit Toolkit (gitgoodordietrying)
**Why now:** Defensive. Operationalizes rules already in `.claude/rules/security.md`. No UX impact.

### A1 — Extend `npm run verify` with secret + OWASP scanning
- Add `scripts/security-scan.js`:
  - Grep `app/api/**` for hardcoded secrets patterns (`sk-`, `Bearer `, `password =`, etc.)
  - Check OWASP Top 10 patterns: missing input validation, `eval()`, `innerHTML`, raw SQL, debug flags
  - Report findings as warnings (non-blocking for now, blocking after v1.0)
- Wire into `package.json` `verify` script after tsc + lint

### A2 — Pre-commit hook for secret detection
- Extend existing `.git/hooks/pre-commit` (or create if absent):
  - Block commit if staged files contain any of: `sk-ant-`, `AKIA`, hardcoded `password`, `Bearer eyJ`
  - Print clear error + list of offending files

### A3 — CIPHER self-audit capability
- Add to CIPHER's system prompt in `components/home/office/prompts.ts`:
  - New capability: "REPO SECURITY SCAN — Scan `app/api/` routes for OWASP gaps"
  - CIPHER can call `list_project_files` + `read_project_file` and audit for: missing input sanitisation, unguarded `req.json()`, secrets in non-env paths, CORS misconfigs

**Files:** `scripts/security-scan.js`, `.git/hooks/pre-commit`, `components/home/office/prompts.ts`, `package.json`

---

## Phase B — NOVA Agent Sharpening
**Source:** Deep Research Agent (jahonn) + Capability Evolver (autogame-17)

### B1 — NOVA mode detection + source credibility framework
Update `buildAgentPrompt('NOVA', ...)` in `components/home/office/prompts.ts`:

**Add RESEARCH MODES block:**
```
RESEARCH MODES (auto-detect from query):
  QUICK  — factual lookup, recent event, single-source answer. One search, answer fast.
  DEEP   — complex topic, multi-angle, contradictory claims. 3+ sources, cross-reference.
  COMPARE — two or more options. Side-by-side matrix. Always declare winner + rationale.

Detect mode from keywords: "quick" / "briefly" / "what is" → QUICK
"research" / "analyse" / "deep dive" / "compare" → DEEP / COMPARE
Default: DEEP.
```

**Add SOURCE CREDIBILITY SCORING block:**
```
SOURCE CREDIBILITY (apply on every claim):
  Official docs / primary source → HIGH [CONFIRMED]
  Reputable news (Reuters, Bloomberg, FT) → HIGH [CONFIRMED]
  Community / GitHub README → MEDIUM [LIKELY]
  Blog / personal site / social → LOW [UNVERIFIED]
  Source older than 90 days for time-sensitive claims → append [STALE — date]
```

**Add CAVEAT REQUIREMENT:**
```
End every DEEP or COMPARE report with:
  CONFIDENCE: [HIGH / MEDIUM / LOW] — one line reason
  GAPS: [what could not be verified or is missing]
```

### B2 — Agent lesson auto-logging ([PROPOSED] prefix)
- Add `log_lesson` to the tool registry in `/api/tools/route.ts`:
  - Appends `- [PROPOSED — {agent} — {date}] {lesson}` to `tasks/lessons.md`
  - Mario reviews and removes the [PROPOSED] prefix to promote it
- Wire into ORBIT's and CIPHER's toolsets (most likely to discover lessons during code + security work)

**Files:** `components/home/office/prompts.ts`, `app/api/tools/route.ts`, `tasks/lessons.md`

---

## Phase C — PM Process Formalization
**Source:** Agent Team Orchestration (arminnaimi)

### C1 — Formalize RACI in `docs/pm-operator-model.md`
Add explicit roles:
- **Orchestrator (Mario/Max):** scope, kill decisions, merge approval, quality gate sign-off
- **Builder (ORBIT/FLUX/NOVA/CIPHER):** implementation, writes code, proposes patches
- **Reviewer (JANSKY + Mario):** reads diffs before any push, checks for scope creep + regressions
- **Ops (JANSKY):** handoff sync, task list state, lessons update

### C2 — Task state machine expansion
Expand `tasks/todo.md` status from 3 to 5 states:
```
[ ] pending → [~] assigned → [>] in_progress → [?] review → [x] done / [!] blocked
```
(Backward compatible — existing `[x]` items stay as-is.)

### C3 — Structured handoff format
Add template to `docs/handoff-supplement.md`:
```
COMPLETED: {what was built}
ARTIFACTS: {files changed or created}
VERIFICATION: {tsc status, manual test result}
KNOWN ISSUES: {anything left open or deferred}
NEXT: {next logical task}
```

**Files:** `docs/pm-operator-model.md`, `docs/handoff-supplement.md`, `tasks/todo.md` (format note only)

---

## Phase D — AlphaEarth / Earth Engine OPS Layer
**Source:** DeepMind AlphaEarth Foundations + Google Earth Engine free API

### What it is
DeepMind released AlphaEarth Foundations — a virtual satellite model trained on global Earth observation data (optical, SAR, thermal). Annual embedding dataset is now **public in Google Earth Engine** (1.4 trillion footprints/year, 2017–2024). Earth Engine API is **free** for education/research/nonprofit use.

### D1 — Lightweight: Earth Engine reference card (OPS tab)
- Add a card below the Leaflet map in `components/ops/` or the OPS tab page:
  - Shows: what AlphaEarth is (1 sentence), last dataset update, links
  - Button: "Explore on Earth Engine" → opens Earth Engine Explorer in new tab at the AlphaEarth collection
  - Link to `leafmap.org/maplibre/AlphaEarth/` for a live demo
  - Zero API cost, zero auth, immediate value

### D2 — Medium: Earth Engine GeoJSON proxy (optional, future)
- `app/api/earth-engine/route.ts`: server-side call to Earth Engine REST API
  - Requires: free Google Cloud project + Earth Engine access token (BYOK pattern)
  - Returns: GeoJSON FeatureCollection for a bounding box (land classification, carbon anomalies, fire scars)
  - Renders as an optional Leaflet overlay (new `LayerKey: 'alphaearth'`)
  - Key stored in settings as `earthEngineKey` (BYOK, never charged)
- **Defer until D1 is live and Mario confirms interest**

**Files:** `components/ops/` (new EarthEngineCard component), `app/api/earth-engine/route.ts` (Phase D2 only)

---

## Phase E — Agent Reach Platform Connectors
**Source:** Agent Reach (Panniantong/Agent-Reach)

### What it is
Agent Reach is a Python service that gives agents pluggable access to: Reddit, GitHub Trending, RSS, YouTube, Twitter/X (config-gated), semantic search via Exa. All open tools, no proprietary dependencies.

### E1 — Run as a local companion service (like GeoDeep)
- `scripts/agent-reach-service.py`: thin FastAPI wrapper around Agent Reach's channel tools
  - Endpoints: `GET /reddit?q=...`, `GET /github-trending`, `GET /rss?url=...`, `GET /search?q=...`
  - Uses: praw (Reddit), GitHub API (public, no key), feedparser (RSS), Exa (optional key)
- `app/api/agent-reach/route.ts`: Next.js proxy to the local service
  - Graceful degradation: returns empty if service not running
- `docs/deployment/agent-reach.md`: setup guide (same pattern as geodep.md + n8n.md)

### E2 — Wire into agent tool registry
- Add three tools to `/api/tools/route.ts`:
  - `reddit_search`: `{ query, subreddit? }` → top posts + sentiment
  - `github_trending`: `{ language?, since? }` → trending repos
  - `rss_fetch`: `{ url }` → parsed articles
- These give NOVA and FLUX richer real-time data without any paid API

**Files:** `scripts/agent-reach-service.py`, `app/api/agent-reach/route.ts`, `docs/deployment/agent-reach.md`, `app/api/tools/route.ts`

---

## What We Are NOT Doing

| Item | Reason |
|------|--------|
| QuantAgent LangGraph orchestration | We have our own 5-agent model; adding LangGraph is replacement not assimilation |
| QuantAgent image analysis | Requires image-capable LLM for every trade — cost and complexity |
| Roboflow Trackers | Computer vision — not relevant |
| GEO-SEO Claude | SEO tool — wrong domain |
| claude-subconscious hooks | We have Zustand persistence + live context injection already |
| project-nomad Docker stack | Different architecture; we're cloud-native API-first |
| developer-roadmap / system-design-primer | Educational content — no code to assimilate |
| Self-Improving Agent (xiucheng) | Keyword heuristics inferior to our LLM-native memory |
| Summarize CLI (steipete) | NOVA already does synthesis; CLI adds no dashboard value |
| Earth Engine D2 (raster proxy) | Defer — assess after D1 lightweight card lands |

---

## Implementation Order

Priority ranked by impact vs. effort:

| Phase | Task | Impact | Effort | Order |
|-------|------|--------|--------|-------|
| A3 | CIPHER self-audit prompt | High | Low | 1 |
| B1 | NOVA mode + source eval + caveat | High | Low | 2 |
| D1 | AlphaEarth reference card (OPS tab) | Medium | Low | 3 |
| B2 | Agent lesson auto-logging tool | Medium | Low | 4 |
| A1 | Security scanner script | High | Medium | 5 |
| A2 | Pre-commit secret hook | High | Low | 6 |
| C1 | RACI in pm-operator-model.md | Medium | Low | 7 |
| C3 | Structured handoff template | Medium | Low | 8 |
| E1+E2 | Agent Reach connectors | High | Medium | 9 |
| D2 | Earth Engine GeoJSON proxy | Medium | High | 10 (deferred) |

---

## Reference Only

These are not implemented but worth mining:

- **public-apis** (github.com/public-apis/public-apis): Curated free API directory. Mine for new data feeds: financial, environmental, geopolitical, health. Check before adding any new data source — the free tier for many well-known APIs is listed there.
- **QuantAgent architecture**: Inspiration for further FLUX specialization — role-based sub-agents per market domain (macro, crypto, equities). No code to take, concept only.
