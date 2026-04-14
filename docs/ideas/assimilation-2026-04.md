# Nexus Prime — Assimilation Plan April 2026

**Sources reviewed (all verified):** GitReverse (filiksyos) · ByteRover CLI (campfirein) · PageIndex (VectifyAI) · Onyx (onyx-dot-app) · Startup Ideas OS concept (@startupideaspod) · ByteRover announcement (@kevinnguyendn, confirmed same project as campfirein/byterover-cli) · Bloomberg 12 Functions (@RohOnChain) · AutoAgent (@kevingu, github.com/kevinrgu/autoagent) · NotebookLM + Gemini + Obsidian learning workflow

**Note on inference corrections:** The first version of this document inferred the content of the four X posts (all returned 402). The real content changed two blocks significantly. RohOnChain was NOT about on-chain crypto data — it was a full breakdown of Bloomberg Terminal's 12 core functions and their free equivalents. kevingu was NOT about workflow design — it was the release of AutoAgent, a self-optimizing agent library that hit #1 on two production benchmarks without hand-engineering. Both are more valuable to Nexus than the inferences were. Those corrections are reflected throughout.

---

## 1. Source Digest (Verified)

### 1.1 GitReverse (filiksyos/gitreverse)

**What it does:** Takes any public GitHub URL, calls the GitHub API for metadata and README, feeds it to an LLM (via OpenRouter in their impl), and returns a single synthetic prompt that captures the repo's essence well enough to regenerate the project from scratch.

**Why it matters:** The pattern is the point, not the product. Any repo's structure, tech choices, and intent can be distilled into a compact, actionable prompt. That prompt is more useful to an AI agent than raw source code because it is compressed into the shape the agent needs for reasoning — not the shape the human developer wrote it in.

**Nexus fit:** RECON tab and ORBIT agent. When ORBIT needs to understand a reference library, when NOVA is doing competitive research on an OSS project, or when the user wants to rapidly assess a new dependency, ORBIT can run this pattern against any GitHub URL in one tool call.

---

### 1.2 ByteRover CLI (@kevinnguyendn / campfirein/byterover-cli) — CONFIRMED

**Real content:** This is the official open-source announcement of ByteRover CLI. Key verified facts:

- **Architecture:** Replaced vector embeddings with a file-based **Context Tree** — a hierarchy of markdown files organized by domain. Memory is now diffable, branchable, and mergeable like git.
- **Retrieval accuracy:** >92% across long-running sessions ("highest accuracy proven in production")
- **Retrieval speed:** ~1.6s average
- **Token savings:** 50–70% savings while maintaining >90% accuracy, even with lightweight models
- **Formerly Cipher:** The project was internally called Cipher before this open-source release — interesting given we have a CIPHER agent
- **Anthropic connection:** Released after "Anthropic accidentally leaked their agent memory architecture" — the architecture ByteRover implements is close to what Anthropic validated internally
- **Architecture paper:** Available — the benchmark and paper are public

**Why it matters for Nexus:** Three things stand out beyond the tree structure itself. First, the 50–70% token savings while maintaining accuracy is a direct cost reduction for every agent call — if our lessons injection uses a tree with targeted retrieval instead of injecting all 60 rules, we send fewer tokens per call. Second, the git-diffable memory model means the lessons tree can have a version history — we can see when rules were added and revert bad ones. Third, the Anthropic architecture alignment means this is not experimental — it reflects how the Claude team thinks about agent memory.

**What we skip:** Cloud sync and the CLI runtime. We adopt the file-based tree structure and the retrieval accuracy approach, implemented locally inside the Nexus store and lessons hook.

---

### 1.3 PageIndex (VectifyAI/PageIndex)

**What it does:** Vectorless reasoning-based RAG. Documents are indexed as hierarchical trees (like a table of contents). At query time, the LLM reasons through the tree to find relevant sections — the way a domain expert navigates a technical manual. No chunking, no embeddings, no vector DB. Achieved 98.7% accuracy on financial document benchmarks, beating all vector baselines.

**Why it matters:** The current `lib/ragRouter.ts` in Nexus does keyword-based domain routing with confidence scoring. It is fast and zero-cost. But for complex multi-domain queries, the flat keyword approach picks the wrong domain or spreads confidence too thin. PageIndex proves you can do reasoning-based retrieval with only LLM calls — no infrastructure — and get results that beat vector databases on hard documents.

**Nexus fit:** Two surfaces. First, upgrade `lib/ragRouter.ts` with a reasoning fallback for low-confidence queries. Second, VAULT article indexing: when an article is saved, extract a 3-level summary tree (title → key entities → core claim) so NOVA can search VAULT by reasoning through the index rather than keyword matching.

---

### 1.4 Onyx (onyx-dot-app/onyx)

**What it does:** Self-hosted AI platform: agentic RAG with hybrid indexing, multi-step Deep Research workflows, custom agents, real-time web search, sandboxed code execution, voice mode (TTS/STT), image generation, MCP/actions integration.

**Why it matters:** Onyx is the full enterprise version of what Nexus is building. Studying it reveals the complete feature surface of a production AI platform and which parts are feasible in a lightweight free alternative.

**Nexus fit:** Deep Research mode for NOVA (multi-step research → structured report → VAULT), voice briefings via browser Web Speech API (zero dependencies, zero cost), and sandboxed code execution patterns.

**What we skip:** Running Onyx alongside Nexus. Still "complementary product" per the ecosystem doc. We adopt patterns, not the product.

---

### 1.5 AI Company OS / Department Agent Concept (@startupideaspod) — CONFIRMED

**Real content:** The post is exactly as the user quoted — a concept for an AI system organized around six business departments: Engineering (code, testing, DevOps), Design (UI/UX, brand assets), Marketing (content, SEO, social), Sales (lead gen, outreach, demos), Support (tickets, docs), Data (metrics, analysis). Each department gets AI tuned to its specific language and workflows.

**Nexus fit:** Mission templates rather than new agents. The existing 5 agents cover all six departments by reconfiguration. ORBIT = Engineering. NOVA = Research (covers Marketing content research and Support doc generation). FLUX = Data. JANSKY = Sales and Design orchestration. CIPHER = Security within Engineering. Mission templates set the agent, system prompt additions, and tool priorities for each department context without any new code surfaces.

---

### 1.6 Bloomberg Terminal 12 Functions (@RohOnChain) — NEW, NOT ON-CHAIN

**Real content:** A detailed breakdown of the 12 Bloomberg functions that power institutional workflows, with free alternatives for each. The author (a backend developer working on HFT-style execution and prediction markets) spent six months mapping what institutions actually use daily.

**The 12 functions and their free equivalents:**

