'use client'

import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/ai'

export default function FocusPanel() {
  const settings = useStore((s) => s.settings)
  const prices   = useStore((s) => s.prices)
  const signals  = useStore((s) => s.signals)

  const [output,  setOutput]  = useState('')
  const [loading, setLoading] = useState(false)

  const goals    = settings.userGoals?.trim()
  const skills   = settings.userSkills?.trim()
  const learning = settings.userLearning?.trim()
  const name     = settings.userName || 'Mario'

  const tags = [
    ...(goals    ? goals.split('\n').filter(Boolean).map((g) => ({ icon: '🎯', text: g.slice(0, 60) })) : []),
    ...(skills   ? skills.split('\n').filter(Boolean).map((s) => ({ icon: '⚡', text: s.slice(0, 50) })) : []),
    ...(learning ? learning.split('\n').filter(Boolean).map((l) => ({ icon: '📚', text: l.slice(0, 50) })) : []),
  ].slice(0, 6)

  async function generate() {
    if (!settings.apiKey && !settings.localModel) return
    setLoading(true)
    setOutput('')
    const btc    = prices['bitcoin']
    const fg     = signals?.fg?.label
    const mkt    = btc ? `BTC is ${btc.chg >= 0 ? 'up' : 'down'} ${Math.abs(btc.chg).toFixed(1)}% today. Fear & Greed: ${fg ?? '—'}.` : ''
    const prompt = `You are ${name}'s personal action coach.

PROFILE:
- Goals: ${goals || 'Not set'}
- Skills: ${skills || 'Not set'}
- Learning: ${learning || 'Not set'}
${mkt ? `\nMARKET: ${mkt}` : ''}

Write a tight daily action plan:
1. ONE highest-leverage task today
2. ONE skill activity (30-60 min)
3. ONE thing to watch in live data
4. ONE thing to stop wasting time on

Direct, personal, under 200 words.`

    try {
      const resp = await callAI(prompt, 400)
      setOutput(resp)
    } catch {
      setOutput('Could not generate plan. Check your API key.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--text3)' }}>
          🎯 Your Focus Today
        </span>
        <button onClick={generate} disabled={loading} style={{
          height: '28px', padding: '0 12px', background: 'var(--accent)', border: 'none',
          borderRadius: '6px', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
        }}>
          {loading ? 'Planning…' : '✦ Generate Action Plan'}
        </button>
      </div>

      {tags.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: output ? '10px' : 0 }}>
          {tags.map((t, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '3px 10px', borderRadius: '99px',
              background: 'var(--surf3)', border: '1px solid var(--border2)',
              fontSize: '11px', color: 'var(--text2)',
            }}>
              {t.icon} {t.text}
            </span>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: '11.5px', color: 'var(--text3)', fontStyle: 'italic' }}>
          Open ⚙ Settings → Personal Profile to set your goals.
        </p>
      )}

      {output && (
        <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7, marginTop: '10px', whiteSpace: 'pre-wrap' }}>
          {output}
        </div>
      )}
    </div>
  )
}
