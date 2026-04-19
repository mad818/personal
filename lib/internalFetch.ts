import {
  buildInternalApiHeaders,
  isTrustedInternalHost,
  resolveInternalServiceOrigin,
} from "@/lib/authSession";

function resolveTrustedOrigin(rawOrigin?: string | null) {
  if (rawOrigin) {
    try {
      const parsed = new URL(rawOrigin);
      if (isTrustedInternalHost(parsed.host)) {
        return parsed.origin;
      }
    } catch {
      // Fall through to the fixed internal origin below.
    }
  }
  return resolveInternalServiceOrigin();
}

export async function fetchTrustedInternal(
  pathname: string,
  init: RequestInit & { origin?: string | null } = {},
) {
  const origin = resolveTrustedOrigin(init.origin);
  const headers = buildInternalApiHeaders(init.headers);
  return fetch(new URL(pathname, origin), {
    ...init,
    headers,
  });
}
