'use client'

/**
 * Nexus Agent Loop
 * ─────────────────
 * ReAct-style agent with full tool-use loop + auto rate-limit fallback.
 *
 * Modes:
 *  auto  → try Claude; if 429/overload hit, auto-fall to Ollama (draft mode)
 *  local → always use Ollama (draft mode: write_file → draft_file)
 *  claude → Claude only, no fallback
 *
 * Draft mode:
 *  When running on local Ollama due to rate limit or user choice, write_file
 *  is replaced by draft_file. Drafts are queued in pendingDrafts for Claude
 *  to finalize when the limit resets.
 */

import { DEFAULT_SETTINGS, type Settings, type AIMode } from '@/store/useStore'
import { useStore } from '@/store/useStore'
import { apiFetch } from '@/lib/apiFetch'

// ── Tool definitions (shown to the model) ────────────────────────────────────
export const AGENT_TOOLS = [
  {
    name:        'web_search',
    description: 'Search the web for current news, facts, or information. Returns a list of article titles and URLs. Use this to find up-to-date information.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
      },
      required: ['query'],
    },
  },
  {
    name:        'fetch_url',
    description: 'Fetch and read the text content of any public URL — articles, docs, pages. Use this after web_search to read a specific article in full.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The full URL to fetch' },
      },
      required: ['url'],
    },
  },
  {
    name:        'write_file',
    description: 'Write content to a file in the workspace. Use this to save reports, plans, research notes, code, or any output the user wants to keep.',
    input_schema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Filename, e.g. report.md or script.py' },
        content:  { type: 'string', description: 'The full content to write' },
      },
      required: ['filename', 'content'],
    },
  },
  {
    name:        'read_file',
    description: 'Read a file from the workspace. Use this to check what was previously saved.',
    input_schema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Filename to read' },
      },
      required: ['filename'],
    },
  },
  {
    name:        'list_files',
    description: 'List all files currently in the workspace.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name:        'calculate',
    description: 'Evaluate a mathematical expression and return the result. Use for arithmetic, percentages, financial calculations.',
    input_schema: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Math expression, e.g. 4500 * 12 or (100 - 3.5) / 100' },
      },
      required: ['expression'],
    },
  },
  {
    name:        'remember',
    description: 'Save a note to persistent memory. Use this to record anything important the user mentions — preferences, context, facts to carry forward. These notes are read back at the start of future sessions.',
    input_schema: {
      type: 'object',
      properties: {
        note: { type: 'string', description: 'The note to save, e.g. "User prefers RSI over MACD for entries"' },
      },
      required: ['note'],
    },
  },
  {
    name:        'recall',
    description: 'Read all previously saved memory notes. Use this at the start of a session or when you need to check what you already know about the user or their context.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name:        'ask_max',
    description: 'Ask Max (your local OpenClaw AI agent) a question. Max has web search, file access, Notion, and Google Places tools. Use this when you need Max\'s perspective, want to delegate a task locally, or want a second opinion. Max runs at http://127.0.0.1:18789.',
    input_schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The question or task to send to Max' },
      },
      required: ['message'],
    },
  },
]

