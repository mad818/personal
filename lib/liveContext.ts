// ── lib/liveContext.ts ─────────────────────────────────────────────────────────
// Builds a real-time intelligence briefing from the dashboard's live store
// state. Injected into every agent system prompt so agents reason from current
// data — not stale training knowledge.
//
// The result looks like this inside the system prompt:
//
//   [NEXUS LIVE INTEL — 2026-03-22T14:30:00Z]
//   MARKET: BTC $84,200 (+1.4%) · ETH $3,100 (-0.2%) · Fear & Greed: 62 GREED
//   WORLD RISK: 34/100 (LOW)
//   CVEs TODAY: 14 (3 CRITICAL: CVE-2026-1234 …)
//   NEWS (47 signals): Fed holds rates · BTC ETF inflows hit record · …
//   [END LIVE INTEL]
//
// Usage:
//   import { buildLiveContext } from '@/lib/liveContext'
//   const liveBlock = buildLiveContext(useStore.getState())
//   const enrichedPrompt = systemPrompt + liveBlock

import type { AgentStats } from '@/store/useStore'

// Minimal shape of the store state that buildLiveContext needs.
// Avoids depending on a non-exported AppState type alias.
interface LiveState {
  prices?:    Record<string, unknown>
  signals?:   { fg?: unknown }
  worldRisk?: number
  cves?:      unknown[]
  articles?:  unknown[]
  agentStats?: Record<string, AgentStats>
}

// Shape of a price entry from S.prices
interface PriceEntry {
  price: number
  chg:   number
  sym?:  string
  mcap?: number
  vol?:  number
}

// Shape of a CVE entry from S.cves
interface CveEntry {
  id:          string
  description?: string
  summary?:    string
  severity?:   string
  cvssScore?:  number
  score?:      number
}

// Shape of an article from S.articles
interface ArticleEntry {
  title:  string
  source?: string
  bias?:  string
}

interface LiveContextBuildOptions {
  maxChars?: number
}

export interface LiveContextReport {
  chars: number
  compacted: boolean
  maxChars: number
  lineCount: number
}

export interface LiveContextBundle {
  context: string
  report: LiveContextReport
}

function compactToBudget(text: string, maxChars: number): LiveContextBundle {
  if (!text) {
    return {
      context: '',
      report: { chars: 0, compacted: false, maxChars, lineCount: 0 },
    }
  }
  if (text.length <= maxChars) {
    return {
      context: text,
      report: { chars: text.length, compacted: false, maxChars, lineCount: text.split('\n').length },
    }
  }
  const clipped = `${text.slice(0, Math.max(0, maxChars - 64)).trimEnd()}\n[CONTEXT COMPACTED TO FIT TOKEN BUDGET]\n`
  return {
    context: clipped,
    report: { chars: clipped.length, compacted: true, maxChars, lineCount: clipped.split('\n').length },
  }
}

