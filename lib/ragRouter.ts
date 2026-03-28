// ── lib/ragRouter.ts ──────────────────────────────────────────────────────────
// Agentic RAG routing — maps a query to the most relevant data sources and
// the agent best suited to answer it. Inspired by the LightRAG pattern:
// route first, validate source freshness, then retrieve. No vector DB needed —
// Nexus uses live data feeds and project files as its knowledge base.
//
// Usage:
//   const route = routeQuery(userMessage)
//   // Inject route.sourcesBlock into the agent system prompt if needed.
//   // Use route.agent to confirm or override detectAgent() when ambiguous.

import type { AgentId } from '@/components/home/office/types'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface QueryRoute {
  /** Recommended agent for this query. */
  agent: AgentId
  /** Human-readable list of data sources this query should draw from. */
  sources: string[]
  /** Validation notes — e.g. freshness warnings. */
  notes: string[]
  /** Pre-built block to inject into the system prompt. */
  sourcesBlock: string
}

// ── Source definitions ─────────────────────────────────────────────────────────
// Each source declares its domain keywords, the agent that owns it,
// and how fresh the data is expected to be.

const SOURCE_MAP: {
  id: string
  label: string
  agent: AgentId
  freshness: string
  keywords: string[]
}[] = [
  {
    id:        'prices',
    label:     'Live crypto prices (CoinGecko) + Fear & Greed index',
    agent:     'flux',
    freshness: 'real-time (30s polling)',
    keywords:  ['price','btc','eth','sol','bnb','bitcoin','ethereum','crypto','market','chart',
                 'bull','bear','fear','greed','momentum','alpha','trade','portfolio','signal'],
  },
  {
    id:        'cves',
    label:     'Live CVE feed (NVD) + OTX threat intel + CISA advisories',
    agent:     'cipher',
    freshness: 'refreshed hourly',
    keywords:  ['cve','vulnerability','exploit','threat','security','cyber','hack','breach',
                 'malware','attack','osint','patch','advisory','cisa','nvd','otx'],
  },
  {
    id:        'news',
    label:     'Live news (RSS + CryptoCompare + GDELT fallback)',
    agent:     'nova',
    freshness: 'refreshed every 5 minutes',
    keywords:  ['news','headline','latest','today','current','article','report','event',
                 'geopolit','conflict','election','sanction','gdelt','guardian'],
  },
  {
    id:        'world',
    label:     'World risk score + conflict tracker + FX + commodities',
    agent:     'jansky',
    freshness: 'refreshed on OPS tab open',
    keywords:  ['world','risk','conflict','war','geopolit','country','region','ops','fx',
                 'commodit','macro','fed','rate','inflation','dollar','gold','oil'],
  },
  {
    id:        'codebase',
    label:     'Nexus Prime codebase (project files via /api/project)',
    agent:     'orbit',
    freshness: 'live — reads from disk on each call',
    keywords:  ['code','file','implement','build','fix','debug','component','function',
                 'typescript','react','next','zustand','store','api','route','lib','hook',
                 'refactor','bug','error','edit','change','patch','create','write'],
  },
  {
    id:        'polymarket',
    label:     'Polymarket prediction markets (Gamma API)',
    agent:     'flux',
    freshness: 'refreshed on INTEL tab open',
    keywords:  ['polymarket','prediction','odds','probability','market','election','bet',
                 'forecast','gamma','event'],
  },
  {
    id:        'memory',
    label:     'Agent session memory (agent-notes.md via recall tool)',
    agent:     'jansky',
    freshness: 'persisted — grows across sessions',
    keywords:  ['remember','recall','previous','last time','history','session','note',
                 'context','what did','before','past'],
  },
]

// ── routeQuery ────────────────────────────────────────────────────────────────
// Scores each source against the query and returns the top matches.
// Returns the recommended agent + a formatted sources block for prompt injection.
export function routeQuery(query: string): QueryRoute {
  const lower = query.toLowerCase()

  // Score each source by keyword hits
  const scored = SOURCE_MAP.map((src) => ({
    ...src,
    score: src.keywords.filter((k) => lower.includes(k)).length,
  }))

  const matched = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)

  // Primary agent = top-scoring source's owner; fall back to jansky
  const primaryAgent: AgentId = matched[0]?.agent ?? 'jansky'
  const topSources = matched.slice(0, 3)

  const sources = topSources.map((s) => `${s.label} [${s.freshness}]`)
  const notes: string[] = []

  // Freshness warning for memory source
  if (topSources.some((s) => s.id === 'memory')) {
    notes.push('Memory may contain stale entries — validate against live data before citing.')
  }

  // Multi-domain query: flag that multiple agents could contribute
  const agentSet = new Set(topSources.map((s) => s.agent))
  if (agentSet.size > 1) {
    const others = Array.from(agentSet).filter(a => a !== primaryAgent).join(', ')
    notes.push(`Multi-domain query. Primary: ${primaryAgent}. Also relevant: ${others}.`)
  }

  const sourcesBlock = buildSourcesBlock(sources, notes)

  return { agent: primaryAgent, sources, notes, sourcesBlock }
}

// ── buildSourcesBlock ─────────────────────────────────────────────────────────
// Returns a formatted string to inject into the system prompt.
// Tells the agent exactly which sources it should draw from for this query.
export function buildSourcesBlock(sources: string[], notes: string[]): string {
  if (!sources.length) return ''

  const lines = [
    '\n\n[DATA SOURCES FOR THIS QUERY]',
    'Draw from these sources. Validate freshness before citing.',
    ...sources.map((s) => `  • ${s}`),
    ...(notes.length ? ['', 'Notes:', ...notes.map((n) => `  ⚠ ${n}`)] : []),
    'Do not cite sources not listed here without explicitly noting they are supplemental.',
    '[/DATA SOURCES]',
  ]

  return lines.join('\n')
}

// ── buildGlobalSourcesBlock ───────────────────────────────────────────────────
// Per-agent static block that lists ALL sources available to that agent.
// Injected into the base system prompt so agents always know what they can access.
export function buildGlobalSourcesBlock(agent: AgentId): string {
  const agentSources = SOURCE_MAP.filter((s) => s.agent === agent || s.agent === 'jansky')
  if (!agentSources.length) return ''

  const lines = [
    '\n\n[AVAILABLE DATA SOURCES]',
    ...agentSources.map((s) => `  • ${s.label} [${s.freshness}]`),
    'Use the most relevant source for each claim. Validate freshness before citing.',
    '[/AVAILABLE DATA SOURCES]',
  ]

  return lines.join('\n')
}
