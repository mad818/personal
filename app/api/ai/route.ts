import { NextRequest, NextResponse } from 'next/server'

/**
 * Multi-provider AI proxy with free-first fallback chain.
 *
 * Fallback order (auto mode):
 *   1. Ollama (localhost:11434) — local, free, no key
 *   2. Groq (free tier) — requires GROQ_API_KEY
 *   3. OpenRouter (free models) — requires OPENROUTER_API_KEY
 *   4. Google AI Studio (Gemini free) — requires GOOGLE_AI_KEY
 *   5. Anthropic (paid) — requires ANTHROPIC_API_KEY
 *   6. OpenAI (paid) — requires OPENAI_API_KEY
 *
 * Security: API keys live in process.env only — never exposed to browser.
 * Token cap: NEXUS_MAX_TOKENS env var (default 2048, hard max 4096).
 */

const MAX_TOKENS_PER_REQUEST = Math.min(
  parseInt(process.env.NEXUS_MAX_TOKENS ?? '2048', 10),
  4096
)

// ─── Provider configs ─────────────────────────────────────────────────────────

interface ProviderConfig {
  name: string
  url: string
  defaultModel: string
  buildHeaders: () => Record<string, string>
  available: () => boolean | Promise<boolean>
}

async function checkOllamaAvailable(): Promise<boolean> {
  try {
    const r = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(1500),
    })
    return r.ok
  } catch {
    return false
  }
}

const PROVIDERS: Record<string, ProviderConfig> = {
  ollama: {
    name: 'ollama',
    url: 'http://localhost:11434/v1/chat/completions',
    defaultModel: 'llama3',
    buildHeaders: () => ({ 'Content-Type': 'application/json' }),
    available: () => checkOllamaAvailable(),
  },
  groq: {
    name: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.1-8b-instant',
    buildHeaders: () => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY ?? ''}`,
    }),
    available: () => Boolean(process.env.GROQ_API_KEY),
  },
  openrouter: {
    name: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'deepseek/deepseek-r1:free',
    buildHeaders: () => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY ?? ''}`,
      'HTTP-Referer': 'https://nexusprime.local',
      'X-Title': 'NEXUS PRIME',
    }),
    available: () => Boolean(process.env.OPENROUTER_API_KEY),
  },
  google: {
    name: 'google',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    defaultModel: 'gemini-2.0-flash',
    buildHeaders: () => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GOOGLE_AI_KEY ?? ''}`,
    }),
    available: () => Boolean(process.env.GOOGLE_AI_KEY),
  },
  anthropic: {
    name: 'anthropic',
    url: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-haiku-20240307',
    buildHeaders: () => ({
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    }),
    available: () => Boolean(process.env.ANTHROPIC_API_KEY),
  },
  openai: {
    name: 'openai',
    url: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    buildHeaders: () => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
    }),
    available: () => Boolean(process.env.OPENAI_API_KEY),
  },
}

// Fallback chain order for 'auto' mode
const AUTO_CHAIN: string[] = ['ollama', 'groq', 'openrouter', 'google', 'anthropic', 'openai']

// ─── Anthropic format converter ───────────────────────────────────────────────

interface ChatMessage {
  role: string
  content: string
}

interface AnthropicPayload {
  model: string
  max_tokens: number
  messages: ChatMessage[]
  stream?: boolean
  [key: string]: unknown
}

interface OpenAIPayload {
  model: string
  max_tokens: number
  messages: ChatMessage[]
  stream?: boolean
  [key: string]: unknown
}

/** Convert OpenAI-style payload to Anthropic format */
function toAnthropicPayload(payload: OpenAIPayload): AnthropicPayload {
  const { messages, model, max_tokens, stream, ...rest } = payload
  // Anthropic uses 'user'/'assistant' roles and separates system
  const systemMsg = messages.find((m) => m.role === 'system')
  const chatMsgs = messages.filter((m) => m.role !== 'system')
  return {
    model,
    max_tokens,
    ...(systemMsg ? { system: systemMsg.content } : {}),
    messages: chatMsgs,
    ...(stream !== undefined ? { stream } : {}),
    ...rest,
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      provider?: string
      model?: string
      messages?: ChatMessage[]
      max_tokens?: number
      stream?: boolean
      [key: string]: unknown
    }

    const {
      provider: requestedProvider = 'auto',
      model,
      messages = [],
      max_tokens,
      stream = false,
      ...rest
    } = body

    const safeMaxTokens = Math.min(
      typeof max_tokens === 'number' && max_tokens > 0 ? max_tokens : 1024,
      MAX_TOKENS_PER_REQUEST
    )

    // Build the list of providers to try
    let providerChain: string[]
    if (requestedProvider === 'auto' || !requestedProvider) {
      providerChain = AUTO_CHAIN
    } else if (requestedProvider in PROVIDERS) {
      providerChain = [requestedProvider]
    } else {
      return NextResponse.json(
        { error: { message: `Unknown provider: ${String(requestedProvider)}` } },
        { status: 400 }
      )
    }

    let lastError = 'No available providers configured.'

    for (const providerName of providerChain) {
      const config = PROVIDERS[providerName]
      if (!config) continue

      const isAvailable = await config.available()
      if (!isAvailable) continue

      try {
        const chosenModel = model ?? config.defaultModel

        if (providerName === 'anthropic') {
          // Anthropic uses its own format
          const anthropicPayload = toAnthropicPayload({
            model: chosenModel,
            max_tokens: safeMaxTokens,
            messages,
            stream,
            ...rest,
          })

          const r = await fetch(config.url, {
            method: 'POST',
            headers: config.buildHeaders(),
            body: JSON.stringify(anthropicPayload),
            signal: AbortSignal.timeout(8000),
            // @ts-expect-error — Node 18 fetch supports duplex for streaming
            duplex: 'half',
          })

          if (!r.ok) {
            const errText = await r.text()
            lastError = `Anthropic ${r.status}: ${errText.slice(0, 200)}`
            continue
          }

          return new NextResponse(r.body, {
            status: r.status,
            headers: { 'Content-Type': r.headers.get('Content-Type') ?? 'application/json' },
          })
        }

        // All other providers use OpenAI-compatible format
        const openAIPayload: OpenAIPayload = {
          model: chosenModel,
          max_tokens: safeMaxTokens,
          messages,
          stream,
          ...rest,
        }

        const r = await fetch(config.url, {
          method: 'POST',
          headers: config.buildHeaders(),
          body: JSON.stringify(openAIPayload),
          signal: AbortSignal.timeout(8000),
          // @ts-expect-error — Node 18 fetch supports duplex for streaming
          duplex: 'half',
        })

        if (!r.ok) {
          const errText = await r.text()
          lastError = `${config.name} ${r.status}: ${errText.slice(0, 200)}`
          continue
        }

        return new NextResponse(r.body, {
          status: r.status,
          headers: {
            'Content-Type': r.headers.get('Content-Type') ?? 'application/json',
            'X-Provider': config.name,
          },
        })
      } catch (providerErr) {
        lastError = providerErr instanceof Error ? providerErr.message : `${providerName} failed`
        continue
      }
    }

    // All providers failed or unavailable
    return NextResponse.json(
      { error: { message: `All AI providers failed or unavailable. Last error: ${lastError}` } },
      { status: 503 }
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Request parsing failed'
    return NextResponse.json(
      { error: { message: `AI proxy error: ${msg}` } },
      { status: 500 }
    )
  }
}
