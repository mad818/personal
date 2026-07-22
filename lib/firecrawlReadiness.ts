/** Optional BYOK Firecrawl configuration posture for the research toolchain. */

export function resolveFirecrawlApiKey(): string | null {
  const key = process.env.FIRECRAWL_KEY?.trim();
  return key || null;
}

export function isFirecrawlConfigured(): boolean {
  return Boolean(resolveFirecrawlApiKey());
}
