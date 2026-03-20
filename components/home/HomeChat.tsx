'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { buildSystemPrompt } from '@/lib/ai'
import { runAgent, type AgentStep } from '@/lib/agent'
import HomeAmbient from './HomeAmbient'

const QUICK_CHIPS = [
  { label: '📊 Market Pulse',       prompt: 'Search for the latest crypto and macro market news right now and give me a sharp pulse.' },
  { label: '⚡ Top Priority Today', prompt: 'Based on my goals, what is my single highest-leverage action today? Be specific.' },
  { label: '🔍 Hidden Opportunity', prompt: 'Search for a market or business opportunity most people are missing right now.' },
  { label: '📝 Research Note',      prompt: 'Search for the top 3 AI agent tools in 2026 and save a summary to research-notes.md.' },
  { label: '🌐 Intel Brief',        prompt: 'Run a full intelligence briefing — search markets, world events, and key risks. Save to intel-brief.md.' },
]

// ── Message types ─────────────────────────────────────────────────────────────
interface UserMsg { type: 'user'; text: string }
interface AiMsg   { type: 'ai';  text: string; steps?: AgentStep[] }
type ChatMsg = UserMsg | AiMsg

// ── Tool step icons ───────────────────────────────────────────────────────────
const TOOL_ICON: Record<string, string> = {
  web_search: '🔍', fetch_url: '🌐', write_file: '💾',
  draft_file: '📝', read_file: '📂', list_files: '📋', calculate: '🧮',
}

// ── Mode badge ────────────────────────────────────────────────────────────────
function ModeBadge({ mode, hasDrafts, onResetMode }: {
  mode:         string
  hasDrafts:    boolean
  onResetMode:  () => void
}) {
  if (mode === 'auto') return null

  const isLocal = mode === 'local'
  const color   = isLocal ? '#f59e0b' : '#10b981'
  const label   = isLocal ? '⚠️ DRAFT MODE — Ollama active' : '✅ Claude active'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '6px 12px', borderRadius: '8px',
      background: `${color}18`, border: `1px solid ${color}44`,
      fontSize: '11px', color,
    }}>
      <span style={{ fontWeight: 700 }}>{label}</span>
      {isLocal && hasDrafts && (
        <span style={{ opacity: .7 }}>• pending drafts queued</span>
      )}
      {isLocal && (
        <button
          onClick={onResetMode}
          title="Try Claude again"
          style={{
            marginLeft: 'auto', background: 'transparent', border: 'none',
            cursor: 'pointer', color, fontSize: '11px', fontWeight: 700,
          }}
        >
          ↺ Try Claude
        </button>
      )}
    </div>
  )
}

