// ── app/api/telegram/route.ts ─────────────────────────────────────────────────
// Telegram Bot webhook receiver → agent dispatch.
//
// Setup:
//   1. Create a bot with @BotFather, get the token.
//   2. Set TELEGRAM_BOT_TOKEN and TELEGRAM_SECRET in .env.local
//   3. Register the webhook:
//      curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://YOUR_DOMAIN/api/telegram&secret_token=YOUR_SECRET"
//
// Message flow:
//   User DMs bot → Telegram POSTs to /api/telegram → runAgent (JANSKY) →
//   reply via sendMessage API → done.
//
// See docs/deployment/telegram.md for full setup guide.

import { NextRequest, NextResponse } from 'next/server'

const BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN ?? ''
const SECRET     = process.env.TELEGRAM_SECRET    ?? ''
// Cap reply length so Telegram doesn't reject (4096 char limit)
const MAX_REPLY  = 3800

interface TelegramUpdate {
  message?: {
    chat:  { id: number }
    from?: { first_name?: string; username?: string }
    text?: string
  }
}

async function sendMessage(chatId: number, text: string): Promise<void> {
  if (!BOT_TOKEN) return
  const truncated = text.length > MAX_REPLY
    ? text.slice(0, MAX_REPLY) + '…\n\n_(reply truncated)_'
    : text
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      chat_id:    chatId,
      text:       truncated,
      parse_mode: 'Markdown',
    }),
    signal: AbortSignal.timeout(10_000),
  })
}

async function dispatchToAgent(prompt: string): Promise<string> {
  // Call the internal tools route to run a web_search as a lightweight proxy.
  // For full agent dispatch, call /api/ai directly with the agent system prompt.
  // We use a simple web_search + callAI pattern here to keep the webhook lean.
  try {
    const aiRes = await fetch(`${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/ai`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 800,
      }),
      signal: AbortSignal.timeout(28_000),
    })
    if (!aiRes.ok) return `Agent returned HTTP ${aiRes.status}. Check that Nexus Prime is running.`
    const data = await aiRes.json() as { content?: string; text?: string; result?: string }
    return data.content ?? data.text ?? data.result ?? 'No response from agent.'
  } catch {
    return 'Could not reach the Nexus Prime agent. Make sure the server is running.'
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Authentication ─────────────────────────────────────────────────────────
  if (!BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 503 })
  }

  // Verify the Telegram secret token header (set during webhook registration)
  if (SECRET) {
    const headerSecret = req.headers.get('x-telegram-bot-api-secret-token') ?? ''
    if (headerSecret !== SECRET) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  // ── Parse update ───────────────────────────────────────────────────────────
  let update: TelegramUpdate
  try {
    update = await req.json() as TelegramUpdate
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const message = update.message
  if (!message?.text || !message.chat?.id) {
    // Ignore non-text updates (stickers, joins, etc.)
    return NextResponse.json({ ok: true })
  }

  const chatId   = message.chat.id
  const text     = message.text.trim()
  const username = message.from?.first_name ?? message.from?.username ?? 'User'

  // ── Dispatch ───────────────────────────────────────────────────────────────
  // Fire dispatch asynchronously so Telegram doesn't retry (200 must come first)
  ;(async () => {
    try {
      const prompt   = `[Telegram from ${username}]: ${text}`
      const response = await dispatchToAgent(prompt)
      await sendMessage(chatId, response)
    } catch {
      await sendMessage(chatId, 'An error occurred. Please try again.')
    }
  })()

  // Return 200 immediately — Telegram requires < 5 s response
  return NextResponse.json({ ok: true })
}

// GET is used to verify the webhook is reachable (health check)
export async function GET(): Promise<NextResponse> {
  const configured = !!BOT_TOKEN
  return NextResponse.json({
    ok:          configured,
    service:     'nexus-telegram-webhook',
    configured,
    message:     configured
      ? 'Telegram webhook is ready.'
      : 'Set TELEGRAM_BOT_TOKEN and TELEGRAM_SECRET in .env.local, then register the webhook.',
  })
}