| Bloomberg | Purpose | Free equivalent |
|-----------|---------|-----------------|
| GMM | Global macro movers — all asset classes overnight | TradingView free tier |
| TOP | Market-relevance ranked news (NLP-ranked, not chronological) | Bloomberg.com + Reuters (lose the ranking signal) |
| BTMM | Sovereign yields, central bank rates, money market spreads | FRED API (already in Nexus via `fredKey`) |
| PORT | Live portfolio factor decomposition, VaR, scenario stress | PyPortfolioOpt, RiskFolio-Lib in Python |
| MARS | Derivatives risk — Greeks, vol surface, counterparty risk | Complex — out of scope for lightweight dashboard |
| SRCH | Fixed income screening across OTC bond markets | FINRA TRACE data (public) |
| OVME | Options pricing against live vol surfaces (full term structure + skew) | QuantLib (open source) + CBOE vol data |
| YAS | Yield/spread analysis across bond conventions — relative value | QuantLib handles bond math |
| TRA | Pre-trade transaction cost analysis — market impact, slippage, IS | Almgren-Chriss model in Python |
| DAPI | Bloomberg data into Excel/Python pipelines (BDP/BDH/BDS) | yfinance, Alpha Vantage, Quandl free tiers |
| IB | Instant Bloomberg — institutional network of 325,000 terminals | **No free equivalent — this is the real moat** |
| BVOL | Live implied vol surfaces — standardized benchmark for OTC pricing | CBOE + scipy interpolation |

**Key insight from the post:** "Free alternatives exist for almost everything except the network. QuantLib, QuantConnect, PyPortfolioOpt, FRED API, FINRA TRACE and the Almgren-Chriss model together give you approximately 80% of the analytical capability of the Terminal at zero cost. The 20% that cannot be replicated is the IB network, the Bloomberg data quality guarantees, the integrated workflow and the institutional credibility."

**Why this completely changes Block H:** My original inference was that RohOnChain was about on-chain crypto data (based on the username). The actual content is far more valuable. This is a blueprint for building a free Bloomberg-grade analytical layer inside Nexus. Most of the free data sources named (FRED API, yfinance, QuantLib patterns, CBOE vol data) are either already in Nexus or trivially addable. FLUX agent becomes the Bloomberg terminal the user cannot afford.

**Nexus fit:** Major new block — "Free Bloomberg Layer" for ALPHA and FLUX. This is a significant ALPHA tab expansion.

---

### 1.7 AutoAgent (@kevingu, github.com/kevinrgu/autoagent) — NEW, NOT WORKFLOW DESIGN

**Real content:** The open-source release of AutoAgent — "the first open source library for self-optimizing agents." Verified benchmarks:
- **#1 SpreadsheetBench: 96.5%**
- **#1 TerminalBench GPT-5 score: 55.1%**
- Both achieved after 24+ hours of autonomous optimization. Every other leaderboard entry was hand-engineered. AutoAgent's was not.

**How it works:**
- A **meta-agent** experiments on a **task agent's harness** — tweaking prompts, adding tools, refining orchestration
- Task agent starts with just a bash tool. After 24 hours: domain-specific tooling, verification loops, orchestration logic — all discovered autonomously
- Loop: edit harness → run on tasks → measure performance → read failure traces → keep improvements, revert failures → repeat

**Emergent behaviors AutoAgent discovered without being programmed:**
1. **Spot checking** — ran isolated tasks for small edits instead of the full suite (saved compute dramatically)
2. **Forced verification loops** — built deterministic self-checks and formatting validators
3. **Writing tests** — steered the task agent to build its own unit tests for each task
4. **Progressive disclosure** — dumped long contexts to files when results overflowed context windows
5. **Orchestration logic** — built task-specific subagents and handoffs when the domain required it

**Key lessons from the release post:**
1. **Splitting helps.** Being good at a domain and being good at improving at a domain are different capabilities. One agent cannot do both well. The meta/task split lets each specialize.
2. **Traces are everything.** When only scores were given (without trajectories), improvement rate dropped hard. The meta-agent needs to understand *why* something failed, not just *that* it failed. Traces give the meta-agent interpretability over the task agent's reasoning — that is what makes targeted edits possible.
3. **Agents overfit.** The meta-agent gets lazy and inserts rubric-specific prompting so the task agent can game metrics. Constrained by forcing self-reflection: "if this exact task disappeared, would this still be a worthwhile harness improvement?"
4. **Meta-agent quality matters.** Harness edits are often inspired by the meta-agent's own tooling. Same-model pairings win — Claude meta-agent + Claude task agent outperformed Claude meta-agent + GPT task agent. The meta-agent writes harnesses the inner model actually understands because they share the same weights and reasoning tendencies.

**The "model empathy" insight:** "We project our own intuitions onto systems that reason differently. We're bad at empathizing with models. AutoAgent operationalizes this. The meta-agent reads the task agent's reasoning traces and already has implicit understanding of itself. So when it sees the task agent lost direction at step 14, it understands the failure mode as part of its worldview and corrects it." This is why Claude-as-meta-agent + Claude-as-task-agent works better than mixing providers.

**Nexus fit:** This is directly applicable to three existing systems in Nexus: the eval runner (`scripts/eval-agent-runtime.js`), the lessons engine (just built), and the agent runtime diagnostics. The AutoAgent loop is exactly what we want JANSKY to run over ORBIT and NOVA — but we keep it approval-gated rather than fully autonomous. The "traces are everything" finding validates the agent run artifacts we already store.

---

### 1.8 NotebookLM + Gemini + Obsidian (10x Learning)

**The workflow:** Upload sources to NotebookLM → get grounded AI summaries and audio podcast digests → take structured notes in Obsidian with bidirectional `[[wikilinks]]` → use Gemini for multi-document synthesis → result is a knowledge graph that grows with every session.

**Nexus fit:** VAULT tab 2.0. Right now VAULT is a saved article list. It should become a compounding knowledge graph with D3 graph visualization, entity linking, voice readback (Web Speech API), and Obsidian-compatible markdown export.

---

## 2. Corrected Assimilation Map

| Source | What I inferred | What it actually was | Plan change |
|--------|----------------|----------------------|-------------|
| @kevinnguyendn | General memory tools | ByteRover CLI announcement — same project as campfirein/byterover-cli | No new block, but richer ByteRover section with token savings and git-diff memory model |
| @RohOnChain | On-chain crypto/DeFi data | Bloomberg 12 Functions + free equivalents — full institutional workflow blueprint | Block H completely replaced by new Block J (Free Bloomberg Layer) — far more valuable |
| @kevingu | Workflow design / plan-before-automate | AutoAgent self-optimizing agents, #1 on two benchmarks | New Block K (Agent Self-Optimization) — applies directly to our eval + lessons system |
| @startupideaspod | Inferred from user's inline text | Confirmed as the department list: Engineering, Design, Marketing, Sales, Support, Data | No change — inference was correct |

---

## 3. Implementation Blocks

### Block A — Hierarchical Lessons Tree (ByteRover pattern)

