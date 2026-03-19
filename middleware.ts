import { NextRequest, NextResponse } from 'next/server'

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

const PUBLIC_ROUTES = ['/api/token', '/api/health']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only protect /api/* routes
  if (!pathname.startsWith('/api/')) return NextResponse.next()

  // Exempt public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) return NextResponse.next()

  const token     = process.env.NEXUS_TOKEN ?? ''
  const authHeader = req.headers.get('Authorization') ?? ''
  const bearer    = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!token || bearer !== token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
