'use client'

import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/ai'

export default function AIBriefing() {
  const settings = useStore((s) => s.settings)
  const articles = useStore((s) => s.articles)
  const prices   = useStore((s) => s.prices)
  const signals  = useStore((s) => s.signals)

  const [output,  setOutput]  = useState('')
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    setOutput('')
    const btc  = prices['bitcoin']
    const fg   = signals?.fg
    const tops = articles.slice(0, 8).map((a, i) => `${i + 1}. ${a.title}`).join('\n')
    const prompt = `You are Nexus AI — ${settings.userName || 'Mario'}'s intelligence system.

LIVE DATA:
- BTC: ${btc ? `$${btc.price?.toLocaleString()} (${btc.chg >= 0 ? '+' : ''}${btc.chg?.toFixed(2)}%)` : 'No data'}
- Fear & Greed: ${fg?.value ?? '—'} — ${fg?.label ?? '—'}

TOP HEADLINES:
${tops || 'No articles loaded.'}

Write a sharp intelligence briefing covering:
1. Market state & what it means
2. Key risk or opportunity in the news
3. One action to consider
4. One thing to watch

Under 250 words. Direct and specific.`

    try {
      const resp = await callAI(prompt, 500)
      setOutput(resp)
    } catch {
      setOutput('Could not generate briefing. Check your API key.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--text3)' }}>
          🧠 AI Superset Briefing
        </span>
        <button onClick={generate} disabled={loading} style={{
          height: '28px', padding: '0 12px', background: 'var(--accent)', border: 'none',
          borderRadius: '6px', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
        }}>
          {loading ? 'Generating…' : '✦ Full Intel Brief'}
        </button>
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7, minHeight: '40px', whiteSpace: 'pre-wrap' }}>
        {output || 'Hit Generate Briefing to get a synthesis across market signals, world risk, news, and alerts.'}
      </div>
    </div>
  )
}