**Why:** The flat `Lesson[]` array gives all 60 rules equal weight on every query. ByteRover's architecture proves that domain-scoped tree retrieval achieves >92% accuracy with ~1.6s retrieval time. The critical benefit for Nexus is the 50–70% token savings — if the agent only injects 3 lessons from the relevant domain branch instead of scanning 60 rules, every call is cheaper and the injected context is more focused.

**Git-diffable model:** Structure `tasks/lessons.md` as domain sections. The file itself becomes the "context tree." Any edit is a git diff — Mario can see exactly what rules changed and when.

**What to build:**
- Restructure `tasks/lessons.md` into domain sections: `## Engineering`, `## UI`, `## Agents`, `## Security`, `## Data`, `## Process`
- `lib/lessonsTree.ts` — `LessonDomain` type, `LessonTree = Record<LessonDomain, Lesson[]>`, `parseLessonsTree(md: string): LessonTree`
- Upgrade `hooks/useLessons.ts` — parse into tree instead of flat array; expose `getTopLessonsForDomain(tree, query, domain, n)` that searches the domain branch first, then falls back to other branches if < n results
- Upgrade `OfficeCommandCenter.tsx` — pass detected agent domain to tree retrieval: ORBIT → engineering, CIPHER → security, NOVA → agents + process, FLUX → data, JANSKY → all domains
- Token impact: target < 200 tokens for the lessons block per call (3 rules × ~60 tokens each)

**Security:** No new external calls. Pure client-side markdown parsing. No risk.

**Files touched:** `tasks/lessons.md` (restructure), `lib/lessonsTree.ts` (new), `hooks/useLessons.ts` (upgrade), `OfficeCommandCenter.tsx` (domain-aware call).

---

### Block B — RECON Repo Intelligence Panel (GitReverse pattern)

**Why:** ORBIT agent frequently needs to understand reference libraries, competitor repos, and external dependencies. Instead of the user manually reading READMEs and pasting summaries, ORBIT can fetch, compress, and reason about any public GitHub repo in one tool call.

**What to build:**
- `app/api/repo-intel/route.ts` — validates repo string format (`/^[a-zA-Z0-9._-]{1,100}\/[a-zA-Z0-9._-]{1,100}$/`), calls GitHub API (no auth needed for public repos, optional token via existing settings for rate limits), returns: description, tech stack inferred from `package.json`/`requirements.txt`/`go.mod`, top-level file tree, README first 1500 chars, topics
- LLM compression step: small call (max 300 tokens) to synthesize the raw metadata into a one-paragraph "implementation brief" — routes through `/api/ai` (never direct)
- `components/recon/RepoIntelPanel.tsx` — URL input, calls `/api/repo-intel`, shows tech stack chips, file tree, brief, and "Brief ORBIT" button that injects the result into HQ chat as an ORBIT message
- ORBIT tool registration: `analyze_repo(owner_slash_repo)` → calls `/api/repo-intel`, returns structured brief

**Security:**
- Validate repo format before any API call — reject anything that doesn't match the pattern
- GitHub API: read-only metadata only. Never fetch raw source files, never execute anything.
- Rate limit: 10 requests/minute per session. Cache results for 30 minutes.
- LLM call routes through existing `/api/ai` proxy — no direct provider calls.

**Files:** `app/api/repo-intel/route.ts` (new), `components/recon/RepoIntelPanel.tsx` (new), `lib/agent.ts` (add `analyze_repo` tool).

---

### Block C — Reasoning RAG Upgrade (PageIndex pattern)

**Why:** `lib/ragRouter.ts` uses keyword confidence scoring. When confidence < 0.35 (multi-domain query), the current fallback is to return multiple domains simultaneously — useful but noisy. PageIndex proves that a brief reasoning pass achieves dramatically better precision: "which branch of the knowledge tree is relevant to this query?" costs < 200 tokens and returns a focused answer.

**What to build:**
- Add `reasoningRoute(query: string): Promise<RagRouteResult>` to `lib/ragRouter.ts` — max 200 token LLM call with: query + domain tree summary (each domain described in one sentence) → LLM picks 1–2 best domains + 1-sentence rationale
- Session-level cache: same query string → same domain result within 10 minutes, no repeat LLM call
- VAULT indexing: when an article is saved, run a 100-token summarization (title → entities → claim) and store as `article.index?: {entities: string[], claim: string}` — used by reasoning router to search VAULT
- Fallback chain: keyword router first → if confidence ≥ 0.35, use keyword result → if < 0.35, invoke reasoning route

**Latency:** ~200ms for the reasoning pass, only on low-confidence queries. Acceptable.

**Security:** LLM call routes through `/api/ai`. Session cache is client-side memory only. No new data leaves the device.

**Files:** `lib/ragRouter.ts` (upgrade `routeQuery` + add `reasoningRoute`), `store/useStore.ts` (add optional `index` field to `Article`), `hooks/useArticles.ts` (trigger indexing on save).

---

### Block D — NOVA Deep Research Mode (Onyx pattern)

**Why:** NOVA currently does single-pass research. Onyx's multi-step workflow — generate sub-queries → search each → read sources → cross-reference → structured report — catches contradictions, adds source diversity, and produces a cited report instead of a single paragraph. The AutoAgent post reinforces this: "traces are everything." Deep research that shows its sources is more trustworthy than a single synthesized answer.

**What to build:**
- New tool `deep_research` in `/api/tools/route.ts`:
  1. Generate 3 sub-queries from the main query (max 100 tokens)
  2. Search each sub-query (existing `web_search` tool)
  3. Fetch top 2 results per sub-query (existing `fetch_url` tool)
  4. Synthesize across all 6 sources into a structured report: `{title, summary, sections: [{heading, content, sources[]}]}`
  5. Auto-save to VAULT as `savedArticle` with `cat: 'research'` and `src: 'nova-deep-research'`
- NOVA system prompt update in `prompts.ts`: add deep research reasoning pattern — "for research-intent queries, use deep_research tool rather than single search"
- Intent detection: when NOVA detects keywords (research, analyze, comprehensive, deep dive, full breakdown), suggest deep research mode in chat with estimated time ("~20–30s — use deep research?")

**Security:**
- Sub-queries generated from user input — sanitize before passing to search API
- `fetch_url` calls validate HTTPS only, reject RFC 1918 IP ranges (already enforced)
- Research output stored in VAULT (client-side) — not sent anywhere external

**Files:** `app/api/tools/route.ts` (add `deep_research`), `components/home/office/prompts.ts` (NOVA update), `OfficeCommandCenter.tsx` (deep research suggestion UI).

---

### Block E — Voice Briefings (Onyx + NotebookLM pattern)

**Why:** NotebookLM's most used feature is audio podcast generation. The insight is that audio consumes zero visual attention — you can be briefed while doing something else. Nexus can deliver this at zero cost and zero dependencies using the browser's built-in `SpeechSynthesis` API. No external TTS service, no API key, works offline, no data leaves the device.

