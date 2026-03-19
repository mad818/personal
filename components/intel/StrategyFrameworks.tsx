'use client'

import { useState, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/ai'

// ── Types ────────────────────────────────────────────────────────────────────
type Framework = 'porter' | 'vrio' | 'bcg' | 'jtbd'

// ── Porter 5 Forces ──────────────────────────────────────────────────────────
const PORTER_FORCES = [
  { key: 'rivalry',     label: 'Competitive Rivalry',       icon: '⚔️' },
  { key: 'newEntrants', label: 'Threat of New Entrants',    icon: '🚪' },
  { key: 'substitutes', label: 'Threat of Substitutes',     icon: '🔄' },
  { key: 'buyers',      label: 'Bargaining Power of Buyers',icon: '🛒' },
  { key: 'suppliers',   label: 'Bargaining Power of Suppliers', icon: '🏭' },
] as const

// ── VRIO ─────────────────────────────────────────────────────────────────────
const VRIO_DIMS = [
  { key: 'valuable',    label: 'Valuable',     desc: 'Does it exploit an opportunity or neutralise a threat?' },
  { key: 'rare',        label: 'Rare',         desc: 'Is it controlled by few firms?' },
  { key: 'imitable',    label: 'Hard to Imitate', desc: 'Is it costly or difficult to copy?' },
  { key: 'organized',   label: 'Organized',    desc: 'Is the firm set up to capture the value?' },
] as const

// ── BCG Matrix ───────────────────────────────────────────────────────────────
const BCG_QUADRANTS = [
  { key: 'star',        label: '⭐ Stars',        desc: 'High growth · High share',   color: '#10b981' },
  { key: 'cash',        label: '💰 Cash Cows',   desc: 'Low growth · High share',    color: '#4f6ef7' },
  { key: 'question',    label: '❓ Question Marks',desc: 'High growth · Low share',  color: '#f59e0b' },
  { key: 'dog',         label: '🐕 Dogs',         desc: 'Low growth · Low share',     color: '#ef4444' },
] as const

// ── Component ────────────────────────────────────────────────────────────────
export default function StrategyFrameworks() {
  const settings = useStore((s) => s.settings)
  const [active,  setActive]  = useState<Framework>('porter')
  const [company, setCompany] = useState('')
  const [aiOut,   setAiOut]   = useState('')
  const [loading, setLoading] = useState(false)

  // Porter state
  const [porterScores, setPorterScores] = useState<Record<string, number>>(
    Object.fromEntries(PORTER_FORCES.map((f) => [f.key, 3]))
  )
  // VRIO state
  const [vrioChecks, setVrioChecks] = useState<Record<string, boolean>>({})
  const [vrioResource, setVrioResource] = useState('')
  // BCG state
  const [bcgItems, setBcgItems] = useState<Record<string, string>>(
    Object.fromEntries(BCG_QUADRANTS.map((q) => [q.key, '']))
  )
  // JTBD state
  const [jtbdJob,   setJtbdJob]   = useState('')
  const [jtbdPain,  setJtbdPain]  = useState('')
  const [jtbdGain,  setJtbdGain]  = useState('')
  // ── AI analysis ──────────────────────────────────────────────────────────
  const analyse = useCallback(async () => {
    if (!settings.apiKey) {
      setAiOut('Add your API key in Settings to get AI analysis.')
      return
    }
    setLoading(true)
    setAiOut('')

    let prompt = ''
    const co = company || 'the company'

    if (active === 'porter') {
      const scores = PORTER_FORCES.map((f) => `${f.label}: ${porterScores[f.key]}/5`).join(', ')
      prompt = `Analyse the Porter 5 Forces for ${co}. Scores: ${scores}. Give a 3-sentence strategic insight and one concrete recommendation. Be direct.`
    } else if (active === 'vrio') {
      const dims = VRIO_DIMS.map((d) => `${d.label}: ${vrioChecks[d.key] ? 'Yes' : 'No'}`).join(', ')
      prompt = `VRIO analysis for the resource "${vrioResource || 'this resource'}" at ${co}. ${dims}. State the competitive implication (parity, temporary advantage, or sustained advantage) in 2 sentences, then give one action.`
    } else if (active === 'bcg') {
      const matrix = BCG_QUADRANTS.map((q) => `${q.label}: ${bcgItems[q.key] || 'empty'}`).join(' | ')
      prompt = `BCG Matrix for ${co}: ${matrix}. In 3 sentences: identify the highest-priority product/unit and give one capital allocation recommendation.`
    } else if (active === 'jtbd') {
      prompt = `Jobs-to-be-Done analysis. Job: "${jtbdJob}". Pain: "${jtbdPain}". Desired gain: "${jtbdGain}". In 3 sentences: define the core functional job and suggest one product or positioning improvement.`
    }

    try {
      const result = await callAI(prompt, 350)
      setAiOut(result)
    } catch {
      setAiOut('Could not get AI analysis. Check your API key in Settings.')
    } finally {
      setLoading(false)
    }
  }, [active, settings.apiKey, company, porterScores, vrioChecks, vrioResource, bcgItems, jtbdJob, jtbdPain, jtbdGain])

  // ── Render helpers ────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: 'var(--surf3)', border: '1px solid var(--border2)',
    borderRadius: '6px', color: 'var(--text)', fontSize: '12px',
    padding: '7px 10px', outline: 'none', width: '100%', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '10.5px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase',
  }

  return (
    <div style={{ marginTop: '20px' }}>
      {/* Header + company input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text)' }}>
          🧠 Strategy Frameworks
        </span>
        <input
          type="text"
          placeholder="Company / product name…"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          style={{ ...inputStyle, width: '180px', flex: 'none' }}
        />
      </div>

      {/* Framework tabs */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {(['porter', 'vrio', 'bcg', 'jtbd'] as Framework[]).map((f) => (
          <button key={f} onClick={() => { setActive(f); setAiOut('') }} style={{
            height: '26px', padding: '0 11px', borderRadius: '6px',
            fontSize: '10.5px', fontWeight: 700, cursor: 'pointer',
            border: '1px solid var(--border2)',
            background: active === f ? 'var(--accent)' : 'transparent',
            color: active === f ? '#fff' : 'var(--text3)',
          }}>
            {f === 'porter' ? 'Porter 5' : f === 'vrio' ? 'VRIO' : f === 'bcg' ? 'BCG Matrix' : 'JTBD'}
          </button>
        ))}
      </div>

      {/* ── Porter 5 Forces ── */}
      {active === 'porter' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {PORTER_FORCES.map((f) => (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '16px', width: '22px' }}>{f.icon}</span>
              <span style={{ fontSize: '12px', color: 'var(--text)', flex: 1 }}>{f.label}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setPorterScores((p) => ({ ...p, [f.key]: n }))}
                    style={{
                      width: '26px', height: '26px', borderRadius: '5px',
                      border: '1px solid var(--border2)', cursor: 'pointer',
                      fontSize: '11px', fontWeight: 700,
                      background: porterScores[f.key] >= n ? 'var(--accent)' : 'transparent',
                      color: porterScores[f.key] >= n ? '#fff' : 'var(--text3)',
                    }}
                  >{n}</button>
                ))}
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text3)', width: '40px', textAlign: 'right' }}>
                {porterScores[f.key] >= 4 ? 'High' : porterScores[f.key] <= 2 ? 'Low' : 'Med'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── VRIO ── */}
      {active === 'vrio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={labelStyle}>Resource or Capability</span>
            <input type="text" value={vrioResource} onChange={(e) => setVrioResource(e.target.value)}
              placeholder="e.g. proprietary data, brand, tech stack…" style={inputStyle} />
          </label>
          {VRIO_DIMS.map((d) => (
            <label key={d.key} style={{
              display: 'flex', alignItems: 'flex-start', gap: '8px',
              padding: '8px 10px', borderRadius: '7px',
              background: vrioChecks[d.key] ? 'rgba(79,110,247,.12)' : 'var(--surf3)',
              border: `1px solid ${vrioChecks[d.key] ? 'rgba(79,110,247,.3)' : 'transparent'}`,
              cursor: 'pointer',
            }}>
              <input type="checkbox" checked={!!vrioChecks[d.key]}
                onChange={() => setVrioChecks((p) => ({ ...p, [d.key]: !p[d.key] }))}
                style={{ marginTop: '2px', accentColor: 'var(--accent)' }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{d.label}</div>
                <div style={{ fontSize: '10.5px', color: 'var(--text3)' }}>{d.desc}</div>
              </div>
            </label>
          ))}
          {/* Implication badge */}
          <div style={{ padding: '8px 12px', borderRadius: '7px', background: 'var(--surf3)', fontSize: '12px', color: 'var(--text2)' }}>
            {
              VRIO_DIMS.every((d) => vrioChecks[d.key])
                ? '🏆 Sustained Competitive Advantage'
                : vrioChecks['valuable'] && vrioChecks['rare'] && vrioChecks['imitable']
                ? '⚡ Temporary Competitive Advantage'
                : vrioChecks['valuable']
                ? '✅ Competitive Parity'
                : '❌ Competitive Disadvantage'
            }
          </div>
        </div>
      )}

      {/* ── BCG Matrix ── */}
      {active === 'bcg' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {BCG_QUADRANTS.map((q) => (
            <div key={q.key} style={{
              padding: '10px 12px', borderRadius: '9px',
              background: 'var(--surf3)', border: `1px solid ${q.color}44`,
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: q.color, marginBottom: '2px' }}>{q.label}</div>
              <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: '6px' }}>{q.desc}</div>
              <textarea
                value={bcgItems[q.key]}
                onChange={(e) => setBcgItems((p) => ({ ...p, [q.key]: e.target.value }))}
                placeholder="List products or units…"
                rows={2}
                style={{ ...inputStyle, resize: 'none', fontSize: '11px' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── JTBD ── */}
      {active === 'jtbd' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={labelStyle}>Job to Be Done</span>
            <input type="text" value={jtbdJob} onChange={(e) => setJtbdJob(e.target.value)}
              placeholder="When I…, I want to…, so I can…" style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={labelStyle}>Core Pain</span>
            <input type="text" value={jtbdPain} onChange={(e) => setJtbdPain(e.target.value)}
              placeholder="What frustration or obstacle exists today?" style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={labelStyle}>Desired Outcome / Gain</span>
            <input type="text" value={jtbdGain} onChange={(e) => setJtbdGain(e.target.value)}
              placeholder="What does success look like?" style={inputStyle} />
          </label>
        </div>
      )}

      {/* AI analyse button */}
      <button
        onClick={analyse}
        disabled={loading}
        style={{
          marginTop: '14px', width: '100%', height: '32px', borderRadius: '7px',
          background: 'var(--accent)', border: 'none',
          color: '#fff', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Analysing…' : '🧠 AI Analysis'}
      </button>

      {aiOut && (
        <div style={{
          marginTop: '12px', padding: '12px 14px',
          background: 'var(--surf3)', borderRadius: '8px',
          fontSize: '12px', color: 'var(--text)', lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
        }}>
          {aiOut}
        </div>
      )}
    </div>
  )
}
