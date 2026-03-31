// ── api/news ────────────────────────────────────────────────
// News aggregation API: multi-source news with sentiment and bias filtering.

import { NextResponse } from "next/server";
// Pulls from crypto, tech, finance, and world news for broad OSINT coverage.

interface NewsItem {
  title: string;
  link: string;
  date: string;
  src: string;
  cat: string; // category tag for filtering
}

/** Strip CDATA wrappers and decode basic HTML entities */
function clean(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function fetchRSS(
  url: string,
  src: string,
  cat: string,
): Promise<NewsItem[]> {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NexusBot/1.0)" },
      signal: AbortSignal.timeout(9000),
      next: { revalidate: 300 },
    });
    if (!r.ok) return [];
    const xml = await r.text();

    const re = /<item[^>]*>([\s\S]*?)<\/item>/g;
    const items: RegExpExecArray[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) items.push(m);

    return items
      .slice(0, 12)
      .map((m) => {
        const block = m[1];

        // Title — strip CDATA
        const rawTitle =
          block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? "";
        const title = clean(rawTitle);

        // Link — try CDATA-wrapped <link>, plain <link>, then <guid>
        const rawLink =
          block.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1] ??
          block.match(
            /<guid[^>]*isPermaLink="true"[^>]*>([\s\S]*?)<\/guid>/,
          )?.[1] ??
          block.match(/<guid[^>]*>(https?:\/\/[^\s<]+)<\/guid>/)?.[1] ??
          "";
        const link = clean(rawLink);

        // Date
        const date =
          block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? "";

        return { title, link, date, src, cat };
      })
      .filter((i) => i.title && i.link.startsWith("http"));
  } catch {
    return [];
  }
}

/** Fetch a single GDELT query. Returns items silently on failure. */
async function fetchSingleGDELT(q: string, cat: string): Promise<NewsItem[]> {
  try {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&timespan=24H&maxrecords=10&format=json`;
    const r = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; NexusBot/1.0)",
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 300 },
    });
    if (!r.ok) return [];
    const d = (await r.json()) as {
      articles?: Array<{ title?: string; url?: string; seendate?: string }>;
    };
    const items: NewsItem[] = [];
    for (const a of d?.articles ?? []) {
      const title = clean(String(a.title ?? ""));
      const link = clean(String(a.url ?? ""));
      const date = String(a.seendate ?? "").trim();
      if (title && link.startsWith("http")) {
        items.push({ title, link, date, src: "GDELT", cat });
      }
    }
    return items;
  } catch {
    return [];
  }
}

/** GDELT artlist — free, no key; fills gaps when RSS feeds block or return empty.
 *  Runs all 4 category queries in parallel instead of sequentially. */
async function fetchGDELTFallback(): Promise<NewsItem[]> {
  const queries: { q: string; cat: string }[] = [
    { q: "bitcoin OR ethereum OR cryptocurrency OR blockchain", cat: "crypto" },
    {
      q: "ransomware OR cybersecurity OR vulnerability OR data breach",
      cat: "cyber",
    },
    {
      q: '"stock market" OR earnings OR "federal reserve" OR inflation',
      cat: "markets",
    },
    {
      q: "diplomacy OR geopolitics OR united nations OR sanctions",
      cat: "world",
    },
  ];
  const results = await Promise.allSettled(
    queries.map(({ q, cat }) => fetchSingleGDELT(q, cat)),
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

async function fetchCryptoCompare(): Promise<NewsItem[]> {
  try {
    const url =
      "https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest&limit=30";
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NexusBot/1.0)" },
      signal: AbortSignal.timeout(9000),
      next: { revalidate: 300 },
    });
    if (!r.ok) return [];
    const d = (await r.json()) as any;
    const raw = (d?.Data ?? []) as Array<{
      id: string;
      title: string;
      url: string;
      source: string;
      published_on: number;
    }>;
    return raw
      .slice(0, 25)
      .map((a) => ({
        title: clean(String(a.title ?? "")),
        link: clean(String(a.url ?? "")),
        date: new Date(Number(a.published_on ?? 0) * 1000).toISOString(),
        src: clean(String(a.source ?? "CryptoCompare")),
        cat: "crypto",
      }))
      .filter((i) => i.title && i.link.startsWith("http"));
  } catch {
    return [];
  }
}

export async function GET() {
  const feeds = [
    // Crypto
    {
      url: "https://cointelegraph.com/rss",
      src: "CoinTelegraph",
      cat: "crypto",
    },
    {
      url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
      src: "CoinDesk",
      cat: "crypto",
    },
    // Finance / Markets (some endpoints block server-side; backups below)
    {
      url: "https://feeds.bloomberg.com/markets/news.rss",
      src: "Bloomberg",
      cat: "markets",
    },
    {
      url: "https://feeds.reuters.com/reuters/businessNews",
      src: "Reuters Biz",
      cat: "markets",
    },
    {
      url: "https://feeds.marketwatch.com/marketwatch/topstories/",
      src: "MarketWatch",
      cat: "markets",
    },
    {
      url: "https://feeds.arstechnica.com/arstechnica/business",
      src: "Ars Business",
      cat: "markets",
    },
    // Tech / Cyber
    {
      url: "https://feeds.feedburner.com/TheHackersNews",
      src: "The Hacker News",
      cat: "cyber",
    },
    {
      url: "https://www.bleepingcomputer.com/feed/",
      src: "BleepingComputer",
      cat: "cyber",
    },
    { url: "https://www.wired.com/feed/rss", src: "Wired", cat: "tech" },
    { url: "https://techcrunch.com/feed/", src: "TechCrunch", cat: "tech" },
    {
      url: "https://www.theregister.com/headlines.rss",
      src: "The Register",
      cat: "tech",
    },
    // World / OSINT (free, usually server-friendly)
    {
      url: "https://feeds.bbci.co.uk/news/world/rss.xml",
      src: "BBC World",
      cat: "world",
    },
    {
      url: "https://feeds.reuters.com/reuters/worldNews",
      src: "Reuters World",
      cat: "world",
    },
    {
      url: "https://www.aljazeera.com/xml/rss/all.xml",
      src: "Al Jazeera",
      cat: "world",
    },
    { url: "https://rss.npr.org/1001/rss.xml", src: "NPR News", cat: "world" },
    { url: "https://news.un.org/feed/rss/en", src: "UN News", cat: "world" },
    {
      url: "https://rss.dw.com/rdf/rss-en-world",
      src: "DW World",
      cat: "world",
    },
  ];

  const results = await Promise.allSettled([
    ...feeds.map((f) => fetchRSS(f.url, f.src, f.cat)),
    fetchCryptoCompare(),
  ]);
  const items: NewsItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") items.push(...r.value);
  }

  // Dedupe by title
  const seen = new Set<string>();
  const deduped: NewsItem[] = [];
  for (const it of items) {
    const key = it.title.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(it);
  }

  // If RSS/crypto APIs are thin or blocked, merge GDELT (no API key)
  if (deduped.length < 25) {
    const gdelt = await fetchGDELTFallback();
    for (const it of gdelt) {
      const key = it.title.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(it);
    }
  }

  // Sort newest first where possible
  deduped.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  return NextResponse.json(deduped);
}
