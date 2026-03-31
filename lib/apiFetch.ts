// ── lib/apiFetch ────────────────────────────────────────────
// Authenticated fetch wrapper for all /api/* routes with error handling.

/**
 * apiFetch — authenticated fetch for all /api/* routes.
 *
 * The NEXUS_TOKEN is stored in sessionStorage after the user validates it
 * once via /api/token. This helper injects the Bearer header automatically
 * so no component has to think about auth headers.
 *
 * Usage:
 *   import { apiFetch } from '@/lib/apiFetch'
 *   const r = await apiFetch('/api/tools', { method: 'POST', body: ... })
 */

const TOKEN_KEY = "nexus_session_token";

// ── In-flight deduplication map ───────────────────────────────────────────────
// Prevents duplicate GET requests to the same URL within the same render cycle.
// Only GET requests are deduplicated — mutations (POST/PUT/DELETE) are always sent.
const inflightRequests = new Map<string, Promise<Response>>();

export function getSessionToken(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(TOKEN_KEY) ?? "";
}

export function setSessionToken(token: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getSessionToken();

  const headers = new Headers(options.headers ?? {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const method = (options.method ?? "GET").toUpperCase();

  // Deduplicate concurrent GET requests to the same URL.
  // A second caller that arrives while the first is in-flight gets the same Promise.
  // POST/PUT/DELETE always fire independently.
  if (method === "GET") {
    const existing = inflightRequests.get(url);
    if (existing) return existing;

    const p = fetch(url, { ...options, headers }).finally(() => {
      inflightRequests.delete(url);
    });
    inflightRequests.set(url, p);
    return p;
  }

  return fetch(url, { ...options, headers });
}

/**
 * Validate a token against the server.
 * Returns true on success and persists the token to sessionStorage.
 */
export async function validateAndStoreToken(token: string): Promise<boolean> {
  try {
    const r = await fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const d = await r.json();
    if (d.ok) {
      setSessionToken(token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
