const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^::1$/i,
  /^\[::1\]$/i,
  /\.local$/i,
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

function fixedPublicOrigin(hostname: string) {
  switch (hostname.toLowerCase()) {
    case "github.com":
      return new URL("https://github.com");
    case "www.github.com":
      return new URL("https://www.github.com");
    case "news.ycombinator.com":
      return new URL("https://news.ycombinator.com");
    case "www.theguardian.com":
      return new URL("https://www.theguardian.com");
    case "theguardian.com":
      return new URL("https://theguardian.com");
    case "www.reuters.com":
      return new URL("https://www.reuters.com");
    case "reuters.com":
      return new URL("https://reuters.com");
    case "www.bbc.com":
      return new URL("https://www.bbc.com");
    case "bbc.com":
      return new URL("https://bbc.com");
    case "www.cisa.gov":
      return new URL("https://www.cisa.gov");
    case "cisa.gov":
      return new URL("https://cisa.gov");
    case "nvd.nist.gov":
      return new URL("https://nvd.nist.gov");
    case "www.nist.gov":
      return new URL("https://www.nist.gov");
    case "huggingface.co":
      return new URL("https://huggingface.co");
    case "www.sec.gov":
      return new URL("https://www.sec.gov");
    case "sec.gov":
      return new URL("https://sec.gov");
    case "www.aljazeera.com":
      return new URL("https://www.aljazeera.com");
    case "aljazeera.com":
      return new URL("https://aljazeera.com");
    case "gdeltproject.org":
      return new URL("https://gdeltproject.org");
    case "www.gdeltproject.org":
      return new URL("https://www.gdeltproject.org");
    case "www.coingecko.com":
      return new URL("https://www.coingecko.com");
    case "coingecko.com":
      return new URL("https://coingecko.com");
    default:
      throw new Error("Host is not on the external fetch allowlist.");
  }
}

type SafePublicUrlOptions = {
  allowHttp?: boolean;
  allowPrivateHosts?: boolean;
  allowlist?: readonly string[];
  maxLength?: number;
};

export function assertSafePublicUrl(
  rawUrl: string,
  opts: SafePublicUrlOptions = {},
) {
  const normalized = rawUrl.trim();
  if (!normalized) {
    throw new Error("URL is required.");
  }
  if (normalized.length > (opts.maxLength ?? 2048)) {
    throw new Error("URL is too long.");
  }

  let parsed: URL;
  try {
    parsed = new URL(
      /^[a-z][a-z\d+\-.]*:\/\//i.test(normalized)
        ? normalized
        : `https://${normalized}`,
    );
  } catch {
    throw new Error("Invalid URL.");
  }

  const allowHttp = opts.allowHttp ?? false;
  if (
    parsed.protocol !== "https:" &&
    !(allowHttp && parsed.protocol === "http:")
  ) {
    throw new Error(
      allowHttp
        ? "Only http and https URLs are allowed."
        : "Only https URLs are allowed for external fetches.",
    );
  }
  if (parsed.username || parsed.password) {
    throw new Error("Credential-bearing URLs are blocked.");
  }
  if (!(opts.allowPrivateHosts ?? false) && isPrivateHost(parsed.hostname)) {
    throw new Error("Private network targets are blocked.");
  }
  if (parsed.port && !["80", "443"].includes(parsed.port)) {
    throw new Error("Custom ports are blocked.");
  }

  const allowlist = opts.allowlist;
  if (allowlist && !allowlist.includes(parsed.hostname.toLowerCase())) {
    throw new Error("Host is not on the external fetch allowlist.");
  }
  return parsed;
}

export function assertSafeExternalUrl(rawUrl: string) {
  return assertSafePublicUrl(rawUrl, {
    allowHttp: false,
    allowlist: FETCH_URL_ALLOWLIST,
  });
}

export async function fetchSafePublicUrl(
  rawUrl: string,
  init: RequestInit = {},
) {
  const parsed = assertSafeExternalUrl(rawUrl);
  await assertPublicResolvableHost(parsed.hostname);
  const target = fixedPublicOrigin(parsed.hostname);
  target.pathname = parsed.pathname;
  target.search = parsed.search;
  return fetch(target, {
    ...init,
    // Redirects are deliberately exposed to the caller instead of followed;
    // following them would bypass the validated destination boundary.
    redirect: "manual",
  });
}

export async function readResponseTextWithLimit(
  response: Response,
  maxChars = 16000,
) {
  const text = await response.text();
  return text.slice(0, maxChars);
}
import { assertPublicResolvableHost } from "@/lib/security/privateNetwork";
