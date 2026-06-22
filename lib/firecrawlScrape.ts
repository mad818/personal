/**
 * Optional BYOK Firecrawl scrape — markdown extraction for agent research.
 * Native fetch_url remains the fallback when no key or API failure.
 */

const FIRECRAWL_API = "https://api.firecrawl.dev/v1/scrape";

export function resolveFirecrawlApiKey(): string | null {
  const key = process.env.FIRECRAWL_KEY?.trim();
  return key || null;
}

export function isFirecrawlConfigured(): boolean {
  return Boolean(resolveFirecrawlApiKey());
}

export function buildFirecrawlCapabilityBlock(): string {
  return (
    `\n[FIRECRAWL BYOK — research markdown]\n` +
    `Configure FIRECRAWL_KEY in Settings or .env.local.\n` +
    `When set, fetch_url returns cleaner markdown before native HTML stripping.\n` +
    `Native fetch_url always remains the fallback.\n` +
    `[END FIRECRAWL BYOK]\n`
  );
}

export async function scrapeUrlWithFirecrawl(url: string): Promise<string | null> {
  const apiKey = resolveFirecrawlApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(FIRECRAWL_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      success?: boolean;
      data?: { markdown?: string; metadata?: { title?: string; sourceURL?: string } };
    };

    const markdown = payload.data?.markdown?.trim();
    if (!markdown) return null;

    const title = payload.data?.metadata?.title?.trim();
    const header = title ? `# ${title}\n\n` : "";
    const clipped = markdown.slice(0, 12_000);
    return `[Firecrawl markdown]\n${header}${clipped}`;
  } catch {
    return null;
  }
}
