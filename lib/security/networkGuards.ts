const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^\[::1\]$/i,
];

const FETCH_URL_ALLOWLIST = [
  "github.com",
  "www.github.com",
  "news.ycombinator.com",
  "www.theguardian.com",
  "theguardian.com",
  "www.reuters.com",
  "reuters.com",
  "www.bbc.com",
  "bbc.com",
  "www.cisa.gov",
  "cisa.gov",
  "nvd.nist.gov",
  "www.nist.gov",
  "huggingface.co",
  "www.sec.gov",
  "sec.gov",
  "www.cisa.gov",
  "www.aljazeera.com",
  "aljazeera.com",
  "gdeltproject.org",
  "www.gdeltproject.org",
  "www.coingecko.com",
  "coingecko.com",
];

function isPrivateHost(hostname: string) {
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function allowlistedHost(hostname: string) {
  return FETCH_URL_ALLOWLIST.includes(hostname.toLowerCase());
}

export function assertSafeExternalUrl(rawUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Only https URLs are allowed for external fetches.");
  }
  if (isPrivateHost(parsed.hostname)) {
    throw new Error("Private network targets are blocked.");
  }
  if (!allowlistedHost(parsed.hostname)) {
    throw new Error("Host is not on the external fetch allowlist.");
  }
  return parsed;
}

export async function readResponseTextWithLimit(
  response: Response,
  maxChars = 16000,
) {
  const text = await response.text();
  return text.slice(0, maxChars);
}
