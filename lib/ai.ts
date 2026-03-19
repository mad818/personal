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

// ── Main AI call (non-streaming) ──────────────────────────────────────────────
export async function callAI(
  prompt: string,
  maxTokens = 1024
): Promise<string> {
  const s = getSettings()
  if (!aiReady(s)) throw new Error('No AI configured')

  // Route through /api/ai — key never leaves the server
  if (s.aiProvider === 'anthropic') {
    const res = await apiFetch('/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        provider:   'anthropic',
        model:      'claude-opus-4-5-20251101',
        max_tokens: maxTokens,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message ?? `API error ${res.status}`)
    return data.content?.[0]?.text ?? ''
  }

  // OpenAI-compatible (local Ollama or OpenRouter)
  const res = await fetch(s.localEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(s.localApiKey ? { Authorization: `Bearer ${s.localApiKey}` } : {}),
    },
    body: JSON.stringify({
      model:      s.localModel,
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
  maxTokens = 1024
): Promise<string> {
  const s = getSettings()
  if (!aiReady(s)) throw new Error('No AI configured')

  if (s.aiProvider === 'anthropic') {
    return streamRequest(
      '/api/ai',
      {},
      {
        provider:   'anthropic',
        model:      'claude-opus-4-5-20251101',
        max_tokens: maxTokens,
        system:     systemPrompt,
        messages,
        stream:     true,
      },
      onChunk,
      true // use apiFetch
    )
  }

  return streamRequest(
    s.localEndpoint,
    s.localApiKey ? { Authorization: `Bearer ${s.localApiKey}` } : {},
    {
      model:      s.localModel,
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
  return `You are Nexus AI — ${name}'s personal intelligence system, advisor, and motivator. You are direct, sharp, and versatile. You adapt to whatever ${name} needs: market analysis, goal coaching, skill building, research, trading signals, or anything else.${profile}`
}
