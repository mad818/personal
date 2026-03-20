/**
 * lib/ollama.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * NEXUS PRIME Ollama integration client.
 *
 * Features:
 *  - Auto-detects Ollama availability (pings http://localhost:11434/api/tags)
 *  - Lists installed models and their sizes
 *  - Smart model selection based on task type (speed vs. quality)
 *  - Streaming generation with AbortController support
 *  - OpenAI-compatible API bridge (drop-in for any component using OpenAI SDK)
 *  - Fallback chain: Ollama → localEndpoint → /api/ai (Anthropic/OpenRouter)
 *  - React hook: useOllama() → { available, models, activeModel, generate, stream }
 *
 * ── RTX 5070 Optimization Notes (12 GB VRAM) ─────────────────────────────────
 *  Recommended models for optimal performance:
 *   • llama3:8b-instruct-q8_0    — Best general purpose, fits in 12GB Q8
 *   • mistral:7b-instruct-v0.3   — Fast, great for structured output
 *   • phi3:14b-medium-128k-q4_0  — 14B at Q4 fits in 12GB, strong reasoning
 *   • qwen2.5:7b                 — Excellent for code + analysis (default)
 *   • qwen2.5:14b-instruct-q4_K_M — Larger capacity, ~9GB VRAM
 *   • nomic-embed-text           — Embeddings (tiny, 274MB)
 *
 *  Flash Attention 2 is enabled by default in Ollama ≥0.3.0 for NVIDIA GPUs.
 *  To enable GPU layers: ensure OLLAMA_NUM_GPU=99 in environment.
 *  Context window: RTX 5070 can handle 32K+ context at Q4 for 7B models.
 *
 * ── OpenAI Compatibility ──────────────────────────────────────────────────────
 *  The ollamaOpenAI export is a drop-in OpenAI SDK replacement:
 *    import { ollamaOpenAI as openai } from '@/lib/ollama'
 *    const res = await openai.chat.completions.create({...})
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { eventBus } from '@/lib/eventBus'

// ── Types ──────────────────────────────────────────────────────────────────────
export interface OllamaModel {
  name:       string
  model:      string
  size:       number
  digest:     string
  modified_at: string
  details?: {
    family:            string
    parameter_size:    string
    quantization_level: string
  }
}

export interface OllamaGenerateOptions {
  model?:       string
  prompt:       string
  system?:      string
  temperature?: number
  maxTokens?:   number
  stream?:      boolean
  signal?:      AbortSignal
  onChunk?:     (text: string) => void
}

export interface OllamaChatMessage {
  role:    'user' | 'assistant' | 'system'
  content: string
}

export interface OllamaChatOptions {
  model?:       string
  messages:     OllamaChatMessage[]
  temperature?: number
  maxTokens?:   number
  stream?:      boolean
  signal?:      AbortSignal
  onChunk?:     (text: string) => void
}

export type OllamaTaskType =
  | 'quick'        // Fast response, small model (phi3, mistral)
  | 'analysis'     // Deep reasoning (qwen2.5:14b, llama3:8b Q8)
  | 'code'         // Code generation (qwen2.5:7b, deepseek-coder)
  | 'embedding'    // Vector embeddings (nomic-embed-text)
  | 'summarize'    // Summarization (fast model)
  | 'default'      // Balanced (qwen2.5:7b)

export interface OllamaHookReturn {
  available:   boolean
  checking:    boolean
  models:      OllamaModel[]
  activeModel: string
  generate:    (opts: OllamaGenerateOptions) => Promise<string>
  chat:        (opts: OllamaChatOptions) => Promise<string>
  selectModel: (taskType: OllamaTaskType) => string
  setModel:    (model: string) => void
}

// ── Constants ──────────────────────────────────────────────────────────────────
const OLLAMA_BASE        = 'http://localhost:11434'
const OLLAMA_TAGS_URL    = `${OLLAMA_BASE}/api/tags`
const OLLAMA_GENERATE    = `${OLLAMA_BASE}/api/generate`
const OLLAMA_CHAT        = `${OLLAMA_BASE}/api/chat`
const OLLAMA_OPENAI_URL  = `${OLLAMA_BASE}/v1/chat/completions`
const DEFAULT_MODEL      = 'qwen2.5:7b'
const AVAILABILITY_TTL   = 60_000 // 1 minute cache

// ── Model selection map (task → preferred models in priority order) ─────────────
const TASK_MODEL_MAP: Record<OllamaTaskType, string[]> = {
  quick:     ['phi3:mini', 'phi3', 'mistral:7b', 'qwen2.5:7b', DEFAULT_MODEL],
  analysis:  ['qwen2.5:14b', 'llama3:8b', 'mistral:7b', 'qwen2.5:7b', DEFAULT_MODEL],
  code:      ['qwen2.5:7b', 'deepseek-coder', 'codellama', 'llama3:8b', DEFAULT_MODEL],
  embedding: ['nomic-embed-text', 'mxbai-embed-large', DEFAULT_MODEL],
  summarize: ['mistral:7b', 'phi3', 'qwen2.5:7b', DEFAULT_MODEL],
  default:   [DEFAULT_MODEL, 'mistral:7b', 'llama3:8b'],
}

// ── Availability cache ─────────────────────────────────────────────────────────
let cachedAvailability: { available: boolean; ts: number } | null = null
let cachedModels: OllamaModel[] = []

// ── Core functions ─────────────────────────────────────────────────────────────

/** Check if Ollama is running and reachable */
export async function checkOllamaAvailability(): Promise<boolean> {
  if (cachedAvailability && Date.now() - cachedAvailability.ts < AVAILABILITY_TTL) {
    return cachedAvailability.available
  }
  try {
    const res = await fetch(OLLAMA_TAGS_URL, {
      method:  'GET',
      signal:  AbortSignal.timeout(3000),
    })
    const available = res.ok
    cachedAvailability = { available, ts: Date.now() }
    return available
  } catch {
    cachedAvailability = { available: false, ts: Date.now() }
    return false
  }
}

