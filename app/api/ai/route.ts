import { NextRequest, NextResponse } from 'next/server'

/**
 * Multi-provider AI proxy with task-based model routing.
 *
 * Fallback chain (auto mode): Ollama → Groq → OpenRouter → Google → Anthropic → OpenAI
 * Research chain: Anthropic → OpenRouter → Groq → Ollama → OpenAI
 *
 * Task routing maps task hints to the optimal local Ollama model:
 *   chat      → qwen2.5:14b          (fast, general purpose)
 *   code      → qwen2.5-coder:14b    (code-optimized)
 *   vision    → llama3.2-vision:11b  (multimodal)
 *   reasoning → deepseek-r1:14b      (deep reasoning)
 *   fast      → qwen2.5:7b           (lowest latency)
 *   research  → cloud-first chain    (claude opus for depth)
 *   embed     → nomic-embed-text     (embeddings)
 *
 * Security guarantees:
 *  - All API keys live in process.env only — never touch the browser
 *  - Hard max_tokens cap enforced server-side
 *  - Provider whitelist — only known providers accepted
 *
 * Response headers:
 *  X-Provider — which provider actually responded
 *  X-Model    — which model was used
 */

// ── Token budget ───────────────────────────────────────────────────────────────
const MAX_TOKENS_PER_REQUEST = Math.min(
  parseInt(process.env.NEXUS_MAX_TOKENS ?? '2048', 10),
  8192
)

// ── Task → local Ollama model map ─────────────────────────────────────────────
const TASK_MODELS: Record<string, string> = {
  chat:      'qwen2.5:14b',
  code:      'qwen2.5-coder:14b',
  vision:    'llama3.2-vision:11b',
  reasoning: 'deepseek-r1:14b',
  fast:      'qwen2.5:7b',
  embed:     'nomic-embed-text',
  // default (no task hint) handled by TASK_MODELS['chat']
}

// ── Provider registry ─────────────────────────────────────────────────────────
interface Provider {
  name:    string
  url:     string
  key:     () => string
  format:  'anthropic' | 'openai'
  model:   string
  headers: (key: string) => Record<string, string>
}

const PROVIDERS: Record<string, Provider> = {
  ollama: {
    name:   'ollama',
    url:    process.env.OLLAMA_ENDPOINT ?? 'http://localhost:11434/v1/chat/completions',
    key:    () => process.env.OLLAMA_API_KEY ?? 'ollama',
    format: 'openai',
    model:  'qwen2.5:14b',
    headers: (key) => ({
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${key}`,
    }),
  },
  groq: {
    name:   'groq',
    url:    'https://api.groq.com/openai/v1/chat/completions',
    key:    () => process.env.GROQ_API_KEY ?? '',
    format: 'openai',
    model:  'llama-3.3-70b-versatile',
    headers: (key) => ({
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${key}`,
    }),
  },
  openrouter: {
    name:   'openrouter',
    url:    'https://openrouter.ai/api/v1/chat/completions',
    key:    () => process.env.OPENROUTER_API_KEY ?? '',
    format: 'openai',
    model:  'anthropic/claude-3.5-sonnet',
    headers: (key) => ({
      'Content-Type':     'application/json',
      'Authorization':    `Bearer ${key}`,
      'HTTP-Referer':     'https://nexus-prime.local',
      'X-Title':          'Nexus Prime',
    }),
  },
  google: {
    name:   'google',
    url:    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    key:    () => process.env.GOOGLE_AI_KEY ?? '',
    format: 'openai',
    model:  'gemini-2.0-flash',
    headers: (key) => ({
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${key}`,
    }),
  },
  anthropic: {
    name:   'anthropic',
    url:    'https://api.anthropic.com/v1/messages',
    key:    () => process.env.ANTHROPIC_API_KEY ?? '',
    format: 'anthropic',
    model:  'claude-opus-4-5',
    headers: (key) => ({
      'Content-Type':      'application/json',
      'x-api-key':         key,
      'anthropic-version': '2023-06-01',
    }),
  },
  openai: {
    name:   'openai',
    url:    'https://api.openai.com/v1/chat/completions',
    key:    () => process.env.OPENAI_API_KEY ?? '',
    format: 'openai',
    model:  'gpt-4o-mini',
    headers: (key) => ({
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${key}`,
    }),
  },
}

