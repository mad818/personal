import { lookup } from "node:dns/promises";

function normalizeHost(hostname: string) {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "");
}

/** Literal hostname/IP check — no DNS lookup. */
export function isPrivateNetworkHost(hostname: string): boolean {
  const host = normalizeHost(hostname);

  if (
    host === "localhost" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host === "::" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    return true;
  }

  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host)) return true;
  if (/^fe80:/i.test(host)) return true;
  if (/^f[cd]/i.test(host)) return true;

  return false;
}

export async function assertPublicResolvableHost(hostname: string) {
  const normalized = normalizeHost(hostname);
  if (isPrivateNetworkHost(normalized)) {
    throw new Error("private_host");
  }

  const results = await lookup(normalized, { all: true, verbatim: true });
  for (const entry of results) {
    if (isPrivateNetworkHost(entry.address)) {
      throw new Error("private_dns_resolution");
    }
  }
}
