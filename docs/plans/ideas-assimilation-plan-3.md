# Ideas Assimilation Plan — Batch 3 (All Remaining)

> Rule: Assimilate on Nexus's terms. Never replace what works. Free APIs only. MIT.
> Status: Planning — prioritise into `tasks/todo.md` before starting any batch.
> Sources: `docs/ideas/external-links-mapping.md`, `docs/ideas/assimilated-ecosystem.md`, `nexus-comprehensive-roadmap-2026.md`

---

## What is done (Batches 1 + 2)

| Phase | What shipped |
|-------|-------------|
| Batch 1 | Agent eval harness, runtime quality gates, PM cockpit, GeoDeep, n8n, design tokens, camera presets, 2D→3D HQ migration |
| Batch 2 | Security scanner, pre-commit hook, CIPHER self-audit, NOVA research modes + credibility, log_lesson tool, RACI/5-state machine, handoff template, AlphaEarth card, Agent Reach (Reddit/GitHub/RSS) |

---

## Remaining ideas — priority matrix

| Idea | Source | Impact | Effort | Safety | Verdict |
|------|--------|--------|--------|--------|---------|
| Context engineering (dynamic assembly) | heynavtoor #16 | HIGH | LOW | SAFE | **Batch 3** |
| Feynman cited brief + claim-audit | advaitpaliwal #6 | HIGH | LOW | SAFE | **Batch 3** |
| Prompt recipes (Constraint Cage, Failure Finder) | heyrimsha #5 | HIGH | LOW | SAFE | **Batch 3** |
| Background memory diff injection | charliejhills #18 | HIGH | MED | SAFE | **Batch 3** |
| Design simplify pass (dead props, animation) | roadmap 2B/2C | HIGH | MED | SAFE | **Batch 4** |
| ui-ux-pro-max design rules audit | ui-ux-pro-max-skill | HIGH | MED | SAFE | **Batch 4** |
| Vault tags + search + retrieval | carlosvillu #19 | HIGH | MED | SAFE | **Batch 4** |
| Delta sweep + alert system | eng_khairallah1 #11 | HIGH | MED | SAFE | **Batch 5** |
| HF papers API research tool | koylanai #20 | MED | LOW | SAFE | **Batch 5** |
| Context optimizer (read cache) | claude-context-optimizer C | HIGH | LOW | SAFE | **Batch 5** |
| Memento-Skills cycle (read→execute→reflect→write) | Sumanth_077 #10 | HIGH | HIGH | REVIEW | **Batch 6** |
| RAG router + source validation | LightRAG / mdancho84 #23 | HIGH | HIGH | SAFE | **Batch 6** |
| Scheduled autonomous skills (Aeon pattern) | Aeon B | HIGH | HIGH | REVIEW | **Batch 6** |
| Telegram bot wiring | todo "always last" | MED | MED | REVIEW | **Batch 7** |
| CLI wrappers (ericzakariasson #22) | ericzakariasson | LOW | LOW | SAFE | **Batch 7** |
| ORBIT TDD discipline (superpowers pattern) | superpowers | MED | LOW | SAFE | **Batch 7** |
| HF papers deep research pipeline | mdancho84 #23 | MED | MED | SAFE | **Batch 7** |
| Agent variant prototyping (0xSero #13) | 0xSero | LOW | HIGH | REVIEW | **Defer** |
| Knowledge graph UI (tom_doerr #8) | tom_doerr | LOW | HIGH | SAFE | **Defer** |

---

## Batch 3 — Agent Intelligence Upgrade

**Theme:** Make every agent call smarter without adding complexity to the UI.
**Effort:** 1 session. **Risk:** LOW — all prompt/lib changes, no new routes.

### 3A — Dynamic context assembly (heynavtoor #16)

**Source:** Context engineering article — assembly should be dynamic, not static.
**Problem now:** `buildLiveContext()` returns a fixed block every call. Stale signals get injected even when irrelevant.
**Fix in `lib/liveContext.ts`:**
- Add a `relevanceFilter(agentId, queryKeywords)` function — prune live context sections that are not relevant to the active agent and query.
- CIPHER calls → inject CVE block + security headers; suppress sparklines + news.
- FLUX calls → inject prices + F&G + market news; suppress CVEs.
- NOVA calls → inject news + world risk; suppress prices unless market query.
- JANSKY/ORBIT → full context (orchestrators need the whole picture).
- Result: smaller, sharper system prompts → lower latency + less token waste.

**Files:** `lib/liveContext.ts`, `components/home/office/OfficeCommandCenter.tsx`

### 3B — Feynman cited brief + claim-audit (advaitpaliwal #6)

**Source:** Feynman agent — cited meta-analysis, audit claims for accuracy.
**What to add to NOVA's prompt block in `prompts.ts`:**
- "CITED BRIEF" mode: when user asks NOVA to summarize a document/article, produce a structured output: 1) core claim, 2) supporting evidence with source URLs, 3) counter-evidence if found, 4) confidence score.
- "CLAIM AUDIT" trigger: if user says "verify this", "is this true", "fact-check", NOVA runs a dedicated search + cross-reference before stating a verdict.
- Format: a compact card — Claim | Evidence | Verdict [CONFIRMED/DISPUTED/UNVERIFIED].