// Draft-mode replacement for write_file
const DRAFT_FILE_TOOL = {
  name:        'draft_file',
  description: '[DRAFT MODE] Save content as a pending draft. Claude will finalize it when the rate limit clears. Use this instead of write_file.',
  input_schema: {
    type: 'object',
    properties: {
      filename: { type: 'string', description: 'Filename, e.g. report.md' },
      content:  { type: 'string', description: 'Full draft content to queue for review' },
    },
    required: ['filename', 'content'],
  },
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ToolCall {
  id:    string
  name:  string
  input: Record<string, string>
}

export interface AgentStep {
  type:    'thinking' | 'tool_call' | 'tool_result' | 'answer'
  content: string
  tool?:   string
}

export interface AgentOptions {
  settings:       Settings
  systemPrompt:   string
  messages:       { role: string; content: string }[]
  onStep:         (step: AgentStep) => void
  maxIterations?: number
  draftMode?:     boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem('nexus-settings')
    return raw ? JSON.parse(raw).state?.settings ?? DEFAULT_SETTINGS : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

async function executeTool(name: string, input: Record<string, string>): Promise<string> {
  try {
    const r = await apiFetch('/api/tools', {
      method: 'POST',
      body:   JSON.stringify({ tool: name, input }),
    })
    const d = await r.json()
    return d.result ?? 'No result.'
  } catch {
    return 'Tool execution failed.'
  }
}

// ── OpenAI-format tools (for Ollama) ─────────────────────────────────────────
function toOAITools(tools: typeof AGENT_TOOLS) {
  return tools.map((t) => ({
    type:     'function' as const,
    function: {
      name:        t.name,
      description: t.description,
      parameters:  t.input_schema,
    },
  }))
}

// ── Ollama agent loop (OpenAI-compat function calling) ────────────────────────
async function runOllamaAgent(opts: AgentOptions): Promise<string> {
  const { settings: s, systemPrompt, messages, onStep, maxIterations = 8, draftMode = false } = opts
  const endpoint = s.localEndpoint || 'http://localhost:11434/v1/chat/completions'
  const model    = s.localModel    || 'qwen3:14b'

  // In draft mode, swap write_file out for draft_file
  const tools = draftMode
    ? [...AGENT_TOOLS.filter((t) => t.name !== 'write_file'), DRAFT_FILE_TOOL]
    : AGENT_TOOLS

  if (draftMode) {
    onStep({
      type:    'thinking',
      content: `⚠️ Draft mode — using ${model}. File writes are queued for Claude to finalize.`,
    })
  } else {
    onStep({ type: 'thinking', content: `Using local model: ${model}` })
  }

  type OAIMsg = {
    role:          string
    content:       string | null
    tool_calls?:   object[]
    tool_call_id?: string
    name?:         string
  }

  const conv: OAIMsg[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  let finalAnswer = ''

  for (let iter = 0; iter < maxIterations; iter++) {
    let res: Response
    try {
      res = await fetch(endpoint, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(s.localApiKey ? { Authorization: `Bearer ${s.localApiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          max_tokens:  1024,
          messages:    conv,
          tools:       toOAITools(tools),
          tool_choice: 'auto',
        }),
      })
    } catch {
      finalAnswer = `Could not reach Ollama at ${endpoint}. Make sure Ollama is running (ollama serve).`
      break
    }

    const data = await res.json()
    if (!res.ok) {
      finalAnswer = data?.error?.message ?? 'Ollama error.'
      break
    }

    const msg        = data.choices?.[0]?.message
    const stopReason = data.choices?.[0]?.finish_reason as string

    // No tool calls → final answer
    if (!msg?.tool_calls?.length) {
      finalAnswer = msg?.content ?? ''
      onStep({ type: 'answer', content: finalAnswer })
      break
    }

    // Add assistant turn with tool_calls
    conv.push({ role: 'assistant', content: msg.content ?? null, tool_calls: msg.tool_calls })

    // Execute tool calls sequentially
    for (const tc of msg.tool_calls as { id: string; function: { name: string; arguments: string } }[]) {
      const name = tc.function.name
      let   input: Record<string, string> = {}
      try { input = JSON.parse(tc.function.arguments) } catch { /* ignore parse errors */ }

      onStep({ type: 'tool_call', content: JSON.stringify(input, null, 2), tool: name })

      let result: string

      if (name === 'draft_file' && draftMode) {
        // Queue as a pending draft instead of writing to disk
        const store = useStore.getState()
        store.addPendingDraft({
          filename: input.filename ?? 'draft.md',
          content:  input.content  ?? '',
          model,
          prompt:   messages.at(-1)?.content ?? '',
        })
        result = `📝 Draft saved: "${input.filename ?? 'draft.md'}" — queued for Claude to finalize.`
      } else {
        result = await executeTool(name, input)
      }

      onStep({ type: 'tool_result', content: result, tool: name })
      conv.push({ role: 'tool', tool_call_id: tc.id, name, content: result })
    }

    if (stopReason === 'stop') break
  }

  return finalAnswer
}

// ── Main agent loop ───────────────────────────────────────────────────────────
export async function runAgent(opts: AgentOptions): Promise<string> {
  const { settings, systemPrompt, messages, onStep, maxIterations = 8 } = opts
  const s = settings ?? getSettings()

  // Read current AI mode from store (outside React — getState() is safe)
  const storeAiMode: AIMode =
    typeof window !== 'undefined' ? useStore.getState().aiMode : 'auto'

  // No API key in settings AND not anthropic provider → Ollama in regular mode
  // Note: the actual key now lives server-side. If aiProvider is 'anthropic' we
  // try /api/ai regardless — the server will return a clear error if key is missing.
  if (s.aiProvider !== 'anthropic' && !s.apiKey) {
    try {
      return await runOllamaAgent({ ...opts, draftMode: false })
    } catch {
      const err = 'Could not reach Ollama. Make sure it is running: open Terminal and run `ollama serve`.'
      onStep({ type: 'answer', content: err })
      return err
    }
  }

  // User forced local/draft mode explicitly
  if (storeAiMode === 'local') {
    try {
      return await runOllamaAgent({ ...opts, draftMode: true })
    } catch {
      const err = 'Could not reach Ollama. Make sure it is running: open Terminal and run `ollama serve`.'
      onStep({ type: 'answer', content: err })
      return err
    }
  }

  // ── Anthropic tool-use loop (routed through /api/ai — key stays server-side)
  type AnthMsg = { role: 'user' | 'assistant'; content: string | object[] }
  const conv: AnthMsg[] = messages.map((m) => ({
    role:    m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }))

  let finalAnswer = ''

  for (let iter = 0; iter < maxIterations; iter++) {
    let res: Response
    try {
      res = await apiFetch('/api/ai', {
        method: 'POST',
        body: JSON.stringify({
          provider:   'anthropic',
          model:      'claude-opus-4-5-20251101',
          max_tokens: 1024,
          system:     systemPrompt,
          tools:      AGENT_TOOLS,
          messages:   conv,
        }),
      })
    } catch {
      finalAnswer = 'Network error reaching Claude API.'
      break
    }

    const data = await res.json()

    // 429 or overloaded → auto-fall to Ollama in draft mode
    if (res.status === 429 || data?.error?.type === 'overloaded_error') {
      onStep({
        type:    'thinking',
        content: '⚠️ Claude rate limit hit — switching to local model. File writes queued as drafts.',
      })
      useStore.getState().setAIMode('local')
      try {
        return await runOllamaAgent({ ...opts, draftMode: true })
      } catch {
        const err = 'Claude rate limited and Ollama is not reachable. Try again later.'
        onStep({ type: 'answer', content: err })
        return err
      }
    }

    if (!res.ok) {
      finalAnswer = data?.error?.message ?? 'Claude API error.'
      break
    }

    const stopReason = data.stop_reason as string
    const content    = data.content as {
      type:   string
      text?:  string
      id?:    string
      name?:  string
      input?: Record<string, string>
    }[]

    const textBlocks = content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('')
    if (textBlocks) onStep({ type: 'thinking', content: textBlocks })

    if (stopReason === 'end_turn' || !content.find((b) => b.type === 'tool_use')) {
      finalAnswer = textBlocks
      onStep({ type: 'answer', content: textBlocks })
      break
    }

    conv.push({ role: 'assistant', content })

    const toolUseBlocks = content.filter((b) => b.type === 'tool_use')
    const toolResults: object[] = []

    await Promise.all(
      toolUseBlocks.map(async (b) => {
        const name  = b.name  ?? ''
        const input = (b.input ?? {}) as Record<string, string>
        onStep({ type: 'tool_call', content: JSON.stringify(input, null, 2), tool: name })
        const result = await executeTool(name, input)
        onStep({ type: 'tool_result', content: result, tool: name })
        toolResults.push({ type: 'tool_result', tool_use_id: b.id, content: result })
      })
    )

    conv.push({ role: 'user', content: toolResults })
  }

  return finalAnswer
}
