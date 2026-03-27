'use client'

// ── ToolCallBadge.tsx ─────────────────────────────────────────────────────────
// Renders one step from an agent's tool-use trace as a collapsible badge.
// Three step types are handled:
//   thinking    — italicised dim text (R1 reasoning trace)
//   tool_call   — clickable pill showing tool name + skill label + expand arrow
//   tool_result — green tinted pill showing result (expands to show raw content)
// Used inside both the live step stream and the persisted message history.

import { useState } from 'react'
import type { AgentStep } from '@/lib/agent'
import { TOOL_ICON, SKILL_ROUTE } from './constants'

export function ToolCallBadge({ step }: { step: AgentStep }) {
  // Controls whether the tool input/result content is expanded or collapsed
  const [expanded, setExpanded] = useState(false)

  const icon  = TOOL_ICON[step.tool ?? ''] ?? '⚙️'   // emoji for this tool
  const label = step.tool?.replace(/_/g, ' ') ?? 'tool' // human-readable tool name

  // ── Thinking step — shown as dim italic text, not an interactive badge
  if (step.type === 'thinking') {
    return (
      <div style={{ fontSize: '11px', color: 'var(--text3)', fontStyle: 'italic', padding: '2px 0' }}>
        {step.content}
      </div>
    )
  }

  // ── Tool call step — collapsible pill with skill label badge
  if (step.type === 'tool_call') {
    const skill = SKILL_ROUTE[step.tool ?? '']  // look up the skill category for this tool
    return (
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--surf3)', border: '1px solid var(--border2)',
          borderRadius: '7px', padding: '5px 10px',
          cursor: 'pointer', fontSize: '11px', color: 'var(--text2)',
          fontWeight: 600, textAlign: 'left', width: '100%',
        }}
      >
        <span>{icon}</span>
        <span>Calling <b>{label}</b></span>

        {/* Skill category chip — e.g. ENGINEERING, RESEARCH, BROWSER */}
        {skill && (
          <span style={{
            fontSize: '7px', fontFamily: "'VT323', monospace",
            padding: '1px 5px', borderRadius: '3px',
            background: `${skill.color}14`,
            border: `1px solid ${skill.color}44`,
            color: skill.color, letterSpacing: '1px', flexShrink: 0,
          }}>
            {skill.label}
          </span>
        )}

        {/* Expand / collapse chevron */}
        <span style={{ marginLeft: 'auto', opacity: .6 }}>{expanded ? '▲' : '▼'}</span>

        {/* Hidden pre — only mounted when expanded; avoids unnecessary DOM nodes */}
        {expanded && (
          <pre style={{ display: 'none' }}>{step.content}</pre>
        )}
      </button>
    )
  }

  // ── Tool result step — green-tinted pill, expands to show raw content
  if (step.type === 'tool_result') {
    return (
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'flex', flexDirection: 'column', gap: '3px',
          background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.2)',
          borderRadius: '7px', padding: '5px 10px',
          cursor: 'pointer', fontSize: '11px', color: 'var(--text2)',
          textAlign: 'left', width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
          <span>✓</span>
          <span>{icon} {label} result</span>
          <span style={{ marginLeft: 'auto', opacity: .6 }}>{expanded ? '▲' : '▼'}</span>
        </div>

        {/* Expanded raw result content */}
        {expanded && (
          <pre style={{
            margin: '4px 0 0', padding: '6px 8px', borderRadius: '5px',
            background: 'var(--surf3)', fontSize: '10.5px', color: 'var(--text)',
            overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            maxHeight: '180px', overflowY: 'auto',
          }}>
            {step.content}
          </pre>
        )}
      </button>
    )
  }

  return null  // unknown step type — render nothing
}
