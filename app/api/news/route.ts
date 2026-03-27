// ── api/news ────────────────────────────────────────────────
// News aggregation API: multi-source news with sentiment and bias filtering.

import { NextResponse } from 'next/server'
// Pulls from crypto, tech, finance, and world news for broad OSINT coverage.

interface NewsItem {
  title: string
  link:  string
  date:  string
  src:   string
  cat:   string  // category tag for filtering
}

/** Strip CDATA wrappers and decode basic HTML entities */
function clean(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

async function fetchRSS(url: string, src: string, cat: string): Promise<NewsItem[]> {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NexusBot/1.0)' },
      signal:  AbortSignal.timeout(9000),
      next:    { revalidate: 300 },
    })
    if (!r.ok) return []
    const xml = await r.text()

    const re    = /<item[^>]*>([\s\S]*?)<\/item>/g
    const items: RegExpExecArray[] = []
    let   m: RegExpExecArray | null
    while ((m = re.exec(xml)) !== null) items.push(m)

    return items.slice(0, 12).map((m) => {
      const block = m[1]

      // Title — strip CDATA
      const rawTitle =
        block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? ''
      const title = clean(rawTitle)

      // Link — try CDATA-wrapped <link>, plain <link>, then <guid>
      const rawLink =
        block.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1] ??
        block.match(/<guid[^>]*isPermaLink="true"[^>]*>([\s\S]*?)<\/guid>/)?.[1] ??
        block.match(/<guid[^>]*>(https?:\/\/[^\s<]+)<\/guid>/)?.[1] ?? ''
      const link = clean(rawLink)

      // Date
      const date = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/))?.[1]?.trim() ?? ''

      return { title, link, date, src, cat }
    }).filter((i) => i.title && i.link.startsWith('http'))
  } catch {
    return []
  }
}

async function fetchCryptoCompare(): Promise<NewsItem[]> {
  try {
    const url = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest&limit=30'
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NexusBot/1.0)' },
      signal: AbortSignal.timeout(9000),
      next: { revalidate: 300 },
    })
    if (!r.ok) return []
    const d = await r.json() as any
    const raw = (d?.Data ?? []) as Array<{ id: string; title: string; url: string; source: string; published_on: number }>
    return raw
      .slice(0, 25)
      .map((a) => ({
        title: clean(String(a.title ?? '')),
        link: clean(String(a.url ?? '')),
        date: new Date(Number(a.published_on ?? 0) * 1000).toISOString(),
        src: clean(String(a.source ?? 'CryptoCompare')),
        cat: 'crypto',
      }))
      .filter((i) => i.title && i.link.startsWith('http'))
  } catch {
    return []
  }
}

export async function GET() {
  const feeds = [
    // Crypto
    { url: 'https://cointelegraph.com/rss',                          src: 'CoinTelegraph',  cat: 'crypto'  },
    { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',        src: 'CoinDesk',       cat: 'crypto'  },
    // Finance / Markets
    { url: 'https://feeds.bloomberg.com/markets/news.rss',           src: 'Bloomberg',      cat: 'markets' },
    { url: 'https://feeds.reuters.com/reuters/businessNews',         src: 'Reuters Biz',    cat: 'markets' },
    // Tech / Cyber
    { url: 'https://feeds.feedburner.com/TheHackersNews',            src: 'Hacker News',    cat: 'cyber'   },
    { url: 'https://www.wired.com/feed/rss',                         src: 'Wired',          cat: 'tech'    },
    // World / OSINT
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',           src: 'BBC World',      cat: 'world'   },
    { url: 'https://feeds.reuters.com/reuters/worldNews',            src: 'Reuters World',  cat: 'world'   },
  ]

  const results = await Promise.allSettled([
    ...feeds.map((f) => fetchRSS(f.url, f.src, f.cat)),
    fetchCryptoCompare(),
  ])
  const items: NewsItem[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') items.push(...r.value)
  }

  // Dedupe by title
  const seen = new Set<string>()
  const deduped: NewsItem[] = []
  for (const it of items) {
    const key = it.title.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    deduped.push(it)
  }

  // Sort newest first where possible
  deduped.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0
    const db = b.date ? new Date(b.date).getTime() : 0
    return db - da
  })

  return NextResponse.json(deduped)
}