export function buildLiveContext(state: LiveState): string {
  const lines: string[] = []
  const ts = new Date().toISOString()

  // ── MARKET DATA ────────────────────────────────────────────────────────────
  const prices = state.prices as Record<string, PriceEntry>
  const fg     = state.signals?.fg as { value: number | string; label: string } | undefined

  const marketParts: string[] = []

  // Top coins — BTC, ETH, SOL, BNB if available
  const watchCoins = ['bitcoin', 'ethereum', 'solana', 'binancecoin']
  for (const id of watchCoins) {
    const p = prices[id]
    if (!p) continue
    const sym  = p.sym ?? id.slice(0, 3).toUpperCase()
    const dir  = p.chg >= 0 ? '+' : ''
    marketParts.push(`${sym} $${p.price < 1 ? p.price.toFixed(4) : p.price.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${dir}${p.chg.toFixed(2)}%)`)
  }

  if (marketParts.length > 0) {
    lines.push(`MARKET: ${marketParts.join(' · ')}`)
  }

  // Fear & Greed
  if (fg) {
    const fgVal   = Number(fg.value)
    const fgLabel = fg.label?.toUpperCase() ?? ''
    const fgColor = fgVal >= 75 ? 'EXTREME GREED' : fgVal >= 55 ? 'GREED' : fgVal >= 45 ? 'NEUTRAL' : fgVal >= 25 ? 'FEAR' : 'EXTREME FEAR'
    lines.push(`SENTIMENT: Fear & Greed ${fgVal} — ${fgLabel || fgColor}`)
  }

  // ── WORLD RISK ─────────────────────────────────────────────────────────────
  const worldRisk = state.worldRisk ?? 0
  if (worldRisk > 0) {
    const riskLabel = worldRisk > 70 ? 'HIGH' : worldRisk > 40 ? 'MEDIUM' : 'LOW'
    lines.push(`WORLD RISK: ${worldRisk}/100 (${riskLabel})`)
  }

  // ── CVEs ───────────────────────────────────────────────────────────────────
  const cves = (state.cves ?? []) as CveEntry[]
  if (cves.length > 0) {
    // Identify high-severity CVEs
    const critical = cves.filter(c => {
      const sev = (c.severity ?? '').toUpperCase()
      const score = c.cvssScore ?? c.score ?? 0
      return sev === 'CRITICAL' || score >= 9.0
    })
    const high = cves.filter(c => {
      const sev = (c.severity ?? '').toUpperCase()
      const score = c.cvssScore ?? c.score ?? 0
      return sev === 'HIGH' || (score >= 7.0 && score < 9.0)
    })

    let cveLine = `CVEs TODAY: ${cves.length} total`
    if (critical.length > 0) cveLine += ` · ${critical.length} CRITICAL`
    if (high.length > 0)     cveLine += ` · ${high.length} HIGH`

    // First 2 critical IDs
    if (critical.length > 0) {
      const ids = critical.slice(0, 2).map(c => c.id).join(', ')
      cveLine += ` (${ids}${critical.length > 2 ? ' …' : ''})`
    }
    lines.push(cveLine)
  }

  // ── NEWS SIGNALS ───────────────────────────────────────────────────────────
  const articles = (state.articles ?? []) as ArticleEntry[]
  if (articles.length > 0) {
    // Show up to 6 headlines
    const headlines = articles
      .slice(0, 6)
      .map(a => a.title)
      .join(' · ')
    lines.push(`NEWS (${articles.length} signals): ${headlines}`)
  }

  // ── ACTIVE AGENT STATS ─────────────────────────────────────────────────────
  const agentStats = state.agentStats ?? {}
  const totalTasks = Object.values(agentStats).reduce<number>((s, a) => s + (a.totalTasks ?? 0), 0)
  if (totalTasks > 0) {
    lines.push(`SESSION: ${totalTasks} tasks completed across ${Object.keys(agentStats).length} agents`)
  }

  // ── CAPABILITIES REMINDER ──────────────────────────────────────────────────
  // Tells the agent what live data it has access to, encouraging grounded answers
  lines.push(`DATA FRESHNESS: Prices/signals pulled ${ts.slice(11, 19)} UTC — treat as current market state`)

  if (lines.length === 0) return ''
  return `\n\n[NEXUS LIVE INTEL — ${ts}]\n${lines.join('\n')}\n[END LIVE INTEL]\n`
}

export function buildLiveContextBundle(state: LiveState, opts: LiveContextBuildOptions = {}): LiveContextBundle {
  const maxChars = Math.max(500, Math.min(12_000, opts.maxChars ?? 3_200))
  const raw = buildLiveContext(state)
  return compactToBudget(raw, maxChars)
}

// ── buildCapabilitiesBlock ─────────────────────────────────────────────────────
// Returns a short block describing what tools, data, and skills this agent has.
// Injected once per session to help the agent self-organise before answering.
export function buildCapabilitiesBlock(agentId: string): string {
  const cap: Record<string, string> = {
    jansky: `You have live access to: market prices, Fear & Greed index, world risk score, CVE feed, and news signals. Use this data to give grounded, current answers — not generalizations. When you answer about markets, cite the live numbers. When you answer about threats, cite the CVE count.`,

    orbit: `You have direct read/write access to the Nexus Prime codebase via file tools. Always read before editing. You also have the live dashboard data — use it to understand what features are active and what data is flowing.`,

    nova: `You are a research engine with web_search and fetch_url. Operate like Perplexity: (1) search for the core question, (2) open the 2-3 most relevant sources, (3) synthesize into a grounded answer with citations. Never answer from memory alone when current data is available. You also see the dashboard's live news feed — cross-reference it.`,

    cipher: `You are a security analyst with CVE data loaded live. Start threat analysis from the current CVE feed — what's critical today, what's trending. Then expand with web_search for exploit details. Ground every recommendation in current exposure, not theoretical risk.`,

    flux: `You are a market analyst with live prices, Fear & Greed, and news signals available right now. Lead every market answer with the actual current numbers. Then layer in macro context via web_search. Never give generic market commentary — you have real data, use it.`,
  }
  const block = cap[agentId] ?? cap.jansky
  return `\n\n[AGENT CAPABILITIES & REASONING STYLE]\n${block}\n[END CAPABILITIES]\n`
}
