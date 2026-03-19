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

const TOKEN_KEY = 'nexus_session_token'

export function getSessionToken(): string {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem(TOKEN_KEY) ?? ''
}

export function setSessionToken(token: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearSessionToken() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(TOKEN_KEY)
}

export async function apiFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getSessionToken()

  const headers = new Headers(options.headers ?? {})
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return fetch(url, { ...options, headers })
}

/**
 * Validate a token against the server.
 * Returns true on success and persists the token to sessionStorage.
 */
export async function validateAndStoreToken(token: string): Promise<boolean> {
  try {
    const r = await fetch('/api/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
    const d = await r.json()
    if (d.ok) {
      setSessionToken(token)
      return true
    }
    return false
  } catch {
    return false
  }
}
