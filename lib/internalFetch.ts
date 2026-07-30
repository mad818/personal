import { buildInternalApiHeaders } from "@/lib/authSession";

function readInternalRuntimePort() {
  const rawPort = String(process.env.PORT ?? "3000").trim();
  const port = Number.parseInt(rawPort, 10);
  return Number.isInteger(port) && port >= 1 && port <= 65_535
    ? String(port)
    : "3000";
}

export async function fetchTrustedInternal(
  pathname: string,
  init: RequestInit & { origin?: string | null } = {},
) {
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
  const target = new URL("http://127.0.0.1");
  target.port = readInternalRuntimePort();
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
