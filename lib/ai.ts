'use client'

// ── AI call wrappers — all Anthropic calls go through /api/ai (server-side key)

import { DEFAULT_SETTINGS, type Settings } from '@/store/useStore'
import { apiFetch } from '@/lib/apiFetch'

function getSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem('nexus-settings')
    return raw ? JSON.parse(raw).state?.settings ?? DEFAULT_SETTINGS : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

function aiReady(s: Settings): boolean {
  // Provider is anthropic → /api/ai handles the key server-side
  if (s.aiProvider === 'anthropic') return true
  // Local Ollama — needs endpoint + model
  if (s.localEndpoint && s.localModel) return true
  return false
}

// ── Streaming helper ──────────────────────────────────────────────────────────
async function streamRequest(
  url: string,
  headers: Record<string, string>,
  body: object,
  onChunk: (text: string) => void,
  useApiFetch = false
): Promise<string> {
  const res = useApiFetch
    ? await apiFetch(url, { method: 'POST', body: JSON.stringify(body) })
    : await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      })
  if (!res.ok) throw new Error(`API ${res.status}`)
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    for (const line of chunk.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') continue
      try {
        const json = JSON.parse(data)
        const text = json.choices?.[0]?.delta?.content
          ?? json.delta?.text
          ?? ''
        if (text) { full += text; onChunk(text) }
      } catch { /* skip malformed */ }
    }
  }
  return full
}

// ── Task → local model map (mirrors server-side TASK_MODELS) ─────────────────
const TASK_MODELS: Record<string, string> = {
  chat:      'qwen2.5:14b',
  code:      'qwen2.5-coder:14b',
  vision:    'llama3.2-vision:11b',
  reasoning: 'deepseek-r1:14b',
  fast:      'qwen2.5:7b',
  embed:     'nomic-embed-text',
}

// ── Main AI call (non-streaming) ──────────────────────────────────────────────
export async function callAI(
  prompt: string,
  maxTokens = 1024,
  task?: string
): Promise<string> {
  const s = getSettings()
  if (!aiReady(s)) throw new Error('No AI configured')

  // Route through /api/ai — key never leaves the server
  // Anthropic provider → cloud path; task hint uses RESEARCH_CHAIN server-side
  if (s.aiProvider === 'anthropic') {
    const res = await apiFetch('/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        provider:   'anthropic',
        model:      'claude-opus-4-5',
        max_tokens: maxTokens,
        messages:   [{ role: 'user', content: prompt }],
        ...(task ? { task } : {}),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message ?? `API error ${res.status}`)
    // Anthropic returns content array; OpenAI-compat returns choices
    return data.content?.[0]?.text ?? data.choices?.[0]?.message?.content ?? ''
  }

  // Local Ollama — pick model by task hint
  const model = task ? (TASK_MODELS[task] ?? s.localModel) : s.localModel
  const res = await fetch(s.localEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(s.localApiKey ? { Authorization: `Bearer ${s.localApiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// ── Streaming AI call ─────────────────────────────────────────────────────────
export async function streamAI(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  maxTokens = 1024,
  task?: string
): Promise<string> {
  const s = getSettings()
  if (!aiReady(s)) throw new Error('No AI configured')

  if (s.aiProvider === 'anthropic') {
    return streamRequest(
      '/api/ai',
      {},
      {
        provider:   'anthropic',
        model:      'claude-opus-4-5',
        max_tokens: maxTokens,
        system:     systemPrompt,
        messages,
        stream:     true,
        ...(task ? { task } : {}),
      },
      onChunk,
      true // use apiFetch
    )
  }

  // Local Ollama — pick model by task hint
  const model = task ? (TASK_MODELS[task] ?? s.localModel) : s.localModel
  return streamRequest(
    s.localEndpoint,
    s.localApiKey ? { Authorization: `Bearer ${s.localApiKey}` } : {},
    {
      model,
      max_tokens: maxTokens,
      messages:   [{ role: 'system', content: systemPrompt }, ...messages],
      stream:     true,
    },
    onChunk,
    false
  )
}

// ── System prompt builder ─────────────────────────────────────────────────────
export function buildSystemPrompt(s: Settings): string {
  const name = s.userName || 'Mario'
  const parts: string[] = []
  if (s.userGoals)    parts.push(`Goals: ${s.userGoals}`)
  if (s.userSkills)   parts.push(`Building: ${s.userSkills}`)
  if (s.userLearning) parts.push(`Learning: ${s.userLearning}`)
  if (s.userContext)  parts.push(`Context: ${s.userContext}`)
  const profile = parts.length
    ? `\n\n== ${name.toUpperCase()}'S PROFILE ==\n${parts.join('\n')}\n== END PROFILE ==`
    : ''
  return `You are Nexus AI — ${name}'s personal intelligence system, advisor, and developer agent. You are direct, sharp, and technical. You adapt to whatever ${name} needs: market analysis, research, trading signals, or coding and editing the Nexus Prime website itself.

You have full access to the Nexus Prime project source code through these tools:
- list_project_files(directory) — explore the project structure
- read_project_file(path) — read any source file before editing
- patch_project_file(path, old_string, new_string) — make targeted edits to components, pages, or library files

Project structure:
- app/ — Next.js routes (one folder per tab: home, command, alpha, signals, ops, intel, cyber, security, skills, iot, vehicle, vault)
- components/ — UI components grouped by tab
- lib/ — utilities (agent.ts, ai.ts, helpers.ts, etc.)
- store/useStore.ts — all global state (Zustand)
- public/ — static assets

Rules for editing:
1. Always read_project_file before patching — never guess at the current content
2. Use list_project_files to find the right file first
3. Make small targeted patches — one logical change at a time
4. After patching, confirm what changed and what the user should see in the browser${profile}`
}
