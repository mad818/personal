// ── api/token ───────────────────────────────────────────────
// Token info API: blockchain token metadata and on-chain analytics.

import { NextRequest, NextResponse } from 'next/server'

type AttemptInfo = { count: number; resetAt: number }
const TOKEN_ATTEMPTS = new Map<string, AttemptInfo>()
const WINDOW_MS = 5 * 60 * 1000
const MAX_ATTEMPTS = 10

function getClientId(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for') ?? ''
  return (
    xff.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

/**
 * POST /api/token
 *
 * Exchange the Nexus token for a confirmed session.
 * The frontend sends { token } and gets back { ok: true } if valid.
 * This is the equivalent of OpenClaw's dashboard connect flow.
 *
 * The token itself is never sent back — the client just stores what
 * it originally submitted (it already has it from the user entering it).
 */
export async function POST(req: NextRequest) {
  try {
    const clientId = getClientId(req)
    const now = Date.now()
    const prev = TOKEN_ATTEMPTS.get(clientId)
    if (prev && now <= prev.resetAt && prev.count >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { ok: false, error: 'Too many attempts. Try again in a few minutes.' },
        { status: 429 }
      )
    }

    const { token } = await req.json() as { token?: string }
    const serverToken = process.env.NEXUS_TOKEN ?? ''

    if (!serverToken || !token || token !== serverToken) {
      const active = prev && now <= prev.resetAt
        ? { count: prev.count + 1, resetAt: prev.resetAt }
        : { count: 1, resetAt: now + WINDOW_MS }
      TOKEN_ATTEMPTS.set(clientId, active)
      return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 })
    }

    TOKEN_ATTEMPTS.delete(clientId)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 })
  }
}
