// ── middleware ──────────────────────────────────────────────
// Next.js middleware: authentication, redirects, request logging.

import { NextRequest, NextResponse } from 'next/server'
import {
  getConfiguredNexusToken,
  hasAuthenticatedNexusSession,
  isTrustedInternalHost,
  matchesConfiguredNexusToken,
  NEXUS_INTERNAL_AUTH_HEADER,
  NEXUS_SESSION_COOKIE,
} from '@/lib/authSession'
import {
  getRoutePolicy,
  isRouteAllowedInMode,
  readNetworkMode,
} from '@/lib/security/routePolicy'
import {
  NEXUS_HIGH_RISK_COOKIE,
  NEXUS_NETWORK_MODE_COOKIE,
  parseBooleanPolicyCookie,
  parseNetworkModeCookie,
} from '@/lib/security/runtimePolicyCookies'
import {
  findConnectorKeyForPath,
  readConnectorPolicy,
} from '@/lib/security/connectorPolicy'

/**
 * Nexus Gateway Middleware
 *
 * All protected /api/* routes require a cookie-backed session. Internal
 * server-to-server fetches may use a dedicated internal auth header, but
 * browser JS should never carry the configured Nexus token.
 *
 * Public exceptions:
 *  /api/token  — lets the frontend exchange a password for a session token
 *  /api/health — uptime check
 */

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only protect /api/* routes
  if (!pathname.startsWith('/api/')) return NextResponse.next()
  const policy = getRoutePolicy(pathname)
  if (!policy) {
    return NextResponse.json({ error: 'Unknown API route', route: pathname }, { status: 403 })
  }
  const mode =
    parseNetworkModeCookie(req.cookies.get(NEXUS_NETWORK_MODE_COOKIE)?.value) ??
    readNetworkMode()
  const highRiskEnabled =
    parseBooleanPolicyCookie(req.cookies.get(NEXUS_HIGH_RISK_COOKIE)?.value) ??
    (process.env.NEXUS_ENABLE_HIGH_RISK_TOOLS === 'true')
  if (!isRouteAllowedInMode(policy.routeClass, mode, highRiskEnabled)) {
    return NextResponse.json(
      {
        error: 'Blocked by network policy',
        route: pathname,
        mode,
        routeClass: policy.routeClass,
      },
      { status: 403 },
    )
  }
  if (policy.routeClass === 'connector_opt_in') {
    const connectorKey = findConnectorKeyForPath(pathname)
    if (connectorKey) {
      const connectorPolicy = readConnectorPolicy()
      if (!connectorPolicy[connectorKey]) {
        return NextResponse.json(
          {
            error: 'Blocked by connector policy',
            route: pathname,
            connector: connectorKey,
          },
          { status: 403 },
        )
      }
    }
  }
  if (policy.public) return NextResponse.next()

  if (!getConfiguredNexusToken()) {
    return NextResponse.next()
  }

  const sessionCookie = req.cookies.get(NEXUS_SESSION_COOKIE)?.value ?? ''
  const internalAuth = req.headers.get(NEXUS_INTERNAL_AUTH_HEADER) ?? ''
  const sessionAuthorized = await hasAuthenticatedNexusSession(sessionCookie)
  const internalAuthorized =
    matchesConfiguredNexusToken(internalAuth) &&
    isTrustedInternalHost(
      req.headers.get('x-forwarded-host') ??
        req.headers.get('host') ??
        req.nextUrl.host,
    )
  const authorized = sessionAuthorized || internalAuthorized

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