**What to build:**
- `components/ui/SpeakButton.tsx` — speaker icon, calls `window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))`, with pause/stop controls and a visual progress indicator showing approximate remaining time
- Settings additions: voice selector (lists `speechSynthesis.getVoices()`), speed (0.8–1.4), pitch, auto-speak toggle for NOVA deep research reports
- Mount on: HQ chat agent responses (small speaker icon per message), VAULT article cards (speak the article description), NOVA research reports (speak the summary section only — first ~300 words)
- Disclosure tooltip in settings: note that Chrome on some platforms may route TTS through Google servers; Firefox and Edge use local voices by default

**Security:** Entirely client-side. Web Speech API sends no data to Nexus servers. The above disclosure covers the platform-specific behavior of Chrome's neural voices.

**Files:** `components/ui/SpeakButton.tsx` (new), `OfficeCommandCenter.tsx` (add to agent messages), `components/vault/VaultArticleCard.tsx` (add to article cards), `components/settings/SettingsDrawer.tsx` (voice settings section).

---

### Block F — VAULT Knowledge Graph (Obsidian pattern)

**Why:** Obsidian's core insight is that knowledge compounds when notes link to each other. A flat list of 200 saved articles is hard to use. A graph where "DeFi protocol hack" links to "smart contract vulnerability" links to a saved CIPHER analysis is a searchable, navigable second brain. D3 force-directed graphs are fast, need no backend, and can run entirely client-side.

**What to build:**
- VAULT graph view: toggle between list (current) and graph view — D3 force-directed graph, each article a node, edges drawn between articles sharing tags or AI-extracted entities
- Entity extraction: when NOVA saves a deep research report to VAULT (Block D), extract key entities (organizations, technologies, threat actors, tickers) as tags. Tags become edge labels in the graph.
- `[[wikilink]]` export: "Export VAULT" button zips all saved articles as `.md` files with `[[article-title]]` cross-links, ready to import into Obsidian
- VAULT search: free-text search across titles, descriptions, tags, and extracted entities — all client-side with a simple `includes()` pass across the saved articles array

**Security:** All client-side. Zip export is a local browser download — no data sent anywhere.

**Files:** `components/vault/VaultGraph.tsx` (new — D3), `components/vault/VaultExport.tsx` (new — zip), `app/vault/page.tsx` (view toggle).

---

### Block G — Department Mission Templates (AI Company OS pattern)

**Why:** The same 5 agents, configured differently, serve 6 distinct business contexts. A "Marketing Sprint" needs NOVA searching for content ideas, JANSKY structuring a content calendar, and FLUX reading social engagement signals. "Security Incident Response" needs CIPHER on CVE feeds, NOVA on threat intel, JANSKY writing the incident timeline. The difference is configuration — mission templates encode that configuration so the user selects a context rather than manually setting it.

**What to build:**
- `lib/missionTemplates.ts` — 6 templates, each with: `{ id, label, icon, defaultAgent, systemPromptAddon, priorityTools, outputTarget, planSteps }`:
  - Engineering: ORBIT-first, code tools, GitHub analysis, outputs to VAULT
  - Design: JANSKY-first, visual critique framing, brand standards context
  - Marketing: NOVA-first, content research + SEO signals, social trend feeds
  - Security Ops: CIPHER-first, CVE feeds, threat intel, incident report output
  - Market Intelligence: FLUX-first, price feeds + Bloomberg free layer (Block J), research output
  - Deep Research: NOVA-first, `deep_research` tool, auto-VAULT save
- Mission template picker in HQ chat input: small compact selector above the textarea (6 icon buttons)
- Scheduler integration: scheduled jobs can reference a template ID — "run Market Intelligence on Mondays at 6am"
- Pre-run brief (Block I feeds into this): display the template's `planSteps` as a 3-step preview before execution

**Security:** Templates are config objects — no new external calls, no new attack surface.

**Files:** `lib/missionTemplates.ts` (new), `OfficeCommandCenter.tsx` (template picker + plan brief display), `components/ui/CronSchedulerPanel.tsx` (template-type jobs).

---

### Block H — On-Chain Data for FLUX (supplementary to Block J)

**Note:** The original Block H was based on my incorrect inference that @RohOnChain was about on-chain data. It is not — that post is about Bloomberg's 12 functions. However, on-chain data remains a valid addition to FLUX alongside the Free Bloomberg Layer (Block J). This block is now smaller and feeds into Block J as one data category within the broader financial intelligence layer.

**Free on-chain sources to add (no key needed):**
- DefiLlama TVL: `https://api.llama.fi/protocols` — top protocol TVL and 7-day change
- Etherscan gas tracker: free tier basic gas endpoint
- These give FLUX manipulation-resistant signals that centralized price APIs cannot provide

**Files:** Folded into Block J route — `app/api/market-intel/route.ts`.

---

### Block J — Free Bloomberg Layer (FLUX / ALPHA) — NEW BLOCK

**Why:** @RohOnChain's post is a gift: a precise mapping of Bloomberg's 12 institutional functions to free alternatives. Nexus already has some of these (FRED API via `fredKey`, yfinance-style data via CoinGecko). This block assembles the remaining pieces into a coherent "institutional-grade analysis without the $24,000 terminal" layer for FLUX agent and ALPHA tab.

**The 80% target:** As the post states, "QuantLib, QuantConnect, PyPortfolioOpt, FRED API, FINRA TRACE and the Almgren-Chriss model together give you approximately 80% of the analytical capability of the Terminal at zero cost." The 20% we cannot replicate is the IB institutional network (325,000 verified users) and Bloomberg's proprietary data quality guarantees. We do not attempt those. Everything else is buildable.

**What to build, mapped to Nexus surfaces:**

**GMM equivalent (COMMAND tab):** Already partially exists. Expand the COMMAND tab multi-asset KPI row to include: equities indices (S&P, Nasdaq, DAX), bond yields (US 10Y, German Bund via FRED API), commodities (gold, oil via free feeds), currencies (DXY), and crypto (already have). One row, all asset classes, overnight move vs historical volatility. FLUX agent reads this row first on every morning briefing.

**TOP equivalent (INTEL tab):** Already have article feeds with bias tags (bullish/bearish/neutral). Upgrade: add a relevance ranking score to each article — not just chronological. Score = (recency weight × 0.4) + (source authority weight × 0.3) + (market-move keyword density × 0.3). Display as a "Market Relevance" sort option alongside chronological.

**BTMM equivalent (COMMAND + ALPHA):** FRED API is already wired in (`fredKey` in settings). Add 5 key FRED series: DGS10 (10Y yield), DFF (Fed Funds Rate), T10Y2Y (yield curve spread), BAMLH0A0HYM2 (HY credit spread), VIXCLS (VIX). Display as a "Rate Environment" strip. FLUX agent reads this before any macro analysis.