**Files:** `components/home/office/prompts.ts` (NOVA block)

### 3C — Prompt recipes: Constraint Cage + Failure Finder (heyrimsha #5)

**Source:** heyrimsha prompt recipes — proven structures for sharper outputs.
**Assimilate 3 patterns into the relevant agent prompts:**

1. **Constraint Cage** (into JANSKY + ORBIT): before executing any multi-step task, state: "Constraints: [what I will NOT do]. Scope: [exactly what I will change]. Done-when: [how to verify]." This prevents scope creep.

2. **Failure Finder** (into CIPHER + ORBIT): after producing any code change or security recommendation, run: "What would make this wrong? What did I assume that could be false?" Then state the top failure mode explicitly.

3. **Example Anchor** (into NOVA): before a DEEP or COMPARE output, find one concrete example that grounds the abstract claim. "For instance: X did Y with result Z."

**Files:** `components/home/office/prompts.ts` (JANSKY, ORBIT, CIPHER, NOVA blocks)

### 3D — Background memory diff injection (charliejhills #18)

**Source:** claude-subconscious — inject a memory diff summary at the top of agent context.
**What this is:** a lightweight "what has changed since last session" block injected into the system prompt.
**How to implement (no background daemon):**
- Add a `buildMemoryDiffBlock(lastSessionSummary: string)` function in `lib/liveContext.ts`.
- The store tracks a `lastSessionSummary` field (simple string, persisted in Zustand).
- After each agent run that produces a substantive result (not tool-only runs), the `OfficeCommandCenter` proposes a one-line summary update via `log_lesson` (already exists).
- On next session open, the diff block appears in the first system prompt: "[MEMORY DIFF] Since last session: {summary}".
- User can clear or edit the summary in Settings.

**Files:** `lib/liveContext.ts`, `store/useStore.ts`, `components/home/office/OfficeCommandCenter.tsx`, `app/settings/page.tsx` (clear memory control)

---

## Batch 4 — UX & Design Pass

**Theme:** Reduce visual noise, tighten the interaction model, apply the 161-rule design audit.
**Effort:** 1–2 sessions. **Risk:** LOW — no data or AI changes.

### 4A — Design rules audit (ui-ux-pro-max-skill)

**Source:** ui-ux-pro-max-skill — 161 design rules, 67 UI styles, color + typography pairings.
**What to audit (not replace) against current Nexus tokens:**
1. Typography scale: confirm 3-level hierarchy is consistent across all tabs (heading / body / label). Kill any one-off `fontSize` values that aren't `var(--text)` / `var(--text2)` / `var(--text3)`.
2. Spacing: confirm all panels use `8px` / `16px` / `24px` rhythm. No odd `9px`, `13px` margins.
3. Color: remove any hardcoded hex values. Every color must be a CSS variable from the dark theme palette.
4. Focus states: `outline: 2px solid var(--accent)` on all interactive elements (keyboard a11y).
5. Empty states: every data-fetching panel needs a "no data" message — not a blank white card.

