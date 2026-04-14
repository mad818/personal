# Assimilated ecosystem — external repos mapped to Nexus Prime

See also: [`external-links-mapping.md`](./external-links-mapping.md) for the broader link inventory.

We **do not** vendor these codebases. This document **formats ideas** from each project into **what already exists in Nexus**, **what to add later**, and **what stays external tooling**.

## XR1 source set

`XR1 Comprehensive Assimilation` is the current native-assimilation meta-program. It keeps Nexus inside the existing shell while absorbing ideas from the current source set as bounded patterns, not bundled products.

| Source | XR1 lane | Native fit | Assimilate as |
|--------|----------|------------|---------------|
| [DefiLeo post](https://x.com/defileo/status/2042241063612502162) | MR1 | `/hq`, `/alpha`, `/vault` | **Product cue** — trader journaling, thesis review, loss review, and emotion-aware post-trade reflection as decision support only; never broker automation |
| [public-apis](https://github.com/public-apis/public-apis) | MR1, MO1 | `/alpha`, `/recon`, `/cyber` | **Reference shortlist** — free market, macro, and passive OSINT feeds only; no API sprawl, no direct client fetches |
| [ai-engineering-from-scratch](https://github.com/rohitg00/ai-engineering-from-scratch) | MR1, VR1 | `/skills`, `/resources`, `/vehicle` | **Reference-only pattern** — artifact-first learning, reusable prompts, and internal playbook structure; not a course platform or vendored dependency |
| [google-research/timesfm](https://github.com/google-research/timesfm) | MR1 prep, A7b later | `lib/forecasting.ts`, `/alpha` | **Gated forecast companion** — validate deployment shape, eval criteria, and `timesfm_companion` assumptions now; keep execution blocked behind staged proof and decision-lift stability |
| [claude-obsidian](https://github.com/AgriciDaniel/claude-obsidian) | MO1 | `/vault`, `/hq` | **Memory pattern** — compounding local wiki/archive, hotter recent-context handling, stronger intake, citation, and stewardship without adopting an external vault product |
| [D4rk_Intel-OSINT-Investigative-Toolkit](https://github.com/techenthusiast167/D4rk_Intel-OSINT-Investigative-Toolkit) | MO1 | `/recon`, `/cyber`, `/vault` | **Methodology source** — phase-based passive-first case progression, stronger pivot language, and evidence packaging without offensive automation or bundled binaries |
| [PLFM_RADAR](https://github.com/NawfalMotii79/PLFM_RADAR) | VR1 | `/vehicle`, `/vault` | **Internal-lab pattern** — radar processing vocabulary, bring-up documentation, artifact manifests, and future session bundle framing without RF control or flight-critical behavior |

`2B` remains useful only as opportunistic cleanup when those local files are touched during XR1 delivery. It is no longer the standalone active program.

| Repository | Core idea | Nexus mapping | Assimilate as |
|------------|-----------|---------------|---------------|
| [gitreverse](https://github.com/filiksyos/gitreverse) | Compress any GitHub repo into a single AI-actionable prompt via LLM | RECON "Repo Intel" panel + ORBIT `analyze_repo` tool — `/api/repo-intel` route | **New capability** — Block B in `docs/ideas/assimilation-2026-04.md`; metadata only, no code execution, rate-limited |
| [byterover-cli](https://github.com/campfirein/byterover-cli) | Persistent AI memory as domain-scoped context tree; 96.1% LoCoMo accuracy | Upgrade `hooks/useLessons.ts` flat array to `lib/lessonsTree.ts` domain tree | **Architecture pattern** — Block A in assimilation plan; local only, no cloud sync |
| [PageIndex](https://github.com/VectifyAI/PageIndex) | Vectorless reasoning-based RAG; document as ToC tree; 98.7% financial benchmark accuracy | Upgrade `lib/ragRouter.ts` with reasoning fallback when confidence < 0.35; VAULT article indexing | **RAG architecture pattern** — Block C in assimilation plan; no vector DB, routes through existing `/api/ai` |
| [free-coding-models](https://github.com/vava-nessa/free-coding-models) | 174 free LLMs across 23 providers (Cerebras, NVIDIA NIM, SambaNova, Groq, Together, etc.) — full model/endpoint/key registry | Added Cerebras (llama-3.3-70b, ~1750 tok/s), NVIDIA NIM (llama-3.3-70b-instruct), SambaNova (Llama-4-Maverick) to `app/api/ai/route.ts` PROVIDERS + AUTO_CHAIN | **Provider expansion** — Block L in assimilation plan; keys in `CEREBRAS_API_KEY`, `NVIDIA_API_KEY`, `SAMBANOVA_API_KEY` |
| [Product-Manager-Skills](https://github.com/deanpeters/Product-Manager-Skills) | Pedagogic PM skills + command workflows for agents | INTEL strategy panels, agent prompts, `tasks/todo.md` structure | **Reference only** — CC BY-NC-SA; use for *inspiration* when writing specs, not copied text |
| [Coolify](https://github.com/coollabsio/coolify) | Self-hosted PaaS (deploy apps/DBs on your VPS) | Hosting the Next.js app + env secrets off your laptop | **Ops pattern** — [`docs/deployment/coolify.md`](../deployment/coolify.md); no Coolify code in repo |
| [ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template) | Multi-phase site clone via Chrome MCP + worktrees | Not core to an intel dashboard | **Defer** — only relevant if we add a “marketing site clone” experiment |
| [atlas-gic](https://github.com/chrisworsey55/atlas-gic) | Autoresearch loop: keep/revert prompts vs **measurable fitness** (e.g. Sharpe) | `npm run eval:agent-runtime:ci`, `tasks/lessons.md`, handoff discipline | **Pattern** — tie agent changes to **measurable checks** before merge |
| [a-evolve](https://github.com/A-EVO-Lab/a-evolve) | Benchmark-gated agent evolution: mutate prompts, skills, memory, and tools; keep only measured wins | `lib/agent.ts`, `scripts/eval-agent-runtime.js`, HQ approval UX, Vault experiment archive | **Adapted pattern** — approval-gated runtime improver, not autonomous self-modification; stays aligned with free/BYOK product constraints |
| [deep-eye](https://github.com/zakirkun/deep-eye) | AI-assisted vuln scanning / pentest modules | CYBER tab, `/api/*`, CSP, tool risk tiers in `lib/agent.ts` | **Boundary** — we stay **read-only / advisory**; no automated exploitation against arbitrary URLs from Nexus |
| [UncommonRoute](https://github.com/CommonstackAI/UncommonRoute) | Local router: cheap vs strong models by difficulty | Ollama + Claude in `lib/ai.ts`, cost-conscious routing | **Optional local setup** — document pointing Cursor `OPENAI_BASE_URL` at a router when user runs one |
| [awesome-autoresearch](https://github.com/alvinunreal/awesome-autoresearch) | Curated autoresearch & agent-improvement links | Same *spirit* as eval + lessons loop | **Reading list** — link hub; no code |
| [onyx](https://github.com/onyx-dot-app/onyx) | Self-hosted RAG + connectors + chat UI | Overlaps “knowledge + chat”; Nexus is lighter, tab-specific | **Complementary product** — cite if users ask for enterprise RAG; not merged |
| [sentrux](https://github.com/sentrux/sentrux) | Architectural sensor, MCP, quality gates | `npm run verify`, path collisions, CI, Sentrux-style “don’t rot architecture” | **Optional tool** — users may run Sentrux MCP alongside Cursor; we keep **our** gates in npm/CI |
| [factory-cursor-bridge](https://github.com/0xSero/factory-cursor-bridge) | BYOK multi-provider proxy for Cursor (`fx-` models) | Multi-key workflows in `.env.local` | **User-side** — document in Cursor settings; no server change required |
| [karpathy/autoresearch](https://github.com/karpathy/autoresearch) | Tight loop: edit one file → measure → keep/revert | `eval:agent-runtime`, `tasks/lessons.md`, small surgical diffs | **Culture** — one metric, one rollback story; we use **TypeScript/agent eval**, not GPU `train.py` |
| [prompt-master](https://github.com/nidhinjs/prompt-master) | Sharper prompts per tool (memory block, scope) | `lib/liveContext.ts`, `buildSystemPrompt`, CLAUDE.md rules | **Prompt hygiene** — borrow *patterns* (scope, done-when); don’t duplicate the skill |
| [claude-better](https://github.com/krzyzanowskim/claude-better) | Faster Claude CLI (compatibility harness) | Developer ergonomics only | **External** — if published broadly, optional install; **not** a Nexus dependency |
| [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 161 design rules, 67 UI styles, color palettes, typography pairings | Nexus design token system; Settings, HQ HUD, tab headers | **Design pass** — extract rules that apply to existing tokens; run as audit not replacement |
| [superpowers](https://github.com/obra/superpowers) | Design→plan→TDD→review cycle for coding agents | ORBIT agent reasoning loop | **Prompt pattern** — bake phase-based discipline into ORBIT system prompt |
| [everything-claude-code](https://github.com/affaan-m/everything-claude-code) | 28 agent patterns, TDD, security scanning, research-first | ORBIT / NOVA / CIPHER prompts, `tasks/lessons.md` | **Prompt pattern** — extract research-first (NOVA), triage-first (CIPHER), TDD discipline (ORBIT) |
| [get-shit-done](https://github.com/gsd-build/get-shit-done) | Phase-based execution, context-rot prevention, atomic commits | ORBIT task planning, `tasks/todo.md` phase structure | **Pattern** — already aligned; sharpen ORBIT prompt with explicit phase checkpoints |
| [rustdesk](https://github.com/rustdesk/rustdesk) | P2P remote desktop: adaptive fallback chain, codec negotiation, per-connection timeout budgets, exponential circuit breaker | `lib/aiProviderHealth.ts` — score-sorted chain, exponential cooldown steps, per-provider AbortController timeouts | **Already implemented** — Block L shipped these patterns; no separate block needed |
| [autoagent](https://github.com/kevinrgu/autoagent) | Meta-agent hill-climbing loop: edits `agent.py`, re-benchmarks, keeps wins, discards regressions; fixed-boundary constraint enforcement | JANSKY meta-agent mode in `OfficeCommandCenter.tsx`, `tasks/agent-learnings.md`, approval-gated prompt edits | **Agent self-improvement** — Block M; approval-gated (Mario approves before any harness change applies) |
| [autoskills](https://github.com/midudev/autoskills) | CLI scans `package.json`, detects tech stack, auto-installs matching agent skills from registry | `lib/projectContext.ts` — builds compact stack string injected into every `buildLiveContext()` call; COMMAND "Project Stack" card | **Stack-aware context** — Block O; ~150 token overhead, eliminates class of ORBIT corrections |
| [personaplex](https://github.com/NVIDIA/personaplex) | Dual persona control: text role prompt shapes semantics, voice embedding shapes acoustic properties; 16 pre-computed profiles | `AgentPersona` type in `types.ts`; three modes per agent (formal/direct/deep); Agent Council parallel dispatch in `OfficeCommandCenter.tsx` | **Persona engine** — Block N; no new API surface, same `callAI()` path with enriched system prompt suffix |
| [auto-harness](https://github.com/neosigmaai/auto-harness) | 3-stage quality gate + adaptive regression suite + TSV metrics persistence; demonstrated 40% benchmark improvement (0.56→0.78) | `tasks/agent-suite.json`, `scripts/verify-agents.js` in `npm run verify`, `tasks/agent-metrics.tsv`, COMMAND "Agent Health" sparkline card | **Quality gates** — Block R; prevents silent prompt drift across all 5 agents |
| [obsidian-mind](https://github.com/breferrari/obsidian-mind) | Semantic linking knowledge graph: every note has ≥1 inbound link, backlinks accumulate evidence, 9 specialized subagents, lifecycle hooks route content by type, frontmatter metadata queries | `lib/vaultGraph.ts` adjacency list, `VaultGraphView.tsx` force-directed canvas, vault-librarian agent mode, post-dispatch classifier, `/weekly` synthesis in COMMAND | **VAULT knowledge graph v2** — Block Q; combines with Block F; vault-librarian + cross-linker are JANSKY sub-modes |
| Context-aware UI generation (custom) | Rules engine: declarative schema evaluates live data + time-of-day + agent state → floats cards, adds badges, reorders emphasis | `lib/uiRules.ts` rule engine, `DynamicAlerts.tsx`, `activeUIRules` slice in Zustand | **Dynamic UI** — Block P; first rules: F&G extremes, CVE spike badge, market-hours mode, Parliament Mode indicator |
| [LightRAG](https://github.com/hkuds/lightrag) | Graph + vector hybrid RAG; entity/relationship extraction from documents | Agent live context (`lib/liveContext.ts`), `lib/ragRouter.ts` (planned) | **Architecture pattern** — no vector DB needed; use query routing + source validation instead |
| [claude-mem](https://github.com/thedotmack/claude-mem) | Passive semantic memory capture from tool usage across sessions | `/.auto-memory/`, `buildLiveContext()` | **Pattern** — enhance existing memory with auto-capture post-run hook |
| [n8n-mcp](https://github.com/czlonkowski/n8n-mcp) | MCP bridge to 1,396 n8n nodes + 2,709 workflow templates | Agent tool executor (`/api/tools`), scheduler/auto-jobs | **External service** — user self-hosts n8n; document alongside Coolify in `docs/deployment/n8n.md` |
| [n8n-workflows](https://github.com/Zie619/n8n-workflows) | 4,343 production-ready automation workflow templates | Agent automation reference, auto-job templates | **Reference** — template library agents can query when building workflows |
| [GeoDeep](https://github.com/uav4geo/GeoDeep) | AI object detection in GeoTIFFs, no GPU, free | OPS/World map — new AI geospatial detection layer | **New capability** — local Python service + `/api/geo-scan` proxy + Leaflet layer |
| [hackingtool](https://github.com/Z4nzu/hackingtool) | 185+ security tools across 20 categories — full taxonomy: info gathering, forensics, cloud security, active directory, steganography, wireless, post-exploitation | RECON tab — taxonomy drives panel categories; **ideas only**, no tool binaries in Nexus. Specific free-API panels to add: subdomain enum (crt.sh + HackerTarget), email OSINT, username lookup, DNS security (DMARC/SPF/DKIM), metadata extraction | **Taxonomy map** — use as RECON panel blueprint; read-only/advisory boundary maintained |
| [exploitation-course](https://github.com/ashemery/exploitation-course) | Structured exploit methodology: fuzzing → memory corruption → ROP → post-exploitation → reverse engineering. 12-module curriculum with lab VMs | CYBER tab — CVE display enrichment, kill chain stage labeling (Discovery → Exploitation → Post-Exploit), attack surface framing | **Display pattern** — enrich CVE cards with exploit stage context; no automated exploitation |
| [mcporter](https://github.com/steipete/mcporter) | CLI for calling MCP servers directly — OAuth flows, JSONC config, `--raw-strings`, `CallResult.images()`, IDE autocomplete via schema.json | Agent system — agents currently call via `/api/ai`; mcporter pattern informs how agents could invoke external MCP tools with OAuth, structured results, and image outputs | **Architecture pattern** — document in `docs/agents/mcp-tools.md`; implement when agents need external MCP tool calls |
| [geocoding-playground](https://github.com/walkthru-earth/geocoding-playground) | Client-side geocoding via DuckDB-WASM + Overture Maps Parquet; H3 tile overlay on MapLibre GL; 3-tier cache; 10 country-specific address parsers | RECON IP geo + OPS world map — H3 hexagonal overlay pattern for density visualization; client-side geocoding without a backend | **Pattern** — H3 hex overlays for OPS map density; client-side DuckDB pattern for offline data queries |
| [TrafficLab-3D](https://github.com/duy-phamduc68/TrafficLab-3D) | Dual-panel 3D: CCTV bounding boxes + satellite floor-boxes via homography projection; YOLO tracking; speed/orientation/trajectory metrics | OPS tab — dual-panel map pattern (3D HQ view + satellite); trajectory/movement visualization concepts for flight/ship layers | **Visual pattern** — dual synchronized view concept for OPS map (3D globe + flat satellite); trajectory lines on live layers |
| [homelable](https://github.com/Pouzor/homelable) | Self-hosted network topology canvas; nmap device discovery; health monitoring (ping/http/https/tcp/ssh/prometheus); MCP server for AI clients; Docker + Proxmox LXC | COMMAND tab — network health monitoring panel; OPS tab — internal device topology layer; Deployment docs (Coolify + homelable alongside) | **New capability** — COMMAND network health panel using ping/http checks; document alongside `docs/deployment/coolify.md` |
| [G0DM0D3](https://github.com/elder-plinius/G0DM0D3) | Red-team prompt research: boundary inversion, l33tspeak/braille/morse obfuscation, 33 trigger-word tiers, AutoTune context-adaptive routing, ULTRAPLINIAN 51-model eval | Agent hardening — informs CIPHER + JANSKY prompt boundaries; obfuscation patterns to detect in incoming user content; adaptive routing mirrors `lib/ai.ts` provider selection | **Security reference** — use adversarially to stress-test agent instruction hierarchy; do not implement jailbreak patterns |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | Curated Claude Code skills, hooks, orchestration patterns | Discovery resource | **Reference only** — like awesome-autoresearch; link, don't merge |
| [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) | Obsidian vault integration for AI agents | Agent memory if user runs Obsidian | **External** — lower priority; only relevant if Mario uses Obsidian |
| [agent-infra/sandbox](https://github.com/agent-infra/sandbox) | Containerized browser + terminal + files + Jupyter in one Docker image | ORBIT safe code execution environment | **Ops pattern** — document alongside Docker/Coolify; not bundled |
| [create-context-graph](https://github.com/neo4j-labs/create-context-graph) | Knowledge graph with entity/relationship extraction | Concept feeds Phase 1A (RAG router) — Neo4j not required | **Concept only** — entity extraction pattern; no Neo4j dependency |
| [twenty](https://github.com/twentyhq/twenty) | Open-source CRM | Not relevant to intelligence dashboard | **Skip** — wrong use case |

---

## Principles (how this repo uses the list)

1. **Nexus stays one app** — intelligence dashboard + local agent; we don’t bundle a second chat server (Onyx) or a full pentest suite (Deep Eye) inside the same deployable.
2. **Measure before merge** — autoresearch / ATLAS / Sentrux all say: **feedback loop + revert**. Aligns with: `verify`, `handoff:check`, agent runtime eval.
3. **Respect licenses** — PM Skills is **non-commercial share-alike**; we **link**, we don’t paste skill bodies.
4. **Self-hosting story** — Coolify is documented under [`docs/deployment/`](../deployment/README.md); Onyx remains a **complementary** product (link in table above).

---

## Concrete Nexus surfaces (already aligned)

| External concept | Where it lives in Nexus |
|------------------|-------------------------|
| RSS + fallback + GDELT | `app/api/news/route.ts`, `hooks/useArticles.ts` |
| Tool risk / approvals | `lib/agent.ts`, `app/api/tools/*` |
| Agent quality gate | `npm run eval:agent-runtime:ci`, `.github/workflows/quality-gates.yml` |
| Handoff + continuity | `docs/AGENT_HANDOFF.md` (+ tool aliases), `npm run handoff:sync`, `tasks/todo.md` |
| PWA / install | `public/manifest.json`, `public/icon.svg`, `app/layout.tsx` |

---

## RECON tab expansion roadmap (from hackingtool taxonomy)

RECON is the primary assimilation surface for the hackingtool taxonomy. All panels use free public APIs — no tool binaries, no scanning of third-party hosts without user intent.

| Panel | Free API | Status |
|-------|----------|--------|
| RDAP / WHOIS | rdap.org | ✅ Live |
| DNS Records (A/MX/NS/TXT) | dns.google | ✅ Live |
| TLS Certs | crt.sh | ✅ Live |
| IP Geolocation | ipapi.co | ✅ Live |
| Have I Been Pwned | haveibeenpwned.com v3 | ✅ Live (BYOK) |
| VirusTotal | virustotal.com v3 | ✅ Live (BYOK) |
| Shodan | shodan.io | ✅ Live (BYOK) |
| Subdomain Enumeration | hackertarget.com (free tier) + crt.sh | ✅ Live |
| Email Reputation | emailrep.io (free tier) | ✅ Live |
| Username OSINT | GitHub API + Gravatar (free) | ✅ Live |
| DNS Security (DMARC/SPF/DKIM) | dns.google TXT lookups | ✅ Live |
| HTTP Headers / Security Audit | headers-api via serverless proxy | ✅ Live |
| Metadata Extraction | client-side EXIF (no upload needed) | ✅ Live |
| Passive DNS / Historical Records | CIRCL pDNS (free) + HackerTarget reverse IP | ✅ Live |
| OPS Map Hex Density Overlay | client-side grid bins → Leaflet hex polygons | ✅ Live |

---

## Security boundary (CYBER)

Nexus **read-only / advisory** tooling only. Do **not** wire automated exploitation or unauthenticated scanning of third-party hosts into the app. For authorized testing methodology, see OWASP and your org’s rules — not in-repo Deep Eye–style scanners.

---

## Quick links

- [Product-Manager-Skills](https://github.com/deanpeters/Product-Manager-Skills) · [Coolify](https://github.com/coollabsio/coolify) · [ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template) · [atlas-gic](https://github.com/chrisworsey55/atlas-gic) · [deep-eye](https://github.com/zakirkun/deep-eye) · [UncommonRoute](https://github.com/CommonstackAI/UncommonRoute) · [awesome-autoresearch](https://github.com/alvinunreal/awesome-autoresearch) · [onyx](https://github.com/onyx-dot-app/onyx) · [sentrux](https://github.com/sentrux/sentrux) · [factory-cursor-bridge](https://github.com/0xSero/factory-cursor-bridge) · [karpathy/autoresearch](https://github.com/karpathy/autoresearch) · [prompt-master](https://github.com/nidhinjs/prompt-master) · [claude-better](https://github.com/krzyzanowskim/claude-better)