**PORT equivalent (ALPHA tab):** Add a portfolio factor panel to ALPHA. User inputs their holdings (tickers + weights). Client-side calculations using returns data from existing price feeds: simple factor exposures (beta to BTC, beta to S&P if equities added, momentum score, volatility). Display as a factor bar chart. Not as deep as Bloomberg PORT with its proprietary risk models — but the framework is identical and the math is the same.

**OVME equivalent (ALPHA tab):** Add a Black-Scholes options calculator panel. Inputs: spot price (from live price feed), strike, expiry, risk-free rate (from FRED DFF), implied volatility (user input or CBOE VIX as proxy). Outputs: call/put price, delta, gamma, theta, vega. Client-side math — no API call. This is the core of options pricing without the vol surface data that Bloomberg provides.

**TRA equivalent (ALPHA tab):** Add a simple pre-trade cost estimator using the Almgren-Chriss impact formula: estimated market impact = η × σ × (order_size / ADV)^0.6, where η is a market impact constant, σ is daily volatility, and ADV is average daily volume. All inputs available from existing price feeds. Shows the user approximately how much a trade will cost to execute before they place it.

**BVOL equivalent (ALPHA tab):** Add CBOE volatility data: VIX (already via FRED VIXCLS), VIX term structure (VIX3M, VIX6M via FRED if available), and SKEW index. Display as a vol panel alongside price signals. This gives FLUX the volatility surface context without Bloomberg's dealer-quote vol surface.

**DefiLlama + Etherscan (on-chain layer):** TVL and gas as additional FLUX signals — folded in from Block H.

**FLUX agent upgrade:** Equip FLUX with a `bloomberg_equivalent` tool that queries the above free endpoints in parallel and returns a structured morning brief: rate environment + global macro movers + vol regime + on-chain health. This is the institutional morning stack, free.

**Security:**
- FRED API: existing `fredKey` pattern — no change
- CBOE: public endpoint, no key, wrap in `try/catch`
- DefiLlama: public, no key
- Black-Scholes and Almgren-Chriss: client-side math only, no external calls
- All new server routes follow existing pattern: validate input, try/catch, no stack traces in responses
- Rate limit: 5 minute server-side cache on all external financial data endpoints

**Files:** `app/api/market-intel/route.ts` (new — aggregates FRED series, CBOE VIX, DefiLlama), `components/alpha/BloombergFreePanel.tsx` (new — rate strip, factor panel, options calculator, TCA estimator), `components/command/RateEnvironmentStrip.tsx` (new), `lib/agent.ts` (add `bloomberg_equivalent` tool to FLUX).

---

### Block K — Agent Self-Optimization (AutoAgent pattern) — NEW BLOCK

**Why:** AutoAgent hit #1 on two production benchmarks (96.5% SpreadsheetBench, 55.1% TerminalBench) without a single hand-engineered harness improvement — purely through autonomous meta-agent / task-agent optimization. Three of its key findings map directly to existing Nexus systems and tell us specifically what to improve.

**Finding 1 — Traces are everything:**
AutoAgent found that when it only received scores (not reasoning trajectories), improvement rate dropped hard. Nexus already stores `AgentRunArtifact` with `toolTraces` and `verificationSummary`. The finding says: JANSKY should be able to read recent ORBIT/NOVA/CIPHER run artifacts as input when a user asks "what went wrong in that last run?" or "why is this agent underperforming?" This is the meta-agent read capability.

**Finding 2 — Same-model pairings win:**
Claude meta-agent + Claude task agent outperformed Claude meta-agent + GPT task agent. The meta-agent writes harnesses the inner model understands. This directly validates the current Nexus setup: all agents run on Claude. We should not split the provider for "cheaper" task runs — the performance degradation is real and measurable.

**Finding 3 — Anti-overfit discipline:**
"If this exact task disappeared, would this still be a worthwhile harness improvement?" This is the right question to ask before adding any new lesson rule to `tasks/lessons.md`. Add this as a standing rule in the lessons file and in the agent prompt for any lesson-writing task: "This rule must generalize beyond the specific incident that prompted it."

**Finding 4 — Emergent spot-checking:**
AutoAgent discovered independently that running a small isolated task (not the full suite) is faster for validating small edits. This maps to our `npm run verify` discipline — verify a targeted check, not a full rebuild, when making small changes.

**What to build:**
- JANSKY meta-agent mode: When the user messages JANSKY with intent like "review last ORBIT run" or "why did NOVA fail," JANSKY reads the most recent `agentRunHistory` artifact (already in the store), formats the tool traces and verification summary, and provides an analysis. This is "traces are everything" operationalized.
- Agent run artifact viewer: In HQ, a collapsible "Last Run" panel that shows: run ID, phase durations, tool traces (already stored in `AgentRunArtifact`), verification result, and a "Send to JANSKY for review" button
- Lesson anti-overfit guard: In the NOVA deep research report template and in ORBIT's system prompt, add: "Before recording a new lesson, ask: if the specific task that prompted this rule disappeared, would the rule still be valuable?"
- Provider lock rule in `tasks/lessons.md`: "Keep all agents on the same provider (Anthropic). Same-model pairings outperform mixed providers by measurable margin. Do not route task agents to OpenAI to reduce cost during active optimization sessions."

**What we do NOT build:** Fully autonomous self-modification (the AutoAgent loop running overnight). We keep the JANSKY meta-agent capability approval-gated — it can analyze and propose improvements to prompts and tools, but Mario approves before any harness change is applied. This aligns with the `agentHighRiskWritesRequireApproval` setting that already exists.

**Security:** JANSKY reading `agentRunHistory` is read-only access to already-stored data. No new external calls. Proposed harness improvements go through the existing `PendingEdit` approval flow.

**Files:** `components/home/office/OfficeCommandCenter.tsx` (JANSKY meta-agent mode trigger), `components/home/office/widgets/AgentRunViewer.tsx` (new — last run panel), `components/home/office/prompts.ts` (JANSKY meta-agent system prompt addition), `tasks/lessons.md` (add provider lock rule and anti-overfit rule).

---

### Block L — Free Provider Expansion (vava-nessa/free-coding-models) — NEW BLOCK

**Why:** The free-coding-models repo catalogs 174 free models across 23 providers. Three providers in the list are OpenAI-compatible, have generous free tiers, and are not yet in the Nexus AUTO_CHAIN: Cerebras (~1750 tokens/second — fastest inference in the registry), NVIDIA NIM (enterprise-grade infrastructure, free tier with Llama 3.3 70B), and SambaNova (Llama 4 Maverick 17B with 128-expert MoE, long context). Adding them extends the AUTO_CHAIN with three more fallback nodes before paid cloud providers, which means more users get fast responses at zero cost even if Groq is rate-limited.

**What was built:**
- Added `cerebras`, `nvidia`, `sambanova` to the `PROVIDERS` map in `app/api/ai/route.ts`, each using the OpenAI-compatible format and their respective free-tier default models
- Updated `AUTO_CHAIN` to: `["ollama", "groq", "cerebras", "nvidia", "sambanova", "openrouter", "google", "minimax", "anthropic", "openai"]` — free providers cluster before paid
- Updated `.env.example` with key names and signup URLs for all three
- Updated the fallback chain comment at the top of route.ts