**Files:** `globals.css`, individual tab components — targeted surgical fixes only.

### 4B — Simplify pass: dead props + redundant state (roadmap 2B)

**Source:** roadmap item 2B.
**What to cut without breaking anything:**
- `OfficeRoom3D.tsx`: audit all props passed into it; remove any that are unused since 2D→3D migration.
- `SettingsDrawer.tsx`: audit internal state — identify any `useState` that could be replaced by the Zustand store (duplicate source of truth).
- `prompts.ts`: verify `detectAgent()` keyword lists have no stale entries (e.g. removed tools that no longer exist).

**Files:** `components/home/office/OfficeRoom3D.tsx`, `components/ui/SettingsDrawer.tsx`, `components/home/office/prompts.ts`

### 4C — Animation polish (roadmap 2C)

**Source:** roadmap item 2C.
**Target:** all transitions should use `var(--t)` — `0.18s cubic-bezier(.4,0,.2,1)`.
1. Grep for `transition:` hardcoded values; replace with `var(--t)`.
2. Add exit animation to SettingsDrawer slide-over (currently only has enter).
3. Confirm CollapsibleSection in `app/intel/page.tsx` uses `var(--t)`.

**Files:** `components/ui/SettingsDrawer.tsx`, `components/home/office/animations.css`, `app/intel/page.tsx`

### 4D — Vault tags + semantic search (carlosvillu #19, Siftly pattern)

**Source:** Siftly — bookmarks → searchable knowledge base with tags.
**What the Vault already has:** saved articles list, basic display.
**What to add:**
1. Tag input per saved article (comma-separated, stored in Zustand `savedArticles` item).
2. Tag filter strip above the vault list — click a tag to filter.
3. Text search input that filters across title + summary + tags.
4. Sort by: newest / oldest / most-tagged.
No graph yet — that comes later. Start with tags + filter.

**Files:** `components/vault/*`, `store/useStore.ts` (extend `SavedArticle` type with `tags: string[]`)

---

## Batch 5 — Data & Intel Expansion

**Theme:** More signal, better surfaced. All free public APIs.
**Effort:** 1–2 sessions. **Risk:** LOW — all additive.

### 5A — Delta sweep + alert system (eng_khairallah1 #11, Crucix pattern)

**Source:** Crucix "personal intelligence terminal" — delta sweep + alerts.
**What Nexus already has:** live prices, CVEs, news, world risk score, F&G.
**What to add:**
- A `buildDeltaSweep()` function in `lib/liveContext.ts` that compares current store snapshot to the previous snapshot (persisted in store as `prevSnapshot`).
- If price change > 3% since last check → alert.
- If CVE count (critical) increases → alert.
- If world risk score jumps > 5 points → alert.
- Surface via existing `store.notifications` system (already exists).
- Run on a configurable interval (default: 15 min) via the cron scheduler.

**Files:** `lib/liveContext.ts`, `store/useStore.ts`, `components/ui/GlobalDataLoader.tsx`

### 5B — Hugging Face papers research tool (koylanai #20)

**Source:** HF papers API — no key, free, daily papers.
**Add to `app/api/tools/route.ts`:**
- New tool: `hf_papers_search(query, date?)` → calls `https://huggingface.co/api/daily_papers` (free, no key).
- Returns: title, abstract (first 300 chars), URL, authors, upvotes, published date.
- Also expose `hf_paper_get(paper_id)` for full abstract retrieval.
- NOVA should use this automatically when asked about AI research papers.
- Add to NOVA's tool list in the prompt block.

**Files:** `app/api/tools/route.ts`, `components/home/office/prompts.ts` (NOVA tools list)

### 5C — Context optimizer (read cache) (claude-context-optimizer C)

