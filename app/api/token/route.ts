import { NextRequest, NextResponse } from 'next/server'

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
    const { token } = await req.json() as { token?: string }
    const serverToken = process.env.NEXUS_TOKEN ?? ''

    if (!serverToken || !token || token !== serverToken) {
      return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 })
  }
}
