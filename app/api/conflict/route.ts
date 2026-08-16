// ── api/conflict ────────────────────────────────────────────
// Conflict tracker API: GDELT event feed with clustering and density analysis.

import { NextResponse } from "next/server";
import { readBoundedUpstreamText } from "@/lib/liveFeedReliability";
// Parses RSS from BBC World News + Al Jazeera English — no API key needed,
// no CORS issues, far more reliable than GDELT.

export const dynamic = "force-dynamic";

interface ConflictArticle {
  title: string;
  url: string;
  seendate: string;
}

async function parseRSS(feedUrl: string): Promise<ConflictArticle[]> {
  const r = await fetch(feedUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; NexusBot/1.0)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`Conflict feed ${r.status}`);
  const xml = await readBoundedUpstreamText(r);
  if (!/<(?:rss|feed)\b/i.test(xml)) {
    throw new Error("Conflict feed returned an invalid document.");
  }

  // Extract <item> blocks
  const re = /<item[^>]*>([\s\S]*?)<\/item>/g;
  const items: ConflictArticle[] = [];
  let m: RegExpExecArray | null;

  while ((m = re.exec(xml)) !== null) {
    const block = m[1];

    const title =
      (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ??
        block.match(/<title>([\s\S]*?)<\/title>/))?.[1]?.trim() ?? "";

    const url =
      (block.match(/<link>(https?:\/\/[^\s<]+)<\/link>/) ??
        block.match(/<guid[^>]*>(https?:\/\/[^\s<]+)<\/guid>/))?.[1]?.trim() ??
      "";

    const date =
      block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? "";

    if (title && url) items.push({ title, url, seendate: date });
  }

  return items;
}

const CONFLICT_KW = [
  "war",
  "conflict",
  "military",
  "attack",
  "killed",
  "airstrike",
  "strike",
  "missile",
  "bomb",
  "troops",
  "invasion",
  "coup",
  "sanctions",
  "nuclear",
  "hostage",
  "ceasefire",
  "offensive",
  "rebel",
  "insurgent",
  "terrorist",
  "casualties",
  "siege",
  "blockade",
];

function isConflictRelated(title: string): boolean {
  const t = title.toLowerCase();
  return CONFLICT_KW.some((k) => t.includes(k));
}

export async function GET() {
  const FEEDS = [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://www.aljazeera.com/xml/rss/all.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "https://feeds.reuters.com/reuters/worldNews",
  ];

  const results = await Promise.allSettled(FEEDS.map(parseRSS));
  const availableSources = results.filter(
    (result) => result.status === "fulfilled",
  ).length;

  if (availableSources === 0) {
    return NextResponse.json(
      {
        articles: [],
        error: "Conflict news feeds are temporarily unavailable.",
      },
      { status: 502 },
    );
  }

  const seen = new Set<string>();
  const articles: ConflictArticle[] = [];

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const item of r.value) {
      if (!seen.has(item.title) && isConflictRelated(item.title)) {
        seen.add(item.title);
        articles.push(item);
      }
    }
  }

  // If nothing matched the keyword filter, return all world news
  const fallback = articles.length < 5;
  if (fallback) {
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const item of r.value) {
        if (!seen.has(item.title)) {
          seen.add(item.title);
          articles.push(item);
        }
      }
    }
  }

  return NextResponse.json(
    { articles: articles.slice(0, 40) },
    { headers: { "Cache-Control": "public, max-age=1800, s-maxage=1800" } },
  );
}