**Provider details:**
- **Cerebras** — `CEREBRAS_API_KEY`, model `llama-3.3-70b`, endpoint `api.cerebras.ai` — sign up at cloud.cerebras.ai. Fastest inference in the list (~1750 tok/s). Good for latency-sensitive tasks.
- **NVIDIA NIM** — `NVIDIA_API_KEY`, model `meta/llama-3.3-70b-instruct`, endpoint `integrate.api.nvidia.com` — sign up at build.nvidia.com. Enterprise infrastructure, reliable uptime.
- **SambaNova** — `SAMBANOVA_API_KEY`, model `Llama-4-Maverick-17B-128E-Instruct`, endpoint `api.sambanova.ai` — sign up at cloud.sambanova.ai. Most capable free model (Llama 4 Maverick MoE architecture).

**Why NOT in FREE_DEFAULT_PROVIDERS:** Consistent with Groq's treatment — all three require API key registration. Free tier, but not zero-friction like Ollama. Users opt in by setting the key.

**What we skipped and why:**
- Cohere: good models but their free tier specifically restricts commercial use; Nexus is MIT-licensed and used commercially by some users — skip to stay safe
- Together AI, Fireworks, Perplexity, Mistral: OpenRouter already gives access to models from these providers as a meta-gateway; adding them individually creates redundancy without new value
- DeepSeek API: strong models but data handling policy unclear for non-Chinese users; defer pending clearer terms
- Hyperbolic, Novita, Lambdalabs: niche or GPU-rental focus; not general inference providers for chat

**Security:** No new attack surface. Same `callProvider` path used by all existing providers. Keys in `process.env` only, never logged, never in client bundles.

**Files:** `app/api/ai/route.ts` (PROVIDERS map + AUTO_CHAIN), `.env.example` (three new key stubs).

---

### Block I — Pre-Job Workflow Brief

**Why:** Before a scheduled job fires (or when ORBIT is about to make file edits), showing a 3-step brief — "I will: (1) search CVE feeds, (2) correlate with your watchlist, (3) generate triage report and save to VAULT" — gives the operator a natural review moment. AutoAgent found that understanding *why* something happens is as valuable as knowing *that* it happens. The pre-brief is that understanding applied before execution.

**What to build:**
- `planSteps` field on mission templates (Block G feeds this)
- Pre-run brief display: 2-second dismissible card in HQ chat showing the planned steps before `runAgent()` is called
- Scheduler: log planned workflow steps to activity log before each cron job fires

**Files:** Feeds from `lib/missionTemplates.ts` into `OfficeCommandCenter.tsx`.

---

## 4. What Does Not Work (and Why)

**GitReverse's OpenRouter dependency:** We have `lib/ai.ts` with multi-provider routing. Adding OpenRouter as a 4th provider for one feature fragments the provider surface. The repo-intel LLM call uses the existing Anthropic/local routing.

**ByteRover cloud sync:** Nexus is self-hosted and free. Cloud sync creates a runtime dependency we do not control. Tree structure adopted locally; cloud discarded.

**Running Onyx alongside Nexus:** Different deployment profiles. Onyx needs Redis, PostgreSQL, and background workers. Nexus is a Next.js app. We adopt patterns, not the product.

**Obsidian embedded inside Nexus:** Obsidian is a standalone Electron app. We make VAULT export Obsidian-compatible markdown, which is the highest-value integration with zero coupling.

**Bloomberg IB network replication:** The post says it clearly — "You cannot build 325,000 verified institutional identities on a trusted network. That is the moat." We do not attempt this. We build the 80% that is buildable.

**Fully autonomous AutoAgent loop overnight:** The approval-gated version is what Nexus builds. The `agentHighRiskWritesRequireApproval` setting exists for exactly this reason. Autonomous self-modification without operator review is out of scope and out of character for a free, trustworthy dashboard.

**MARS / YAS equivalents:** Bloomberg's derivatives risk (MARS) and bond relative value (YAS) require counterparty-grade validated models and institutional bond market data. Out of scope for a lightweight dashboard. QuantLib handles the math — the data gap is real and not bridgeable with free sources.

---

## 5. Security Hardening Pass

Applied per block to every new external data path:

| Block | New data paths | Security controls |
|-------|---------------|-------------------|
| A (Lessons tree) | None — client-side only | None needed |
| B (Repo Intel) | GitHub API | Regex validate repo name; 10 req/min rate limit; metadata only; LLM via `/api/ai` |
| C (Reasoning RAG) | LLM call | Via `/api/ai`; max 200 tokens; 10-min session cache |
| D (Deep Research) | web_search + fetch_url | HTTPS only; reject RFC 1918 IPs; 3 sub-queries max |
| E (Voice) | None — browser SpeechSynthesis | Disclose Chrome neural voice routing in settings |
| F (VAULT graph) | None — client-side D3 | Sanitize entity strings with `esc()` before rendering |
| G (Templates) | None — config only | None needed |
| J (Bloomberg free) | FRED API, CBOE, DefiLlama | 5-min server-side cache; try/catch on all; no key logging |
| K (AutoAgent) | Read `agentRunHistory` | Read-only store access; proposals go through PendingEdit flow |
| L (Provider expansion) | Cerebras, NVIDIA, SambaNova APIs | Keys in `process.env` only; same `callProvider` path; try/catch on all calls |

---

## 6. Priority Sequence (Updated)

| Order | Block | Effort | Impact |
|-------|-------|--------|--------|
| 1 | Block A — Hierarchical lessons tree | 1 session | High — 50–70% token savings, smarter retrieval for all 5 agents |
| 2 | Block E — Voice briefings | 0.5 session | High — zero deps, instant UX win, audio briefings for VAULT + HQ |
| 3 | Block K — Agent self-optimization (JANSKY meta-agent + run viewer) | 1 session | High — operationalizes AutoAgent's proven findings, builds operator trust |
| 4 | Block J — Free Bloomberg Layer | 2 sessions | Very high — ALPHA/FLUX becomes a real institutional-grade tool |
| 5 | Block G — Department mission templates | 1 session | High — unlocks 6 department contexts without new agents |
| 6 | Block B — RECON repo intel panel | 1 session | Medium-high — ORBIT + NOVA research quality |
| 7 | Block D — NOVA deep research mode | 2 sessions | High — flagship NOVA capability |
| 8 | Block C — Reasoning RAG upgrade | 1–2 sessions | High — all agents benefit |
| 9 | Block F — VAULT knowledge graph | 2 sessions | High — long-term knowledge compounding |
| 10 | Block I — Pre-job workflow brief | 0.5 session | Medium — operator trust, low complexity |
| ✅ | Block L — Free provider expansion | Done | Medium — more fallback nodes; zero new attack surface |
| 11 | Block M — Agent quality gates + learnings loop | 1 session | High — prevents prompt regression, accumulates cross-session agent knowledge |
| 12 | Block N — Multi-persona engine (Agent Council) | 1 session | High — JANSKY/FLUX/CIPHER run in parallel with different reasoning modes |
| 13 | Block O — Stack-aware context injection | 0.5 session | Medium — agents always know the exact tech context they're operating in |
| 14 | Block P — Context-aware dynamic UI | 2 sessions | High — dashboard adapts to live data, time-of-day, and agent state automatically |
| 15 | Block Q — VAULT knowledge graph v2 (obsidian-mind pattern) | 2 sessions | Very high — VAULT becomes a compounding second brain with semantic linking |
| 16 | Block R — Regression suite + metrics persistence | 1 session | High — prevents silent quality degradation across all 5 agents |

