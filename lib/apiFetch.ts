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

import { normalizeTokenCandidate } from "@/lib/authToken";

const TOKEN_KEY = "nexus_session_token";

// ── In-flight deduplication map ───────────────────────────────────────────────
// Prevents duplicate GET requests to the same URL within the same render cycle.
// Only GET requests are deduplicated — mutations (POST/PUT/DELETE) are always sent.
const inflightRequests = new Map<string, Promise<Response>>();

export function getSessionToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setSessionToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Ignore storage write failures (private mode / policy-restricted webviews).
  }
}

export function clearSessionToken() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage delete failures.
  }
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

export type TokenValidationStatus =
  | "ok"
  | "invalid"
  | "rate_limited"
  | "server_error"
  | "unreachable";
export const TOKEN_VALIDATION_TIMEOUT_MS = 8000;

interface ValidateTokenOptions {
  persistOnSuccess?: boolean;
  timeoutMs?: number;
}

async function xhrPostJson(
  url: string,
  payload: Record<string, unknown>,
  timeoutMs: number,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    if (typeof XMLHttpRequest === "undefined") {
      reject(new Error("XHR unavailable"));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.timeout = timeoutMs;
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "application/json");

    xhr.onload = () => {
      if (xhr.status === 0) {
        reject(new Error("XHR returned status 0"));
        return;
      }

      const headers = new Headers();
      const rawHeaders = xhr.getAllResponseHeaders();
      rawHeaders
        .trim()
        .split(/[\r\n]+/)
        .filter(Boolean)
        .forEach((line) => {
          const index = line.indexOf(":");
          if (index === -1) return;
          const key = line.slice(0, index).trim();
          const value = line.slice(index + 1).trim();
          headers.append(key, value);
        });

      resolve(
        new Response(xhr.responseText ?? "", {
          status: xhr.status,
          statusText: xhr.statusText,
          headers,
        }),
      );
    };

    xhr.onerror = () => reject(new Error("XHR network error"));
    xhr.ontimeout = () => reject(new Error("XHR timed out"));
    xhr.send(JSON.stringify(payload));
  });
}

async function postJsonWithBrowserFallback(
  url: string,
  payload: Record<string, unknown>,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    return xhrPostJson(url, payload, timeoutMs);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Validate a token against the server.
 * Returns "ok" on success, "invalid" for rejected tokens, and "unreachable"
 * when the request cannot complete (network/timeout/parse issues).
 */
export async function validateToken(
  token: string,
  options: ValidateTokenOptions = {},
): Promise<TokenValidationStatus> {
  const {
    persistOnSuccess = false,
    timeoutMs = TOKEN_VALIDATION_TIMEOUT_MS,
  } = options;
  const normalizedToken = normalizeTokenCandidate(token);
  if (!normalizedToken) return "invalid";

  try {
    const r = await postJsonWithBrowserFallback(
      "/api/token",
      { token: normalizedToken },
      timeoutMs,
    );
    if (!r.ok) {
      try {
        const d = await r.json();
        if (d?.code === "invalid_token") return "invalid";
        if (d?.code === "rate_limited") return "rate_limited";
        if (d?.code === "server_error") return "server_error";
      } catch {
        // Fall through to status-based mapping.
      }
      if (r.status === 429) return "rate_limited";
      if (r.status >= 500) return "server_error";
      return r.status === 401 || r.status === 403 ? "invalid" : "unreachable";
    }

    const d = await r.json();

    if (d.ok) {
      if (persistOnSuccess) setSessionToken(normalizedToken);
      return "ok";
    }

    return "invalid";
  } catch {
    return "unreachable";
  }
}

export async function validateAndStoreToken(
  token: string,
): Promise<TokenValidationStatus> {
  return validateToken(token, { persistOnSuccess: true });
}

export async function probeRuntimeHealth(timeoutMs = 3000): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const r = await fetch("/api/health", {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!r.ok) return false;
    const d = await r.json();
    return d?.status === "ok";
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
