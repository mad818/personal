export const CONTENT_SECURITY_POLICY_HEADER = "Content-Security-Policy";
export const CONTENT_SECURITY_POLICY_NONCE_HEADER = "x-nonce";

const CONTENT_SECURITY_POLICY_NONCE_BYTES = 16;
const CONTENT_SECURITY_POLICY_NONCE_PATTERN = /^[A-Za-z0-9+/_-]{22,128}={0,2}$/;

export interface ContentSecurityPolicyOptions {
  development: boolean;
  devPort?: string;
}

function normalizeDevelopmentPort(candidate?: string) {
  if (!candidate || !/^\d{1,5}$/.test(candidate)) return "3000";
  const port = Number.parseInt(candidate, 10);
  return port >= 1 && port <= 65_535 ? String(port) : "3000";
}

export function createContentSecurityPolicyNonce() {
  const bytes = new Uint8Array(CONTENT_SECURITY_POLICY_NONCE_BYTES);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function assertContentSecurityPolicyNonce(nonce: string) {
  if (!CONTENT_SECURITY_POLICY_NONCE_PATTERN.test(nonce)) {
    throw new Error("Invalid Content Security Policy nonce.");
  }
}

export function buildContentSecurityPolicy(
  nonce: string,
  options: ContentSecurityPolicyOptions,
) {
  assertContentSecurityPolicyNonce(nonce);

  const scriptSrc = [
    "script-src 'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
  ];
  const styleSrc = [
    "style-src 'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
  ];
  const connectSrc = [
    "connect-src 'self'",
    "https://api.coingecko.com",
    "https://services.nvd.nist.gov",
    "https://api.alternative.me",
    "https://mempool.space",
    "https://dns.google",
    "https://rdap.org",
    "https://crt.sh",
    "https://ipapi.co",
    "https://api.hackertarget.com",
    "https://www.circl.lu",
    "https://emailrep.io",
    "https://api.github.com",
    "https://www.gravatar.com",
    "https://check.torproject.org",
    "https://haveibeenpwned.com",
    "https://www.virustotal.com",
    "https://api.shodan.io",
    "https://api.stlouisfed.org",
    "https://stream.mux.com",
    "https://*.mux.com",
  ];
  const imgSrc = [
    "img-src 'self' data: blob:",
    "https://*.basemaps.cartocdn.com",
    "https://www.tradingview.com",
    "https://s3.tradingview.com",
  ];
  const frameSrc = [
    "frame-src 'self'",
    "https://www.tradingview.com",
    "https://s.tradingview.com",
  ];
  const mediaSrc = [
    "media-src 'self' data: blob:",
    "https://d8j0ntlcm91z4.cloudfront.net",
    "https://stream.mux.com",
    "https://*.mux.com",
  ];

  if (options.development) {
    const port = normalizeDevelopmentPort(options.devPort);
    scriptSrc.push("'unsafe-eval'");
    connectSrc.push(`ws://127.0.0.1:${port}`, `ws://localhost:${port}`);
  }

  scriptSrc.push("https://s3.tradingview.com");

  return [
    "default-src 'self'",
    scriptSrc.join(" "),
    styleSrc.join(" "),
    imgSrc.join(" "),
    "font-src 'self' data: https://fonts.gstatic.com",
    mediaSrc.join(" "),
    connectSrc.join(" "),
    frameSrc.join(" "),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
