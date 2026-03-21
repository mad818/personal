'use client'

import { useStore } from '@/store/useStore'
import { timeAgo } from '@/lib/helpers'

// ── Bias scoring (same logic as NewsFeed) ─────────────────────────────────────
const BULLISH_KW = ['surge','rally','gain','soar','jump','rise','high','bull',
  'breakout','record','adoption','approve','launch','partnership','upgrade']
const BEARISH_KW = ['crash','drop','fall','plunge','decline','sell','bear','loss',
  'low','risk','hack','exploit','ban','fine','lawsuit','bankruptcy','attack']

function biasScore(text: string): number {
  const t = text.toLowerCase()
  const bull = BULLISH_KW.filter((k) => t.includes(k)).length
  const bear = BEARISH_KW.filter((k) => t.includes(k)).length
  if (bull === 0 && bear === 0) return 0
  return Math.max(-1, Math.min(1, (bull - bear) / Math.max(bull + bear, 1)))
}

function BiasBar({ score }: { score: number }) {
  const pct      = Math.round((score + 1) / 2 * 100)
  const dotColor = score > 0.1 ? '#10b981' : score < -0.1 ? '#ef4444' : '#6875a0'
  const label    = score > 0.1 ? 'Bullish' : score < -0.1 ? 'Bearish' : 'Neutral'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', minWidth: '120px' }}>
      <span style={{ fontSize: '9px', color: '#10b981', fontWeight: 700, flexShrink: 0 }}>B</span>
      <div style={{ position: 'relative', flex: 1, height: '4px', borderRadius: '2px', background: 'var(--surf3)' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '2px', background: 'linear-gradient(to right, #10b981, #6875a0, #ef4444)', opacity: 0.35 }} />
        <div style={{ position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)', left: `${pct}%`, width: '8px', height: '8px', borderRadius: '50%', background: dotColor, border: '2px solid var(--surf)', boxShadow: `0 0 5px ${dotColor}88` }} />
      </div>
      <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 700, flexShrink: 0 }}>S</span>
      <span style={{ fontSize: '9px', color: dotColor, fontWeight: 700, flexShrink: 0, minWidth: '38px' }}>{label}</span>
    </div>
  )
}

export default function SavedArticles() {
  const savedArticles     = useStore((s) => s.savedArticles)
  const toggleSaveArticle = useStore((s) => s.toggleSaveArticle)

  if (!savedArticles.length) return (
    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>🗂</div>
      No saved articles yet. Tap ☆ on any article in the SIGNALS tab to save it here.
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {savedArticles.map((a) => (
        <div key={a.id} style={{
          background: 'var(--surf2)', border: '1px solid var(--accent)',
          borderRadius: '10px', padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
            {a.src && (
              <span style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 700 }}>{a.src}</span>
            )}
            <span style={{ fontSize: '10px', color: 'var(--text3)', marginLeft: 'auto' }}>
              {timeAgo(a.date)}
            </span>
            <button
              onClick={() => toggleSaveArticle(a)}
              title="Remove from Vault"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: '13px', padding: '0 2px', color: 'var(--accent)',
              }}
            >
              🔖
            </button>
          </div>
          <a href={a.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
              {a.title}
            </div>
            {a.desc && (
              <div style={{ fontSize: '11.5px', color: 'var(--text2)', marginTop: '4px', lineHeight: 1.5 }}>
                {a.desc.slice(0, 180)}{a.desc.length > 180 ? '…' : ''}
              </div>
            )}
          </a>
          <BiasBar score={biasScore(a.title + ' ' + (a.desc ?? ''))} />
        </div>
      ))}
    </div>
  )
}