// ── Pending drafts panel ──────────────────────────────────────────────────────
function DraftsPanel() {
  const pendingDrafts      = useStore((s) => s.pendingDrafts)
  const updateDraftStatus  = useStore((s) => s.updateDraftStatus)
  const clearFinalized     = useStore((s) => s.clearFinalizedDrafts)
  const settings           = useStore((s) => s.settings)
  const [expanded, setExpanded] = useState(false)

  const pending   = pendingDrafts.filter((d) => d.status === 'pending')
  const finalized = pendingDrafts.filter((d) => d.status === 'finalized')

  if (!pendingDrafts.length) return null

  async function finalizeDraft(id: string, filename: string, content: string) {
    if (!settings.apiKey) {
      alert('Add your Claude API key in Settings first.')
      return
    }
    try {
      await fetch('/api/tools', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tool: 'write_file', input: { filename, content } }),
      })
      updateDraftStatus(id, 'finalized')
    } catch {
      alert('Failed to write file. Check your workspace.')
    }
  }

  function dismissDraft(id: string) {
    updateDraftStatus(id, 'dismissed')
  }

  return (
    <div style={{
      borderRadius: '10px', border: '1px solid #f59e0b44',
      background: '#f59e0b08', marginBottom: '8px', overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px', background: 'transparent', border: 'none',
          cursor: 'pointer', fontSize: '11.5px', color: '#f59e0b', fontWeight: 700,
          textAlign: 'left',
        }}
      >
        <span>📝 {pending.length} pending draft{pending.length !== 1 ? 's' : ''}</span>
        {finalized.length > 0 && (
          <span style={{ fontSize: '10px', opacity: .6 }}>• {finalized.length} finalized</span>
        )}
        <span style={{ marginLeft: 'auto' }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {pending.map((d) => (
            <div key={d.id} style={{
              padding: '8px 10px', borderRadius: '8px',
              background: 'var(--surf2)', border: '1px solid var(--border)',
              fontSize: '11px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>💾 {d.filename}</span>
                <span style={{ color: 'var(--text3)', marginLeft: 'auto' }}>via {d.model}</span>
              </div>
              <div style={{ color: 'var(--text2)', marginBottom: '6px', lineHeight: 1.4 }}>
                {d.content.slice(0, 120)}{d.content.length > 120 ? '…' : ''}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => finalizeDraft(d.id, d.filename, d.content)}
                  style={{
                    padding: '3px 8px', borderRadius: '6px', fontSize: '10px',
                    fontWeight: 700, border: 'none', cursor: 'pointer',
                    background: 'var(--accent)', color: '#fff',
                  }}
                >
                  Finalize with Claude
                </button>
                <button
                  onClick={() => dismissDraft(d.id)}
                  style={{
                    padding: '3px 8px', borderRadius: '6px', fontSize: '10px',
                    border: '1px solid var(--border2)', cursor: 'pointer',
                    background: 'transparent', color: 'var(--text3)',
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}

          {finalized.length > 0 && (
            <button
              onClick={clearFinalized}
              style={{
                padding: '4px 8px', borderRadius: '6px', fontSize: '10px',
                border: '1px solid var(--border2)', cursor: 'pointer',
                background: 'transparent', color: 'var(--text3)', alignSelf: 'flex-start',
              }}
            >
              Clear {finalized.length} finalized
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tool step badge ───────────────────────────────────────────────────────────
function ToolCallBadge({ step }: { step: AgentStep }) {
  const [expanded, setExpanded] = useState(false)
  const icon  = TOOL_ICON[step.tool ?? ''] ?? '⚙️'
  const label = step.tool?.replace(/_/g, ' ') ?? 'tool'

  if (step.type === 'thinking') {
    return (
      <div style={{ fontSize: '11px', color: 'var(--text3)', fontStyle: 'italic', padding: '2px 0' }}>
        {step.content}
      </div>
    )
  }

  if (step.type === 'tool_call') {
    return (
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--surf3)', border: '1px solid var(--border2)',
          borderRadius: '7px', padding: '5px 10px', cursor: 'pointer',
          fontSize: '11px', color: 'var(--text2)', fontWeight: 600,
          textAlign: 'left', width: '100%',
        }}
      >
        <span>{icon}</span>
        <span>Calling <b>{label}</b></span>
        <span style={{ marginLeft: 'auto', opacity: .6 }}>{expanded ? '▲' : '▼'}</span>
        {expanded && (
          <pre style={{ position: 'absolute', display: 'none' }}>{step.content}</pre>
        )}
      </button>
    )
  }

  if (step.type === 'tool_result') {
    return (
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex', flexDirection: 'column', gap: '3px',
          background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.2)',
          borderRadius: '7px', padding: '5px 10px', cursor: 'pointer',
          fontSize: '11px', color: 'var(--text2)', textAlign: 'left', width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
          <span>✓</span>
          <span>{icon} {label} result</span>
          <span style={{ marginLeft: 'auto', opacity: .6 }}>{expanded ? '▲' : '▼'}</span>
        </div>
        {expanded && (
          <pre style={{
            margin: '4px 0 0', padding: '6px 8px', borderRadius: '5px',
            background: 'var(--surf3)', fontSize: '10.5px', color: 'var(--text)',
            overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            maxHeight: '200px', overflowY: 'auto',
          }}>
            {step.content}
          </pre>
        )}
      </button>
    )
  }

  return null
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HomeChat() {
  const settings       = useStore((s) => s.settings)
  const chatHistory    = useStore((s) => s.chatHistory)
  const addMsg         = useStore((s) => s.addChatMessage)
  const aiMode         = useStore((s) => s.aiMode)
  const setAIMode      = useStore((s) => s.setAIMode)
  const pendingDrafts  = useStore((s) => s.pendingDrafts)

  const [messages,  setMessages]  = useState<ChatMsg[]>([])
  const [liveSteps, setLiveSteps] = useState<AgentStep[]>([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const msgsRef  = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const hour  = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const name  = settings.userName || 'Mario'
  const hasProfile = settings.userGoals || settings.userSkills || settings.userLearning

  const hasPendingDrafts = pendingDrafts.some((d) => d.status === 'pending')

  useEffect(() => {
    msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, liveSteps])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    setInput('')
    setLiveSteps([])

    setMessages((m) => [...m, { type: 'user', text } as UserMsg])
    addMsg({ role: 'user', content: text })
    setLoading(true)
    setMessages((m) => [...m, { type: 'ai', text: '', steps: [] } as AiMsg])

    const steps: AgentStep[] = []

    try {
      const history = [
        ...chatHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: text },
      ]

      const answer = await runAgent({
        settings,
        systemPrompt: buildSystemPrompt(settings),
        messages:     history,
        onStep: (step) => {
          steps.push(step)
          setLiveSteps([...steps])
          setMessages((m) => {
            const updated = [...m]
            const last    = updated[updated.length - 1] as AiMsg
            if (last?.type === 'ai') {
              updated[updated.length - 1] = {
                ...last,
                text:  step.type === 'answer' ? step.content : last.text,
                steps: [...steps],
              }
            }
            return updated
          })
        },
      })

      setMessages((m) => {
        const updated = [...m]
        const last    = updated[updated.length - 1] as AiMsg
        if (last?.type === 'ai') {
          updated[updated.length - 1] = { type: 'ai', text: answer, steps: [...steps] }
        }
        return updated
      })
      addMsg({ role: 'assistant', content: answer })
    } catch {
      setMessages((m) => {
        const updated = [...m]
        const last    = updated[updated.length - 1] as AiMsg
        if (last?.type === 'ai') {
          updated[updated.length - 1] = {
            type: 'ai',
            text: 'Something went wrong. Check your API key in Settings or make sure Ollama is running (ollama serve).',
            steps,
          }
        }
        return updated
      })
    } finally {
      setLoading(false)
      setLiveSteps([])
    }
  }, [loading, settings, chatHistory, addMsg])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 48px)', maxWidth: '900px', margin: '0 auto', padding: '0 16px',
    }}>
      {/* Welcome */}
      <div style={{ padding: '24px 0 8px', flexShrink: 0 }}>
        <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-.4px' }}>
          {greet}, {name} 👋
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--text2)', marginTop: '3px' }}>
          {hasProfile
            ? 'Agent mode — I can search, research, write files, and reason step by step.'
            : 'Agent mode active. Open Settings ⚙ to add your profile for personalised responses.'}
        </div>
      </div>

      {/* Mode badge */}
      <div style={{ marginBottom: '8px', flexShrink: 0 }}>
        <ModeBadge
          mode={aiMode}
          hasDrafts={hasPendingDrafts}
          onResetMode={() => setAIMode('auto')}
        />
      </div>

      {/* Pending drafts panel */}
      <div style={{ flexShrink: 0 }}>
        <DraftsPanel />
      </div>

      {/* Quick chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', flexShrink: 0 }}>
        {QUICK_CHIPS.map((c) => (
          <button key={c.label} onClick={() => send(c.prompt)} disabled={loading} style={{
            padding: '5px 12px', borderRadius: '99px', fontSize: '11.5px', fontWeight: 600,
            border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text2)',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
          }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={msgsRef} style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        gap: '12px', padding: '4px 0 12px',
      }}>
        {messages.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: '8px',
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden',
              border: '2px solid rgba(196,72,90,0.3)',
              boxShadow: '0 0 30px rgba(196,72,90,.15)',
            }}>
              <img src="/theme/sadie-armani.jpg" alt="" style={{
                width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 15%',
              }} />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--blush, #e8a0aa)' }}>Nexus Agent — Ready</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', textAlign: 'center', maxWidth: '340px' }}>
              Give me a task. I can search the web, read URLs, write files, and reason across multiple steps to get it done.
            </div>
            <HomeAmbient />
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {m.type === 'user' && (
              <div style={{
                alignSelf: 'flex-end', maxWidth: '78%',
                padding: '10px 14px', borderRadius: '12px',
                background: 'var(--accent)', color: '#fff',
                fontSize: '13px', lineHeight: 1.6,
              }}>
                {m.text}
              </div>
            )}

            {m.type === 'ai' && (
              <div style={{ alignSelf: 'flex-start', maxWidth: '88%', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {/* Tool steps */}
                {(m.steps ?? [])
                  .filter((s) => s.type !== 'answer')
                  .map((step, si) => <ToolCallBadge key={si} step={step} />)}

                {/* Answer bubble */}
                {(m.text || (loading && i === messages.length - 1)) && (
                  <div style={{
                    padding: '10px 14px', borderRadius: '12px',
                    background: 'var(--surf2)', border: '1px solid var(--border)',
                    fontSize: '13px', lineHeight: 1.65, color: 'var(--text)',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {m.text || <span style={{ opacity: .4 }}>●●●</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && liveSteps.length === 0 && (
          <div style={{ alignSelf: 'flex-start', fontSize: '11px', color: 'var(--text3)', fontStyle: 'italic' }}>
            Agent thinking…
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: '10px 0 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
            placeholder="Give me a task… search, research, write a file, analyse (Enter to send)"
            rows={2}
            style={{
              flex: 1, minHeight: '46px', maxHeight: '140px', padding: '12px 14px',
              borderRadius: '12px', border: '1px solid var(--border2)',
              background: 'var(--surf2)', color: 'var(--text)', fontSize: '13px',
              resize: 'none', outline: 'none', lineHeight: 1.5,
            }}
          />
          <button onClick={() => send(input)} disabled={loading} style={{
            width: '46px', height: '46px', borderRadius: '12px', border: 'none',
            background: loading ? 'var(--surf3)' : 'linear-gradient(135deg, #c4485a, #d4956a)',
            color: '#fff', fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer', flexShrink: 0,
          }}>
            {loading ? '⏳' : '➤'}
          </button>
        </div>
        <div style={{ fontSize: '10.5px', color: 'var(--text3)', textAlign: 'center', marginTop: '6px' }}>
          {aiMode === 'local'
            ? '⚠️ Draft mode — Ollama active · file writes queued · Claude will finalize'
            : 'Agent · web search · file ops · Ollama fallback · Claude API'}
        </div>
      </div>
    </div>
  )
}
