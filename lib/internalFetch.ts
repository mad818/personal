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
  const sentinel = new URL("http://nexus-internal.invalid");
  const normalizedPath = new URL(pathname, sentinel);
  if (
    normalizedPath.origin !== sentinel.origin ||
    !normalizedPath.pathname.startsWith("/api/") ||
    normalizedPath.username ||
    normalizedPath.password ||
    normalizedPath.hash
  ) {
    throw new Error("Trusted internal fetches require a local /api/* path.");
  }
  const target = new URL(origin);
  target.pathname = normalizedPath.pathname;
  target.search = normalizedPath.search;
  const headers = buildInternalApiHeaders(init.headers);
  const { origin: _ignoredOrigin, ...requestInit } = init;
  return fetch(target, {
    ...requestInit,
    headers,
    redirect: "manual",
  });
}
