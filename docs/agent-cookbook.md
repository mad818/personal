# Agent Cookbook

Five agents, 25 example prompts. Each entry shows what the agent does, which tools it uses, and what kind of output to expect.

---

## How to read this

Each prompt is tested against the agent detection system. The agent is auto-selected when you type — you can also force one with `@ORBIT: your message`.

**Agent detection keywords:**

| Agent | Strong keywords |
|-------|----------------|
| JANSKY | orchestrate, plan, overview, coordinate, what should I |
| ORBIT | code, implement, refactor, build, fix bug, TypeScript |
| NOVA | research, analyze, compare, evidence, source, deep dive |
| CIPHER | threat, CVE, exploit, vulnerability, breach, security |
| FLUX | price, BTC, ETH, market, momentum, buy signal, macro |

---

## JANSKY — Strategic Generalist

JANSKY decomposes problems and coordinates the other agents. Use it for planning, overviews, and cross-domain questions.

**Reasoning style:** decompose → reason each part → synthesise → flag uncertainty

---

**Prompt 1 — Session kick-off:**
> "What should I focus on today based on current market conditions, active CVEs, and the task backlog?"

Expected output: A structured daily brief. Uses `[NEXUS LIVE INTEL]` for market + CVE context, reads `docs/SYSTEM_STATE.md` via `read_project_file`, returns a prioritized 3-5 item plan.

Tools used: `read_project_file`, `recall`

---

**Prompt 2 — Cross-domain synthesis:**
> "How does the current geopolitical risk level affect BTC price action historically?"

Expected output: A structured analysis connecting macro risk to crypto market behavior. Cites live Fear & Greed + world risk score from live context.

Tools used: `web_search`, `fetch_url`

---

**Prompt 3 — Project status:**
> "Give me a summary of what's been built and what's still outstanding in Nexus."

Expected output: A narrative summary of completed vs. pending items from `docs/SYSTEM_STATE.md`. Not a bullet dump — a coherent read.

Tools used: `read_project_file` (todo.md, architecture.md)

---

**Prompt 4 — Decision support:**
> "Should we prioritize the RECON tab improvements or the agent intelligence block first?"

Expected output: A comparison of both options with trade-offs and a recommendation. Reads the improvement plan for context.

Tools used: `read_project_file`

---

**Prompt 5 — Orchestration:**
> "Coordinate a research pass on AI agent frameworks, then write a summary to VAULT."

Expected output: JANSKY delegates research to NOVA mentally, runs `web_search` for agent frameworks, synthesizes results, and writes to a file in `vault/`.

Tools used: `web_search`, `fetch_url`, `write_file`

---

## ORBIT — Codebase Engineering

ORBIT reads before it writes. It plans before it patches. It verifies after every change.

**Reasoning style:** read full context → plan smallest change → check side effects → patch → verify

---

**Prompt 1 — Bug fix:**
> "The MomentumScanner in the ALPHA tab is showing a blank table after a rescan. Fix it."

Expected output: ORBIT reads `components/alpha/MomentumScanner.tsx`, identifies the root cause (likely a stale state or missing null guard), applies a minimal patch, re-reads the file, and confirms the fix.

Tools used: `read_project_file`, `list_project_files`, `patch_project_file`

---

**Prompt 2 — Add a feature:**
> "Add a 'last updated' timestamp to the bottom of the CVE feed panel."

Expected output: ORBIT reads the CVE panel component, adds a `timeAgo()` call using the existing helper, patches the file, verifies the change.

Tools used: `read_project_file`, `patch_project_file`

---

**Prompt 3 — Refactor:**
> "The PriceGrid component has three separate useEffect hooks fetching data. Consolidate them into one."

Expected output: ORBIT reads the file, identifies the three hooks, proposes a merge plan, applies the patch. If the change is large (30+ lines), it proposes the edit for review first.

Tools used: `read_project_file`, `patch_project_file` or `propose_project_edit`

---

**Prompt 4 — Type error:**
> "tsc is throwing a type error in lib/agent.ts on line 142. Fix it."

Expected output: ORBIT reads `lib/agent.ts` around line 142, identifies the type mismatch, applies the minimal fix, re-reads the section to confirm.

Tools used: `read_project_file`, `patch_project_file`

---

**Prompt 5 — New component:**
> "Create a KeywordAlertBadge component that shows a red dot when any alert keyword matches a live article."

Expected output: ORBIT creates the component file, follows existing patterns (Zustand selector, `var(--accent)` colors), writes the file, confirms it compiles.

Tools used: `read_project_file`, `list_project_files`, `create_project_file`

---

## NOVA — Research + Data Gathering

NOVA is a structured researcher. It searches, reads sources, cross-references, and produces cited output.

**Reasoning style:** search → read sources → cross-reference → organise by angle → cite every claim

---

**Prompt 1 — Technology research:**
> "Research the current state of TimesFM and other open-source time-series forecasting models. Which is most suitable for integrating into Nexus?"

Expected output: A structured comparison of 3-5 models with: accuracy benchmarks, license, deployment complexity, and a recommendation. Every claim has a source URL.

Tools used: `web_search`, `fetch_url` (×3-5 sources)

---

**Prompt 2 — News deep dive:**
> "What's actually happening with the SEC's crypto enforcement actions this week? Get primary sources."

Expected output: A factual summary citing 3+ sources. NOVA reads the actual SEC press releases, not just news summaries. Flags any conflicting information across sources.

Tools used: `web_search`, `fetch_url`

---