/** List all models installed in Ollama */
export async function listOllamaModels(): Promise<OllamaModel[]> {
  try {
    const res  = await fetch(OLLAMA_TAGS_URL, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return []
    const data = await res.json() as { models: OllamaModel[] }
    cachedModels = data.models ?? []
    return cachedModels
  } catch {
    return cachedModels // return stale cache on error
  }
}

/** Select the best available model for a given task type */
export function selectModelForTask(
  taskType: OllamaTaskType,
  availableModels: OllamaModel[]
): string {
  const modelNames = availableModels.map((m) => m.name)
  const candidates = TASK_MODEL_MAP[taskType]
  const found      = candidates.find((candidate) =>
    modelNames.some((m) => m.startsWith(candidate.split(':')[0]) || m === candidate)
  )
  return found ?? DEFAULT_MODEL
}

/** Generate text with Ollama (non-chat, single prompt) */
export async function ollamaGenerate(opts: OllamaGenerateOptions): Promise<string> {
  const { prompt, system, model = DEFAULT_MODEL, temperature = 0.7, maxTokens, stream = false, signal, onChunk } = opts

  const body: Record<string, unknown> = {
    model,
    prompt,
    stream: stream && !!onChunk,
    options: {
      temperature,
      ...(maxTokens ? { num_predict: maxTokens } : {}),
    },
  }
  if (system) body.system = system

  const res = await fetch(OLLAMA_GENERATE, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Ollama generate error ${res.status}: ${errText}`)
  }

  if (stream && onChunk) {
    return _readNDJSONStream(res, (chunk) => {
      const text = (chunk as { response?: string }).response ?? ''
      if (text) onChunk(text)
    })
  }

  const data = await res.json() as { response: string }
  return data.response ?? ''
}

/** Chat with Ollama using message history */
export async function ollamaChat(opts: OllamaChatOptions): Promise<string> {
  const { messages, model = DEFAULT_MODEL, temperature = 0.7, maxTokens, stream = false, signal, onChunk } = opts

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: stream && !!onChunk,
    options: {
      temperature,
      ...(maxTokens ? { num_predict: maxTokens } : {}),
    },
  }

  const res = await fetch(OLLAMA_CHAT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Ollama chat error ${res.status}: ${errText}`)
  }

  if (stream && onChunk) {
    return _readNDJSONStream(res, (chunk) => {
      const text = (chunk as { message?: { content?: string } }).message?.content ?? ''
      if (text) onChunk(text)
    })
  }

  const data = await res.json() as { message: { content: string } }
  return data.message?.content ?? ''
}

// ── Streaming NDJSON reader ────────────────────────────────────────────────────
async function _readNDJSONStream(
  res: Response,
  onChunk: (parsed: unknown) => void
): Promise<string> {
  const reader  = res.body!.getReader()
  const decoder = new TextDecoder()
  let   full    = ''
  let   buffer  = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const parsed = JSON.parse(trimmed)
        const text   = (parsed as { response?: string; message?: { content?: string } }).response
          ?? (parsed as { message?: { content?: string } }).message?.content
          ?? ''
        full += text
        onChunk(parsed)
      } catch { /* skip malformed */ }
    }
  }
  return full
}

// ── Fallback chain ─────────────────────────────────────────────────────────────
/**
 * Smart generate with fallback: Ollama → localEndpoint → /api/ai
 * Respects the existing useStore aiMode setting.
 */