// ── Provider chains ───────────────────────────────────────────────────────────
// auto: try local first, fall back to cloud
const AUTO_CHAIN     = ['ollama', 'groq', 'openrouter', 'google', 'anthropic', 'openai']
// research: cloud-first for depth, local as final fallback
const RESEARCH_CHAIN = ['anthropic', 'openrouter', 'groq', 'ollama', 'openai']

// ── Call a single provider ────────────────────────────────────────────────────
async function callProvider(
  providerName: string,
  messages:     unknown[],
  model:        string | undefined,
  maxTokens:    number,
  system:       string | undefined,
  stream:       boolean,
): Promise<Response | null> {
  const p   = PROVIDERS[providerName]
  const key = p.key()
  if (!key || key === 'ollama' && providerName !== 'ollama') return null
  if (!key && providerName !== 'ollama') return null

  const resolvedModel = model ?? p.model

  let body: Record<string, unknown>

  if (p.format === 'anthropic') {
    // Anthropic Messages format
    body = {
      model:      resolvedModel,
      max_tokens: maxTokens,
      messages,
      ...(system ? { system } : {}),
      ...(stream ? { stream: true } : {}),
    }
  } else {
    // OpenAI-compatible format
    const msgs = system
      ? [{ role: 'system', content: system }, ...messages]
      : messages
    body = {
      model:      resolvedModel,
      max_tokens: maxTokens,
      messages:   msgs,
      ...(stream ? { stream: true } : {}),
    }
  }

  try {
    const r = await fetch(p.url, {
      method:  'POST',
      headers: p.headers(key),
      body:    JSON.stringify(body),
      // @ts-expect-error — Node 18 fetch supports duplex for streaming
      duplex: 'half',
    })
    if (!r.ok) return null
    return r
  } catch {
    return null
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      provider?:   string
      task?:       string
      model?:      string
      messages?:   unknown[]
      system?:     string
      max_tokens?: number
      stream?:     boolean
      [key: string]: unknown
    }

    const {
      provider,
      task,
      model,
      messages = [],
      system,
      max_tokens,
      stream = false,
    } = body

    // Clamp tokens
    const safeMaxTokens = Math.min(
      typeof max_tokens === 'number' && max_tokens > 0 ? max_tokens : 1024,
      MAX_TOKENS_PER_REQUEST
    )

    // Determine the model to use for Ollama based on task hint
    const taskModel = task ? (TASK_MODELS[task] ?? TASK_MODELS['chat']) : undefined

    // Determine provider chain
    let chain: string[]
    let resolvedModel: string | undefined

    if (provider && PROVIDERS[provider]) {
      // Explicit provider requested
      chain         = [provider]
      resolvedModel = model ?? PROVIDERS[provider].model
    } else if (task === 'research') {
      chain         = RESEARCH_CHAIN
      resolvedModel = model
    } else {
      // Auto chain — use task model for ollama, default for cloud
      chain         = AUTO_CHAIN
      resolvedModel = taskModel ?? model
    }

    // Walk the chain until one succeeds
    for (const providerName of chain) {
      // For cloud providers in the auto chain, use provider's default model
      const effectiveModel =
        providerName === 'ollama'
          ? (resolvedModel ?? TASK_MODELS['chat'])
          : (providerName === chain[0] ? resolvedModel : undefined)

      const r = await callProvider(
        providerName,
        messages,
        effectiveModel,
        safeMaxTokens,
        system,
        stream,
      )

      if (r) {
        const usedModel = effectiveModel ?? PROVIDERS[providerName].model
        return new NextResponse(r.body, {
          status:  r.status,
          headers: {
            'Content-Type': r.headers.get('Content-Type') ?? 'application/json',
            'X-Provider':   providerName,
            'X-Model':      usedModel,
          },
        })
      }
    }

    // All providers failed
    return NextResponse.json(
      { error: { message: 'All AI providers unavailable. Check your API keys and Ollama status.' } },
      { status: 503 }
    )
  } catch {
    return NextResponse.json(
      { error: { message: 'AI proxy request failed.' } },
      { status: 500 }
    )
  }
}
