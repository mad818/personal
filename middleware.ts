// ── middleware ──────────────────────────────────────────────
// Next.js middleware: authentication, redirects, request logging.

import { NextRequest, NextResponse } from 'next/server'
import {
  getConfiguredNexusToken,
  matchesConfiguredNexusToken,
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
 * All /api/* routes require a Bearer token — same model as OpenClaw's
 * gateway auth. The token lives in .env.local (server-side only, never
 * sent to the browser).
 *
 * Public exceptions:
 *  /api/token  — lets the frontend exchange a password for a session token
 *  /api/health — uptime check
 */

export function middleware(req: NextRequest) {
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

  const authHeader = req.headers.get('Authorization') ?? ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const sessionCookie = req.cookies.get(NEXUS_SESSION_COOKIE)?.value ?? ''
  const authorized =
    matchesConfiguredNexusToken(bearer) ||
    matchesConfiguredNexusToken(sessionCookie)

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