**Prompt 3 — Competitive analysis:**
> "Compare Nexus Prime's feature set to other self-hosted intelligence dashboards. What are we missing?"

Expected output: A table comparing 3-5 competitors on key dimensions (data sources, agent support, deployment, UI, free tier). Saved to VAULT.

Tools used: `web_search`, `fetch_url`, `write_file`

---

**Prompt 4 — Technical documentation:**
> "Find and summarize the Anthropic prompt caching API docs. What do I need to change in lib/ai.ts to enable it?"

Expected output: A concrete implementation guide with the exact API changes needed. Cites the official docs URL.

Tools used: `web_search`, `fetch_url`

---

**Prompt 5 — Data source evaluation:**
> "Is ACLED (Armed Conflict Location & Event Data) a reliable source for conflict data? What's their methodology?"

Expected output: A credibility assessment covering: who funds ACLED, their data collection method, known biases, academic citations. Ends with a go/no-go recommendation for Nexus.

Tools used: `web_search`, `fetch_url` (×2-3 sources)

---

## CIPHER — Cybersecurity

CIPHER triages threats, analyzes CVEs, and gives prioritized, specific recommendations.

**Reasoning style:** categorise class → ground in live CVEs → prioritise by impact×exploitability → recommend with specifics → verify

---

**Prompt 1 — CVE triage:**
> "Which of today's CVEs should I patch first? I'm running Ubuntu 22.04 with nginx and PostgreSQL 15."

Expected output: A prioritized list of the day's CVEs that match the stack. Each entry includes: CVSS score, exploitability, fix availability, and specific patch command or mitigation.

Tools used: `read_current_tab` (CYBER tab CVE data), `web_search`

---

**Prompt 2 — Threat analysis:**
> "There's a new ransomware family called BlackNova in the OTX feed. What do we know about it?"

Expected output: A structured threat report: IOCs, affected sectors, TTPs (using MITRE ATT&CK), detection signatures, and immediate mitigations.

Tools used: `web_search`, `fetch_url`

---

**Prompt 3 — OSINT lookup:**
> "Run a passive OSINT pass on the domain example-suspicious.com. What can you find without active probing?"

Expected output: Results from WHOIS, crt.sh (certificates), DNS records, HIBP check, and VirusTotal lookup. Organized into a risk assessment.

Tools used: `web_search`, `fetch_url`

---

**Prompt 4 — Security review:**
> "Review the current CSP headers in next.config.js. Are there any weaknesses?"

Expected output: A reading of the current CSP, identification of any overly permissive directives, specific hardening recommendations with examples.

Tools used: `read_project_file`

---

**Prompt 5 — Incident response:**
> "I think my Nexus instance was accessed without authorization last night. What should I check?"

Expected output: A step-by-step incident response checklist: check auth logs, rotate NEXUS_TOKEN, review `/api/status` diagnostics, check for config changes. Includes commands to run.

Tools used: `read_project_file`, `web_search`

---

## FLUX — Markets & Quant

FLUX leads with live numbers and ends with a single actionable signal.

**Reasoning style:** lead with live numbers → decompose market structure → bull/base/bear probability → single actionable signal

---

**Prompt 1 — Market brief:**
> "Give me a morning market brief. What's the macro setup and what does BTC look like technically?"

Expected output: Opens with live prices from `[NEXUS LIVE INTEL]`. Then covers: macro context (Fear & Greed, DXY, rates), BTC technical structure (trend, support, resistance), and a single signal: BULLISH / BEARISH / NEUTRAL with confidence.

Tools used: `web_search` (macro context), live context block

---

**Prompt 2 — Momentum scan:**
> "Which crypto assets on the watchlist have the strongest momentum signals right now?"

Expected output: A ranked table of watchlist assets with: price change, volume, RSI estimate, trend direction, and a buy/neutral/sell label. Explanation of scoring methodology.

Tools used: `web_search`, `fetch_url`, live price context

---

**Prompt 3 — Macro analysis:**
> "How does the current FRED yield curve look and what does it mean for risk assets?"

Expected output: A reading of the yield curve (2y-10y spread) with historical context. Specific implication for crypto and equities. Bull/base/bear scenario probabilities summing to 100%.

Tools used: `web_search`, `fetch_url` (FRED API)

---

**Prompt 4 — Trade thesis:**
> "Build a trade thesis for ETH over the next 30 days. Bullish case, bearish case, invalidation levels."

Expected output: A structured thesis with: current price context from live data, 3 catalysts for each case, specific price levels for invalidation, and a risk-adjusted recommendation.

Tools used: `web_search`, live context block

---

**Prompt 5 — On-chain deep dive:**
> "What does on-chain data say about BTC miner behavior and long-term holder distribution right now?"

Expected output: A reading of on-chain signals (miner outflows, HODL waves, MVRV, exchange net flow) sourced from public APIs. Synthesis into a single market posture assessment.

Tools used: `web_search`, `fetch_url`

---

## Tips for best results

**Be specific about the output format.** "Give me a bullet list of 5 mitigations" gets better results than "give me mitigations."

**Include context when relevant.** "I'm running Ubuntu 22.04 with nginx" helps CIPHER narrow its output. "I'm a short-term trader with 2-week horizon" helps FLUX calibrate signals.

**Use `@AGENTNAME:` to force an agent.** If JANSKY keeps getting picked when you want ORBIT, start your message with `@ORBIT: fix the bug in...`

**Chain prompts.** Ask NOVA to research something, then ask ORBIT to implement based on NOVA's findings. The agents share the same live context so they stay coherent.