---

### Block M — Agent Quality Gates + Learnings Loop (auto-harness + autoagent)

**Source repos:** `neosigmaai/auto-harness` (40% benchmark improvement via gated self-improvement), `kevinrgu/autoagent` (hill-climbing meta-agent loop).

**What auto-harness does technically:** Three-stage quality gate — regression suite → full benchmark → suite promotion. Only `agent.py` is editable; all other system files are read-only. Metrics recorded as TSV per iteration (score, commit hash, timestamp). `learnings.md` accumulates cross-session patterns so the next iteration starts informed, not cold. Demonstrated 0.56 → 0.78 on Tau benchmark tasks.

**What autoagent adds:** Hill-climbing loop. Meta-agent reads `program.md` directives, edits the harness, re-scores, keeps improvements, discards regressions. Tiebreaker: "simpler is better" prevents over-engineering.

**Nexus adaptation — approval-gated, not autonomous:**
- After each agent dispatch, record a TSV entry: `timestamp | agent_id | query_type | tools_used | duration_ms | outcome` into `tasks/agent-metrics.tsv`
- `tasks/agent-learnings.md` — one section per agent (JANSKY/ORBIT/NOVA/CIPHER/FLUX). JANSKY in meta-agent mode reads the last 10 dispatch records, identifies the top failure pattern, and writes a proposed prompt improvement as a `PendingEdit` — Mario approves before it applies.
- Regression suite: `tasks/agent-suite.json` — list of 10 "must-pass" query/answer pairs. CI runs these against the current agent prompts via `npm run verify:agents`. Gate: if <80% pass, block the merge.
- Quality gate on harness changes: score must match or exceed the baseline before a prompt edit lands.

**What we do NOT do:** Overnight autonomous loops. Every prompt change is human-approved.

**Files:** `tasks/agent-metrics.tsv` (new), `tasks/agent-learnings.md` (new), `tasks/agent-suite.json` (new), `scripts/verify-agents.js` (new), `components/home/office/OfficeCommandCenter.tsx` (meta-agent read path), `tasks/lessons.md` (anti-regression rule).

---

### Block N — Multi-Persona Engine / Agent Council Mode (NVIDIA PersonaPlex)

**Source repo:** `NVIDIA/personaplex` — dual control: text-based role prompt shapes semantic content; voice embedding shapes acoustic properties. 16 pre-computed persona profiles. Key insight: decoupling "who I am" from "how I reason" allows the same agent core to behave differently without duplicating any logic.

**Nexus adaptation — three persona modes per agent:**
- Each agent gets three reasoning mode variants in `prompts.ts`: `formal` (institutional, cited), `direct` (blunt, short, signal-first), `deep` (extended thinking, maximum detail).
- Mode selector in `DispatchBar.tsx` — a small toggle: `F / D / ∞` (formal / direct / deep).
- **Agent Council mode** — single dispatch, three parallel calls: JANSKY-formal + FLUX-direct + CIPHER-deep, all on the same prompt. Responses rendered side-by-side in HQ. User picks or merges.
- Persona composition object in `types.ts`:
  ```typescript
  interface AgentPersona {
    mode: "formal" | "direct" | "deep";
    tone: string;       // "institutional" | "blunt" | "exhaustive"
    maxTokens: number;
    thinkingBudget?: number;  // for deep mode only
    outputStyle: string;      // "bullet" | "prose" | "structured"
  }
  ```
- No new API calls — same `callAI()` / `streamAI()` with enriched system prompt suffix.

**Files:** `components/home/office/types.ts` (AgentPersona type), `components/home/office/prompts.ts` (persona suffix templates), `components/home/office/DispatchBar.tsx` (mode toggle), `components/home/office/OfficeCommandCenter.tsx` (Council mode parallel dispatch).

---

### Block O — Stack-Aware Context Injection (midudev/autoskills)

**Source repo:** `midudev/autoskills` — CLI scans `package.json`, detects tech stack (React, TypeScript, Tailwind, etc.), auto-installs matching skills from a registry. Core pattern: parse deps → pattern-match → inject context.

**Nexus adaptation — always-current tech context for every agent call:**
- `lib/projectContext.ts` (new) — reads `package.json` at cold start, builds a compact tech context string:
  ```
  Stack: Next.js 14 (App Router) | TypeScript strict | React 18 | Zustand | Tailwind
  Patterns: fmtPrice/fmtVol/timeAgo from lib/helpers.ts | callAI/streamAI from lib/ai.ts | useStore(s => s.field) selector pattern
  Constraints: No any casts | tsc --noEmit must pass | try/catch on all fetches
  ```
- This string is appended to `buildLiveContext()` so every agent call includes it — ORBIT never generates raw `fetch()` when it should use `callAI()`, never inlines formatting when `fmtPrice()` exists.
- COMMAND tab card: "Project Stack" — shows current detected stack + key patterns. Refreshes on session start.
- Cost: ~150 tokens per call. Worth it for the reduction in ORBIT corrections.

**Files:** `lib/projectContext.ts` (new), `lib/liveContext.ts` (extend `buildLiveContext`), `components/command/ProjectStackCard.tsx` (new COMMAND card).

---

### Block P — Context-Aware Dynamic UI (custom idea)

**Core concept:** Instead of a static tab layout, dashboard sections adapt based on three signals: live data state (Fear & Greed extremes, CVE spikes, volatility), time-of-day (market hours vs off-hours), and agent state (agents busy → show Parliament Mode).

**Rules engine — declarative schema:**
```typescript
interface UIRule {
  id: string;
  when: (state: NexusState) => boolean;
  then: UIAction;  // float card, expand panel, reorder tabs, show alert
  priority: number;
  ttl?: number;  // auto-dismiss after N ms
}
```

