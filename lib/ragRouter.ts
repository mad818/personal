// ── lib/ragRouter.ts ──────────────────────────────────────────────────────────
// Keyword-first RAG router for Nexus Prime agent queries.
//
// Pattern: keyword domain match → assign tool strategy → add source credibility tag
//
// Inspired by advaitpaliwal's context-routing approach: route to the best data
// source first, fall back to web search, always tag credibility.
//
// Usage (in OfficeCommandCenter send flow):
//   import { routeQuery, buildRagContextBlock } from '@/lib/ragRouter'
//   const block = buildRagContextBlock(userMessage)
//   // inject block into agent system prompt

export type SourceCredibility = 'HIGH' | 'MEDIUM' | 'LOW' | 'STALE'

export interface RagStrategy {
  domain:        string
  primaryTools:  string[]
  fallbackTools: string[]
  credibility:   SourceCredibility
  rationale:     string
}

// ── Routing table ─────────────────────────────────────────────────────────────
const ROUTING_RULES: { keywords: string[]; strategy: RagStrategy }[] = [
  {
    keywords: ['bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'crypto', 'price',
               'market cap', 'mempool', 'defi', 'yield', 'fear greed', 'fear & greed'],
    strategy: {
      domain:        'Markets / Crypto',
      primaryTools:  ['web_search'],
      fallbackTools: ['fetch_url'],
      credibility:   'HIGH',
      rationale:     'Market queries: use web_search for live data. Cross-reference the NEXUS LIVE INTEL market block.',
    },
  },
  {
    keywords: ['cve', 'exploit', 'vulnerability', 'zero-day', 'zero day', 'patch',
               'ransomware', 'malware', 'threat actor', 'apt', 'cvss', 'nvd', 'otx'],
    strategy: {
      domain:        'Cybersecurity / CVE',
      primaryTools:  ['web_search'],
      fallbackTools: ['fetch_url'],
      credibility:   'HIGH',
      rationale:     'Security queries: cross-reference the live CVE feed in NEXUS LIVE INTEL, then web_search for exploit details.',
    },
  },
  {
    keywords: ['paper', 'arxiv', 'research', 'llm', 'transformer', 'diffusion',
               'huggingface', 'model', 'benchmark', 'dataset', 'training'],
    strategy: {
      domain:        'AI / ML Research',
      primaryTools:  ['hf_papers_search'],
      fallbackTools: ['web_search'],
      credibility:   'HIGH',
      rationale:     'Research queries: start with hf_papers_search for today\'s HuggingFace daily papers.',
    },
  },
  {
    keywords: ['sec', 'filing', 'edgar', '10-k', '10-q', '8-k', 'earnings',
               'annual report', 'quarterly report'],
    strategy: {
      domain:        'SEC Filings / EDGAR',
      primaryTools:  ['sec_edgar_search'],
      fallbackTools: ['web_search'],
      credibility:   'HIGH',
      rationale:     'Filing queries: sec_edgar_search hits the SEC full-text index. Source credibility [HIGH].',
    },
  },
  {
    keywords: ['weather', 'temperature', 'forecast', 'rain', 'wind', 'storm',
               'hurricane', 'earthquake', 'seismic'],
    strategy: {
      domain:        'Weather / Geophysical',
      primaryTools:  ['open_meteo_weather'],
      fallbackTools: ['web_search'],
      credibility:   'HIGH',
      rationale:     'Weather queries: open_meteo_weather for current + 3-day forecast. No API key required.',
    },
  },
  {
    keywords: ['reddit', 'community', 'sentiment', 'forum', 'discussion',
               'opinion', 'trending', 'subreddit'],
    strategy: {
      domain:        'Social Sentiment / Reddit',
      primaryTools:  ['reddit_search'],
      fallbackTools: ['web_search'],
      credibility:   'MEDIUM',
      rationale:     'Social sentiment: reddit_search for community discussion. Credibility [MEDIUM] — anecdotal.',
    },
  },
  {
    keywords: ['github', 'repo', 'repository', 'open source', 'stars', 'fork',
               'trending', 'library', 'package', 'npm', 'pypi'],
    strategy: {
      domain:        'GitHub / Open Source',
      primaryTools:  ['github_trending'],
      fallbackTools: ['web_search'],
      credibility:   'HIGH',
      rationale:     'GitHub queries: github_trending for today\'s trending repos. Fall back to web_search for specific repos.',
    },
  },
  {
    keywords: ['rss', 'feed', 'blog', 'newsletter', 'substack', 'medium', 'article'],
    strategy: {
      domain:        'RSS / Blog Feed',
      primaryTools:  ['rss_fetch'],
      fallbackTools: ['fetch_url', 'web_search'],
      credibility:   'MEDIUM',
      rationale:     'RSS queries: rss_fetch parses the feed directly. Credibility depends on source.',
    },
  },
  {
    keywords: ['code', 'codebase', 'file', 'component', 'function', 'bug', 'error',
               'typescript', 'react', 'next.js', 'route', 'store', 'hook'],
    strategy: {
      domain:        'Project Codebase',
      primaryTools:  ['list_project_files', 'read_project_file'],
      fallbackTools: ['web_search'],
      credibility:   'HIGH',
      rationale:     'Codebase queries: read the actual file before answering. Never answer from memory alone.',
    },
  },
]

const DEFAULT_STRATEGY: RagStrategy = {
  domain:        'General',
  primaryTools:  ['web_search'],
  fallbackTools: ['fetch_url'],
  credibility:   'MEDIUM',
  rationale:     'No specific domain detected — use web_search. Cite sources. Tag credibility per source.',
}

export function routeQuery(query: string): RagStrategy {
  if (!query?.trim()) return DEFAULT_STRATEGY
  const q = query.toLowerCase()
  for (const rule of ROUTING_RULES) {
    if (rule.keywords.some((kw) => q.includes(kw))) return rule.strategy
  }
  return DEFAULT_STRATEGY
}

export function buildRagContextBlock(query: string): string {
  const s = routeQuery(query)
  const wordCount = query.trim().split(/\s+/).length

  // Short queries (< 8 words) get a compact one-liner hint to save tokens.
  // Complex queries get the full block with rationale so agents can reason about sources.
  if (wordCount < 8) {
    return `\n[RAG: ${s.domain} — use ${s.primaryTools[0]}. Credibility: ${s.credibility}]\n`
  }

  return (
    `\n\n[RAG ROUTING — ${s.domain}]\n` +
    `Primary tools: ${s.primaryTools.join(', ')}\n` +
    `Fallback tools: ${s.fallbackTools.join(', ')}\n` +
    `Source credibility expectation: [${s.credibility}]\n` +
    `Rationale: ${s.rationale}\n` +
    `[END RAG ROUTING]\n`
  )
}
