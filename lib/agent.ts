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
 *
 * Self-learning:
 *  remember/recall tools are intercepted client-side and use IndexedDB via
 *  memoryStore. After each completed conversation, autoLearn() extracts facts
 *  and preferences from the exchange and stores them automatically.
 */

import { DEFAULT_SETTINGS, type Settings, type AIMode } from '@/store/useStore'
import { useStore } from '@/store/useStore'
import { apiFetch } from '@/lib/apiFetch'
import {
  remember  as memRemember,
  recall    as memRecall,
  recallByType,
} from '@/lib/memoryStore'

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

  // ── Project source code access ─────────────────────────────────────────────
  {
    name:        'read_project_file',
    description: 'Read a source file from the Nexus Prime project. Use this to understand the codebase before making changes — always read a file before editing it. Examples: "app/home/page.tsx", "components/home/HomeChat.tsx", "lib/agent.ts", "store/useStore.ts".',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from project root, e.g. "components/home/HomeChat.tsx"' },
      },
      required: ['path'],
    },
  },
  {
    name:        'list_project_files',
    description: 'List files and folders in a project directory. Use this to explore the codebase structure. Examples: list "components" to see all component folders, list "app" to see all routes, list "lib" to see all utility files. Use "." to list the project root.',
    input_schema: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Relative directory path, e.g. "components/home" or "app" or "." for root' },
      },
      required: ['directory'],
    },
  },
  {
    name:        'patch_project_file',
    description: 'Make a targeted edit to a source file. Finds an exact string and replaces it with new content. IMPORTANT: Always read_project_file first to get the exact current text. Only edits files in: app/, components/, lib/, store/, public/, docs/, specs/. Returns an error if the old_string is not found exactly.',
    input_schema: {
      type: 'object',
      properties: {
        path:       { type: 'string', description: 'Relative path to the file, e.g. "components/home/HomeChat.tsx"' },
        old_string: { type: 'string', description: 'The exact text currently in the file that you want to replace. Must match character-for-character.' },
        new_string: { type: 'string', description: 'The new text to replace it with.' },
      },
      required: ['path', 'old_string', 'new_string'],
    },
  },
  {
    name:        'create_project_file',
    description: 'Create a new source file in the project. Use this to scaffold new components, hooks, pages, or utilities. Only creates files in: app/, components/, lib/, store/, public/, docs/, specs/, hooks/. Will fail if the file already exists — use patch_project_file to edit existing files.',
    input_schema: {
      type: 'object',
      properties: {
        path:    { type: 'string', description: 'Relative path for the new file, e.g. "components/ui/NewWidget.tsx"' },
        content: { type: 'string', description: 'The full content of the new file.' },
      },
      required: ['path', 'content'],
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

// ── Client-side memory intercepts ────────────────────────────────────────────
// remember/recall use IndexedDB directly — no round-trip to the server needed.

async function handleRemember(note: string): Promise<string> {
  try {
    // Classify the note automatically based on simple heuristics
    const lower = note.toLowerCase()
    const type =
      lower.includes('prefer') || lower.includes('always') || lower.includes('never') || lower.includes('want')
        ? 'preference'
        : lower.includes('happened') || lower.includes('detected') || lower.includes('noticed') || lower.includes('observed')
          ? 'episode'
          : 'fact'

    // Extract simple tags: capitalized words, numbers with units
    const rawTags = note.match(/\b[A-Z][a-z]{2,}\b|\b[A-Z]{2,}\b|\b\d+[%kKmMbB]+\b/g) ?? []
    const tags = Array.from(new Set(rawTags.map(t => t.toLowerCase()))).slice(0, 8)

    await memRemember(note, type, tags, 'agent')
    return `Remembered (${type}): "${note.slice(0, 80)}${note.length > 80 ? '…' : ''}"`
  } catch {
    return `Failed to save memory — IndexedDB may be unavailable.`
  }
}

async function handleRecall(query: string): Promise<string> {
  try {
    const q = query.trim()

    // No query → return recent facts + preferences
    if (!q) {
      const [facts, prefs] = await Promise.all([
        recallByType('fact', 12),
        recallByType('preference', 8),
      ])
      const all = [...prefs, ...facts]
      if (!all.length) return 'No memories saved yet.'
      return all.map(m => `[${m.type}] ${m.content}`).join('\n')
    }

    const memories = await memRecall(q, 10)
    if (!memories.length) return `No memories found matching "${q}".`
    return memories.map(m => `[${m.type}] ${m.content}`).join('\n')
  } catch {
    return 'Failed to read memory — IndexedDB may be unavailable.'
  }
}

async function executeTool(name: string, input: Record<string, string>): Promise<string> {
  // Intercept memory tools client-side — IndexedDB, no server round-trip
  if (name === 'remember') return handleRemember(input.note ?? '')
  if (name === 'recall')   return handleRecall(input.query ?? input.note ?? '')

  try {
    const r = await apiFetch('/api/tools', {
      method:  'POST',
      body:    JSON.stringify({ tool: name, input }),
      signal:  AbortSignal.timeout(TOOL_TIMEOUT_MS),
    })
    const d = await r.json()
    return d.result ?? 'No result.'
  } catch (e) {
    const isTimeout = e instanceof Error && e.name === 'TimeoutError'
    return isTimeout ? `Tool "${name}" timed out after ${TOOL_TIMEOUT_MS / 1000}s.` : `Tool "${name}" failed.`
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

// ── Timeouts ──────────────────────────────────────────────────────────────────
// Local Ollama: 90s per call (14b model can be slow on first token)
const OLLAMA_TIMEOUT_MS  = 90_000
// Cloud Claude: 45s (should respond much faster)
const CLAUDE_TIMEOUT_MS  = 45_000
// Tool execution: 15s (web search + fetch_url)
const TOOL_TIMEOUT_MS    = 15_000

// ── Memory context builder ────────────────────────────────────────────────────
// Recalled before each agent run and injected into the system prompt.
// Pulls top preferences (always relevant) + facts most relevant to the query.

async function buildMemoryContext(userMessage: string): Promise<string> {
  try {
    const [prefs, relevant] = await Promise.all([
      recallByType('preference', 6),
      memRecall(userMessage, 8),
    ])

    const prefBlock = prefs.length
      ? `User preferences:\n${prefs.map(m => `• ${m.content}`).join('\n')}`
      : ''

    // Filter out prefs already shown to avoid duplication
    const prefIds = new Set(prefs.map(m => m.id))
    const factBlock = relevant.filter(m => !prefIds.has(m.id)).length
      ? `Relevant memory:\n${relevant.filter(m => !prefIds.has(m.id)).map(m => `• [${m.type}] ${m.content}`).join('\n')}`
      : ''

    const parts = [prefBlock, factBlock].filter(Boolean)
    return parts.length
      ? `\n\n== MEMORY ==\n${parts.join('\n\n')}\n== END MEMORY ==`
      : ''
  } catch {
    return '' // memory unavailable — continue without it
  }
}

// ── Auto-learning loop ────────────────────────────────────────────────────────
// Called after each completed agent run. Uses a fast AI call to extract
// learnable facts/preferences from the exchange and stores them in IndexedDB.
// Runs silently in the background — never blocks the response.

async function autoLearn(
  userMessage: string,
  agentAnswer: string,
  settings:    Settings,
): Promise<void> {
  if (!agentAnswer || agentAnswer.length < 40) return

  try {
    const prompt = `You are a fact extractor. Extract up to 5 concise, standalone facts or preferences from this conversation that are worth remembering for future sessions.

User said: "${userMessage.slice(0, 400)}"
Agent replied: "${agentAnswer.slice(0, 600)}"

Output ONLY a JSON array of strings. Each string is one fact (max 120 chars). If nothing is worth saving, output [].
Example: ["User is analyzing BTC/USD 4h chart", "User prefers RSI(14) over MACD for entries"]`

    let extracted: string[] = []

    if (settings.aiProvider === 'anthropic') {
      const res = await apiFetch('/api/ai', {
        method: 'POST',
        body: JSON.stringify({
          provider:   'anthropic',
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 256,
          messages:   [{ role: 'user', content: prompt }],
          task:       'fast',
        }),
        signal: AbortSignal.timeout(15_000),
      })
      if (res.ok) {
        const data = await res.json()
        const raw  = data.content?.[0]?.text ?? data.choices?.[0]?.message?.content ?? '[]'
        const match = raw.match(/\[[\s\S]*\]/)
        extracted = match ? JSON.parse(match[0]) : []
      }
    } else if (settings.localEndpoint && settings.localModel) {
      const res = await fetch(settings.localEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.localApiKey ? { Authorization: `Bearer ${settings.localApiKey}` } : {}),
        },
        body: JSON.stringify({
          model:      settings.localModel,
          max_tokens: 256,
          messages:   [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(30_000),
      })
      if (res.ok) {
        const data  = await res.json()
        const raw   = data.choices?.[0]?.message?.content ?? '[]'
        const match = raw.match(/\[[\s\S]*\]/)
        extracted = match ? JSON.parse(match[0]) : []
      }
    }

    for (const fact of extracted) {
      if (typeof fact === 'string' && fact.trim().length > 5) {
        await handleRemember(fact.trim())
      }
    }
  } catch {
    // Silent — never block the main response
  }
}

// ── Ollama agent loop (OpenAI-compat function calling) ────────────────────────
async function runOllamaAgent(opts: AgentOptions): Promise<string> {
  const { settings: s, systemPrompt, messages, onStep, maxIterations = 6, draftMode = false } = opts
  const endpoint = s.localEndpoint || 'http://localhost:11434/v1/chat/completions'
  const model    = s.localModel    || 'qwen2.5:14b'

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
          max_tokens:  4096,
          messages:    conv,
          tools:       toOAITools(tools),
          tool_choice: 'auto',
        }),
        signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
      })
    } catch (e) {
      const isTimeout = e instanceof Error && e.name === 'TimeoutError'
      finalAnswer = isTimeout
        ? `Ollama took too long to respond (${OLLAMA_TIMEOUT_MS / 1000}s). The model may still be loading — try again in a moment.`
        : `Could not reach Ollama at ${endpoint}. Make sure Ollama is running: open a terminal and run \`ollama serve\`.`
      onStep({ type: 'answer', content: finalAnswer })
      break
    }

    let data: Record<string, unknown>
    try {
      data = await res.json()
    } catch {
      finalAnswer = 'Ollama returned an unreadable response. Try again.'
      onStep({ type: 'answer', content: finalAnswer })
      break
    }

    if (!res.ok) {
      finalAnswer = (data?.error as { message?: string })?.message ?? `Ollama error (HTTP ${res.status}).`
      onStep({ type: 'answer', content: finalAnswer })
      break
    }

    type OAIChoice = { message?: { content?: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] }; finish_reason?: string }
    const choices    = data.choices as OAIChoice[] | undefined
    const msg        = choices?.[0]?.message
    const stopReason = choices?.[0]?.finish_reason ?? ''

    // No tool calls → final answer
    if (!msg?.tool_calls?.length) {
      finalAnswer = msg?.content ?? ''
      onStep({ type: 'answer', content: finalAnswer })
      break
    }

    // Add assistant turn with tool_calls
    conv.push({ role: 'assistant', content: msg.content ?? null, tool_calls: msg.tool_calls })

    // Execute tool calls sequentially
    for (const tc of msg.tool_calls) {
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

  // ── Auto-recall: inject relevant memories into system prompt ─────────────
  const userMessage     = messages.findLast(m => m.role === 'user')?.content ?? ''
  const memoryContext   = await buildMemoryContext(userMessage)
  const enrichedPrompt  = systemPrompt + memoryContext

  // Read current AI mode from store (outside React — getState() is safe)
  const storeAiMode: AIMode =
    typeof window !== 'undefined' ? useStore.getState().aiMode : 'auto'

  const enrichedOpts = { ...opts, systemPrompt: enrichedPrompt }

  // No API key in settings AND not anthropic provider → Ollama in regular mode
  // Note: the actual key now lives server-side. If aiProvider is 'anthropic' we
  // try /api/ai regardless — the server will return a clear error if key is missing.
  if (s.aiProvider !== 'anthropic' && !s.apiKey) {
    try {
      const answer = await runOllamaAgent({ ...enrichedOpts, draftMode: false })
      void autoLearn(userMessage, answer, s)
      return answer
    } catch {
      const err = 'Could not reach Ollama. Make sure it is running: open Terminal and run `ollama serve`.'
      onStep({ type: 'answer', content: err })
      return err
    }
  }

  // User forced local/draft mode explicitly
  if (storeAiMode === 'local') {
    try {
      const answer = await runOllamaAgent({ ...enrichedOpts, draftMode: true })
      void autoLearn(userMessage, answer, s)
      return answer
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
          model:      'claude-opus-4-5',
          max_tokens: 4096,
          system:     enrichedPrompt,
          tools:      AGENT_TOOLS,
          messages:   conv,
        }),
        signal: AbortSignal.timeout(CLAUDE_TIMEOUT_MS),
      })
    } catch (e) {
      const isTimeout = e instanceof Error && e.name === 'TimeoutError'
      finalAnswer = isTimeout
        ? 'Claude took too long to respond. Switching to local model…'
        : 'Network error reaching Claude API.'
      // On timeout, try Ollama as fallback
      if (isTimeout) {
        try { return await runOllamaAgent({ ...enrichedOpts, draftMode: false }) } catch { /* ignore */ }
      }
      onStep({ type: 'answer', content: finalAnswer })
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
        const answer = await runOllamaAgent({ ...enrichedOpts, draftMode: true })
        void autoLearn(userMessage, answer, s)
        return answer
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

  // Auto-learn from completed conversation — runs silently in background
  if (finalAnswer) void autoLearn(userMessage, finalAnswer, s)

  return finalAnswer
}