**Source:** claude-context-optimizer — avoid redundant file reads across tool calls.
**Problem:** ORBIT reads the same files multiple times in a session (e.g. `prompts.ts` read 3× in one task).
**Fix in `app/api/tools/route.ts`:**
- Add a session-scoped in-memory `readCache: Map<string, { content: string; ts: number }>`.
- TTL: 60 seconds — stale after that (always re-read if agent patched the file).
- After `patch_project_file`, evict the file from cache.
- Cache hits get a `[CACHED — 12s ago]` tag in the result so the agent knows.
- Result: faster ORBIT runs, less token waste on repeated reads.

**Files:** `app/api/tools/route.ts`

### 5D — Free public API mining (public-apis reference)

**Source:** public-apis reference in the ideas list.
**Survey and shortlist 5 free APIs that add real value to Nexus tabs:**

| API | Nexus tab | Key? | What it adds |
|-----|-----------|------|-------------|
| Open-Meteo (weather) | OPS/World | None | Real-time weather for map coordinates |
| World Bank data | INTEL | None | GDP, inflation, debt per country |
| NewsAPI.org | SIGNALS | Free tier | Broader news beyond GDELT |
| PubMed E-utilities | CYBER/VAULT | None | Medical/bio threat research papers |
| SEC EDGAR full-text search | ALPHA | None | 8-K filings — market-moving events |

Pick 1–2 per session. Each follows the pattern in `docs/deployment/agent-reach.md`: add to `app/api/tools/route.ts`, document env vars (if any), test graceful failure.

---

## Batch 6 — Intelligence Architecture

**Theme:** Deeper agent memory, smarter retrieval, autonomous skill loop.
**Effort:** 2–3 sessions. **Risk:** MEDIUM — architectural changes with approval gates.

### 6A — RAG router + source validation (LightRAG / mdancho84 #23)

**Source:** LightRAG graph+vector hybrid pattern + production agentic RAG course.
**Nexus approach (no Neo4j, no embeddings DB):**
- `lib/ragRouter.ts` already planned — implement keyword-first routing:
  1. Parse query → extract domain keywords (market / security / geo / research).
  2. Route to the matching agent Reach connector or live context block.
  3. Append source credibility tag automatically.
  4. Cite every fact with source URL before returning to agent.