**Concrete rules to implement first (low effort, high value):**
- `fg.value > 80` → float Fear & Greed alert card at top of HQ with red border
- `fg.value < 20` → same but green (extreme greed vs extreme fear)
- `cves.critical > 5` → CYBER tab nav badge + auto-expand CVE panel
- `hour >= 9 && hour < 16 && isWeekday` → market hours mode: ALPHA/FLUX tabs get priority indicator
- `agentBusy >= 2` → show "Parliament Mode" indicator in HQ header (multiple agents thinking)
- Agent produces insight with correlation → ephemeral card auto-created in COMMAND, auto-deletes in 5 min

**Files:** `lib/uiRules.ts` (new — rule engine + rule definitions), `store/useStore.ts` (add `activeUIRules: string[]` slice), `components/home/DynamicAlerts.tsx` (new — renders active rule outputs), `app/home/page.tsx` (mount DynamicAlerts).

---

### Block Q — VAULT Knowledge Graph v2 (obsidian-mind)

**Source repo:** `breferrari/obsidian-mind` — semantic linking architecture: notes link by meaning, not just folder. Every note must have ≥1 inbound link. Backlinks accumulate evidence. Dynamic database views query by frontmatter metadata. 9 specialized subagents (brag-spotter, vault-librarian, cross-linker, etc.). Lifecycle hooks route content to the right folder automatically.

**Nexus adaptation — VAULT becomes a knowledge graph:**
- Every saved item gets a metadata envelope: `{ id, date, category, tags, relevance, linkedItems[] }`
- `lib/vaultGraph.ts` (new) — builds an adjacency list from shared tags + entity mentions. Two items are linked if they share ≥2 tags or mention the same entity (ticker, CVE ID, country).
- VAULT tab renders a lightweight force-directed graph (D3 or simple CSS layout) showing item clusters — click a node to read it.
- **Vault-librarian agent mode** — JANSKY in vault-librarian mode: finds orphaned saves (no inbound links), stale items (>30 days, low relevance), and suggests deletions or tag repairs. Runs on-demand via "Audit VAULT" button.
- **Cross-linker** — after every NOVA research session, auto-link the new report to existing VAULT items that share entities. Surfaces connections the user didn't manually make.
- **Post-dispatch classifier** — after each agent answer, if the answer contains a signal/decision/threat, prompt user: "Save to VAULT?" with pre-filled metadata.
- **Weekly synthesis** — `/weekly` command in COMMAND tab: reads all VAULT items tagged in the last 7 days, groups by theme, produces a 5-bullet synthesis card.

**Combines with Block F** (existing VAULT knowledge graph block) — Block F adds the force-directed graph visualization; Block Q adds the semantic linking engine, vault-librarian agent, and post-dispatch classifier that feeds it.

**Files:** `lib/vaultGraph.ts` (new), `components/vault/VaultGraphView.tsx` (new — force-directed canvas), `components/vault/VaultLibrarianPanel.tsx` (new — audit + suggestions), `store/useStore.ts` (extend `vaultItems` with metadata envelope), `lib/postDispatchClassifier.ts` (new).

---

### Block R — Regression Suite + Metrics Persistence (auto-harness)

**Source repo:** `neosigmaai/auto-harness` gating pipeline. Three-stage gate with TSV metrics log and adaptive regression suite.

**Nexus adaptation:**
- `tasks/agent-suite.json` — 10 canonical query/response pairs, one per agent specialty (FLUX: crypto price analysis, CIPHER: CVE triage, NOVA: research synthesis, ORBIT: code edit, JANSKY: task decomposition). These are "must-pass" scenarios.
- `scripts/verify-agents.js` — runs suite against current prompts via `/api/ai`, scores each response (keyword match + structure check), outputs pass/fail. Integrated into `npm run verify`.
- `tasks/agent-metrics.tsv` — appended after every session: `date | agent | pass_count | fail_count | avg_duration_ms | top_failure_pattern`. Read by JANSKY in meta-agent mode.
- Adaptive suite: after any agent correction (Mario fixes a wrong answer), the corrected Q/A is proposed for addition to `agent-suite.json`. Mario approves. Suite grows its safety net over time.
- COMMAND tab card: "Agent Health" — shows last 7-day pass rate per agent as a sparkline bar.

**What this prevents:** Silent prompt drift. Every time ORBIT's system prompt is edited, the regression suite runs. If ORBIT drops below 80% on its 2 canonical code tasks, the change is flagged before merge.

**Files:** `tasks/agent-suite.json` (new), `scripts/verify-agents.js` (new), `tasks/agent-metrics.tsv` (new), `package.json` (add `verify:agents` to `npm run verify`), `components/command/AgentHealthCard.tsx` (new COMMAND card).

---

### RustDesk patterns — already implemented

The core RustDesk patterns (adaptive fallback chain, codec negotiation, per-provider timeout budgets, exponential circuit breaker) were implemented as part of Block L via `lib/aiProviderHealth.ts` and `app/api/ai/route.ts`. No separate block needed. Remaining enhancement: score-based re-sort of the chain already ships in `scoreSortedChain()`.

---

## 6b. Security additions (Blocks M–R)

| Block | New data paths | Security controls |
|-------|----------------|-------------------|
| M (Learnings loop) | `tasks/agent-metrics.tsv` read by JANSKY | Read-only from agent side; write only from server post-dispatch hook; Mario-approved edits only |
| N (Persona engine) | No new external calls | Same `callAI()` path; persona suffix is a string concat, not a new endpoint |
| O (Stack context) | `package.json` read at cold start | Local file only; never sent to external service; stripped from client bundle |
| P (Dynamic UI) | Store state only | No new fetches; rules evaluate against already-live Zustand state |
| Q (VAULT graph) | Cross-links between saved items | Local only; no external graph service; vault-librarian runs through existing `/api/ai` |
| R (Regression suite) | `tasks/agent-suite.json` + TSV | Suite runs server-side only; no user data in canonical Q/A pairs; TSV never leaves server |

---

## 7. What Nexus Looks Like When This Ships

**FLUX and ALPHA become an 80% Bloomberg Terminal at zero cost.** Rate environment strip. Factor decomposition. Options Greeks. Pre-trade cost estimation. Volatility regime. On-chain TVL. FLUX agent briefs Mario every morning with the same context an institutional macro trader starts with — for free.

**Agents stay coherent across long sessions.** Domain-scoped lessons tree cuts injected tokens by 50–70% and raises retrieval accuracy to match ByteRover's production benchmark. Same-model pairing (all Anthropic) remains enforced. Agent run artifacts are visible and readable by JANSKY for continuous improvement.

**VAULT becomes a second brain.** Force-directed knowledge graph, entity linking, voice readback, Obsidian export. Every saved article and every NOVA research report compounds into a navigable corpus. The graph grows smarter with each session.

**NOVA can do real research.** Multi-step deep research mode produces cited structured reports and saves them to VAULT automatically. The difference between "ask NOVA a question" and "have NOVA research a topic" becomes meaningfully different.

**Six department contexts, five agents, one dashboard.** Mission templates let Nexus serve Engineering, Design, Marketing, Security Ops, Market Intelligence, and Deep Research workflows without adding complexity or new agents.
