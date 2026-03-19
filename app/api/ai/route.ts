import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side Anthropic / OpenAI proxy.
 *
 * Security guarantees:
 *  - API keys live in process.env only — never touch the browser
 *  - Hard max_tokens cap enforced here — client cannot request more
 *  - Provider whitelist — only 'anthropic' and 'openai' allowed
 *
 * Token budget:
 *  MAX_TOKENS_PER_REQUEST caps how many output tokens any single call
 *  can generate. Raise it in .env.local if needed (NEXUS_MAX_TOKENS).
 *  Default: 2048 — plenty for analysis/summaries, not runaway.
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

// Hard ceiling on output tokens per request (server enforces this —
// the client value is clamped, never overridden upward)
const MAX_TOKENS_PER_REQUEST = Math.min(
  parseInt(process.env.NEXUS_MAX_TOKENS ?? '2048', 10),
  4096 // absolute max we ever allow regardless of env
)

export async function POST(req: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''
  const openaiKey    = process.env.OPENAI_API_KEY ?? ''

  try {
    const body = await req.json() as {
      provider?:   'anthropic' | 'openai'
      max_tokens?: number
      [key: string]: unknown
    }

    const { provider = 'anthropic', max_tokens, ...rest } = body

    // Clamp max_tokens — client can only request LESS than the cap, never more
    const safeMaxTokens = Math.min(
      typeof max_tokens === 'number' && max_tokens > 0 ? max_tokens : 1024,
      MAX_TOKENS_PER_REQUEST
    )

    const payload = { ...rest, max_tokens: safeMaxTokens }

    if (provider === 'openai') {
      if (!openaiKey) {
        return NextResponse.json(
          { error: { message: 'OPENAI_API_KEY not configured on server.' } },
          { status: 400 },
        )
      }
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify(payload),
        // @ts-expect-error — Node 18 fetch supports duplex for streaming
        duplex: 'half',
      })
      return new NextResponse(r.body, {
        status:  r.status,
        headers: { 'Content-Type': r.headers.get('Content-Type') ?? 'application/json' },
      })
    }

    if (provider !== 'anthropic') {
      return NextResponse.json(
        { error: { message: `Unknown provider: ${String(provider)}` } },
        { status: 400 },
      )
    }

    if (!anthropicKey) {
      return NextResponse.json(
        { error: { message: 'ANTHROPIC_API_KEY not configured on server. Add it in Settings.' } },
        { status: 400 },
      )
    }

    const r = await fetch(ANTHROPIC_URL, {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
      // @ts-expect-error — streaming support
      duplex: 'half',
    })

    return new NextResponse(r.body, {
      status:  r.status,
      headers: { 'Content-Type': r.headers.get('Content-Type') ?? 'application/json' },
    })
  } catch {
    return NextResponse.json(
      { error: { message: 'AI proxy request failed.' } },
      { status: 500 },
    )
  }
}