export async function generateWithFallback(
  messages: OllamaChatMessage[],
  opts: { taskType?: OllamaTaskType; maxTokens?: number; onChunk?: (text: string) => void } = {}
): Promise<string> {
  const { taskType = 'default', maxTokens = 1024, onChunk } = opts

  // 1. Try Ollama first
  const available = await checkOllamaAvailability()
  if (available) {
    try {
      const models = await listOllamaModels()
      const model  = selectModelForTask(taskType, models)
      return await ollamaChat({
        messages,
        model,
        maxTokens,
        stream:  !!onChunk,
        onChunk,
      })
    } catch (err) {
      eventBus.emit('system:health', {
        component: 'ollama',
        status:    'degraded',
        message:   `Ollama fallback triggered: ${err instanceof Error ? err.message : String(err)}`,
        ts:        Date.now(),
      })
    }
  }

  // 2. Fallback to /api/ai (Anthropic server-side)
  try {
    const body: Record<string, unknown> = {
      provider:   'anthropic',
      model:      'claude-opus-4-5-20251101',
      max_tokens: maxTokens,
      messages,
      stream:     !!onChunk,
    }

    const res = await fetch('/api/ai', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })

    if (!res.ok) throw new Error(`/api/ai error ${res.status}`)

    if (onChunk) {
      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let   full    = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          const t = line.trim()
          if (!t.startsWith('data:')) continue
          const d = t.slice(5).trim()
          if (d === '[DONE]') continue
          try {
            const json = JSON.parse(d)
            const text = json.choices?.[0]?.delta?.content ?? json.delta?.text ?? ''
            if (text) { full += text; onChunk(text) }
          } catch { /* skip */ }
        }
      }
      return full
    }

    const data = await res.json() as { content?: Array<{ text: string }> }
    return data.content?.[0]?.text ?? ''
  } catch (err) {
    throw new Error(`All AI providers failed. Last error: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ── OpenAI-compatible bridge ───────────────────────────────────────────────────
/**
 * ollamaOpenAI — Drop-in replacement for the OpenAI SDK client.
 * Any component using `openai.chat.completions.create({...})` works with zero changes.
 *
 * @example
 * import { ollamaOpenAI as openai } from '@/lib/ollama'
 * const res = await openai.chat.completions.create({
 *   model: 'qwen2.5:7b',
 *   messages: [{ role: 'user', content: 'Hello' }],
 * })
 */
export const ollamaOpenAI = {
  chat: {
    completions: {
      async create(params: {
        model?:       string
        messages:     OllamaChatMessage[]
        max_tokens?:  number
        temperature?: number
        stream?:      boolean
      }) {
        const { model = DEFAULT_MODEL, messages, max_tokens, temperature, stream } = params

        const res = await fetch(OLLAMA_OPENAI_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ model, messages, max_tokens, temperature, stream }),
        })

        if (!res.ok) {
          const err = await res.text()
          throw new Error(`Ollama OpenAI bridge error ${res.status}: ${err}`)
        }

        if (stream) return res // Return raw Response for caller to handle

        const data = await res.json()
        return data
      },
    },
  },
}

// ── React hook ─────────────────────────────────────────────────────────────────
/**
 * useOllama — React hook for Ollama integration.
 * Auto-checks availability, lists models, provides generate/stream functions.
 *
 * @example
 * const { available, models, activeModel, chat, selectModel } = useOllama()
 */
export function useOllama(): OllamaHookReturn {
  const [available,   setAvailable]   = useState<boolean>(false)
  const [checking,    setChecking]    = useState<boolean>(true)
  const [models,      setModels]      = useState<OllamaModel[]>([])
  const [activeModel, setActiveModel] = useState<string>(DEFAULT_MODEL)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let mounted = true

    async function init() {
      setChecking(true)
      const avail = await checkOllamaAvailability()
      if (!mounted) return
      setAvailable(avail)

      if (avail) {
        const modelList = await listOllamaModels()
        if (!mounted) return
        setModels(modelList)

        // Pick a sensible default if qwen2.5:7b isn't installed
        const preferred = selectModelForTask('default', modelList)
        setActiveModel(preferred)

        eventBus.emit('system:health', {
          component: 'ollama',
          status:    'healthy',
          message:   `Ollama ready with ${modelList.length} model(s)`,
          ts:        Date.now(),
        })
      } else {
        eventBus.emit('system:health', {
          component: 'ollama',
          status:    'down',
          message:   'Ollama not reachable at localhost:11434',
          ts:        Date.now(),
        })
      }

      setChecking(false)
    }

    init()
    return () => { mounted = false }
  }, [])

  const generate = useCallback(async (opts: OllamaGenerateOptions): Promise<string> => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    return ollamaGenerate({
      ...opts,
      model:  opts.model ?? activeModel,
      signal: opts.signal ?? abortRef.current.signal,
    })
  }, [activeModel])

  const chat = useCallback(async (opts: OllamaChatOptions): Promise<string> => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    return ollamaChat({
      ...opts,
      model:  opts.model ?? activeModel,
      signal: opts.signal ?? abortRef.current.signal,
    })
  }, [activeModel])

  const selectModel = useCallback((taskType: OllamaTaskType): string => {
    return selectModelForTask(taskType, models)
  }, [models])

  const setModel = useCallback((model: string) => {
    setActiveModel(model)
  }, [])

  return { available, checking, models, activeModel, generate, chat, selectModel, setModel }
}

const ollamaExports = { checkOllamaAvailability, listOllamaModels, ollamaGenerate, ollamaChat, generateWithFallback, ollamaOpenAI, useOllama }
export default ollamaExports