- Source validation: every fetch result gets scored by domain tier (as defined in NOVA's prompt). Blocks `[LOW]` sources from being passed to FLUX market decisions.

**Files:** `lib/ragRouter.ts` (new), `lib/liveContext.ts`, `app/api/tools/route.ts`

### 6B — Memento-Skills loop (Sumanth_077 #10)

**Source:** Memento-Skills — read → execute → reflect → write cycle.
**Nexus version (approval-gated):**
1. After each agent run, the system proposes a skill update (not auto-applies).
2. Proposal format: "Based on this run, I suggest adding: [skill rule]. Apply? [Yes/No]".
3. On "Yes": `log_lesson` writes it to `tasks/lessons.md` (already exists).
4. On a weekly schedule (or manually): Mario reviews and promotes approved lessons to `.claude/skills/`.
5. Never auto-write to skill files — human approves every promotion.

**Files:** `components/home/office/OfficeCommandCenter.tsx` (post-run hook), `app/api/tools/route.ts` (log_lesson already there)

### 6C — Scheduled autonomous skills (Aeon pattern)

**Source:** Aeon — scheduled autonomous agent skills on cron.
**Nexus already has:** cron scheduler UI + auto-jobs + cooldown controls.
**What to add:**
- A "skill mission" type in the scheduler: a saved prompt template + target agent + output target (notify / vault / lessons).
- Examples: "Every 6h — FLUX: scan top 10 crypto by 24h change, alert if any move > 5%". "Every day 7am — NOVA: fetch top 3 AI papers published yesterday, save to vault."
- The skill mission runs via the existing auto-jobs mechanism, sends output to Vault or notifications.
- Opt-in per mission, with strict rate limits inherited from existing cooldown system.

**Files:** `store/useStore.ts` (extend SchedulerJob type), `components/home/office/OfficeCommandCenter.tsx` (mission dispatch), scheduler hooks

---

## Batch 7 — Polish & Developer Experience

**Theme:** Final-mile quality: Telegram, CLI, ORBIT discipline, advanced research.
**Effort:** 1 session each. **Risk:** LOW.

### 7A — Telegram bot wiring

**Source:** existing todo "Telegram bot — always last".
**Already:** bot exists on Telegram (Mario's).
**What to add:**
- `app/api/telegram/route.ts`: webhook receiver for Telegram bot messages.
- Parses message → dispatches to the matching agent via `callAI()`.
- Returns agent response as Telegram reply.
- Requires: `TELEGRAM_BOT_TOKEN` in `.env.local`.
- Document in `docs/deployment/telegram.md`.

**Files:** `app/api/telegram/route.ts` (new), `docs/deployment/telegram.md` (new)

### 7B — ORBIT TDD discipline (superpowers pattern)

**Source:** superpowers — design→plan→TDD→review cycle.
**Add to ORBIT's prompt block:**
- Before writing any new function: "Write the test assertion first (in comments), then the implementation, then verify the assertion passes."
- TDD comment format: `// ASSERT: <what this must return given X input>`
- After patch: re-read the function and confirm the assertion is satisfied.
- This is a prompt-only change — no new test framework needed.

**Files:** `components/home/office/prompts.ts` (ORBIT block)

### 7C — ORBIT phase-aware CLI wrappers (ericzakariasson #22)

**Source:** ericzakariasson — standardized non-interactive CLI wrappers for agents.
**What to add:**
- `scripts/orbit.js`: a lightweight CLI that wraps `npm run verify` + reads `tasks/todo.md` and prints the next `[ ]` task. Gives ORBIT a clean "what's next?" interface.
- `scripts/audit.js`: runs `security-scan.js` + `tsc --noEmit` + prints a summary badge (PASS / WARN / FAIL).
- Wire into `package.json` as `npm run orbit:next` and `npm run audit:full`.

**Files:** `scripts/orbit.js`, `scripts/audit.js`, `package.json`

### 7D — Deep research pipeline: HF + PubMed + SEC (mdancho84 #23)

**Source:** production agentic RAG course — grounded research with eval scoring.
**Tie together 7B tools into a NOVA research workflow:**
1. NOVA receives a research query.
2. Runs: `hf_papers_search` + `web_search` + `rss_fetch` (Agent Reach).
3. Cross-references findings across sources.
4. Produces: cited brief (Feynman format from 3B) + confidence score + source tier breakdown.
5. Saves to Vault automatically if confidence is HIGH.

**Files:** `components/home/office/prompts.ts` (NOVA deep research workflow), `components/vault/*` (auto-save hook)

---

## Execution order

```
Batch 3 (1 session)   → Agent prompt intelligence: 3A + 3B + 3C + 3D
Batch 4 (1–2 sessions) → UX: 4A design audit → 4B simplify → 4C animation → 4D vault tags
Batch 5 (1 session)   → Data: 5A delta alerts → 5B HF papers → 5C read cache → 5D 1-2 new APIs
Batch 6 (2 sessions)  → Architecture: 6A RAG router → 6B Memento loop → 6C skill missions
Batch 7 (1 session)   → Polish: 7A Telegram → 7B ORBIT TDD → 7C CLI → 7D research pipeline
```

Each batch ends with:
1. `npx tsc --noEmit` — must pass.
2. `npm run security-scan` — must be clean.
3. Single git commit + push.
4. Handoff template filled in (from `docs/handoff-supplement.md`).

---

## What stays deferred (and why)

| Item | Why deferred |
|------|-------------|
| Knowledge graph UI (tom_doerr) | High effort, low near-term value — revisit after Vault tags (4D) |
| Agent variant prototyping (0xSero) | Needs solid proposal/approval UX first |
| TurboVault (Epistates) | External vault integration — only if Mario uses Obsidian |
| TensorTrade backtesting | Out of scope for intel dashboard |
| Full team orchestration (GithubProjects #3) | Start with phased single-lead; parallelize after Batch 6 |
| Deep Eye-style automated scanning | Security boundary — advisory only, no auto-exploitation |

---

*Edit `tasks/todo.md` `## Next Up` to pull in phases from this plan one batch at a time.*
