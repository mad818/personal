'use client'

import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { timeAgo } from '@/lib/helpers'

// ── Bias scoring ──────────────────────────────────────────────────────────────
const BULLISH_KW = ['surge', 'rally', 'gain', 'soar', 'jump', 'rise', 'high', 'bull',
  'breakout', 'record', 'adoption', 'approve', 'launch', 'partnership', 'upgrade']
const BEARISH_KW = ['crash', 'drop', 'fall', 'plunge', 'decline', 'sell', 'bear', 'loss',
  'low', 'risk', 'hack', 'exploit', 'ban', 'fine', 'lawsuit', 'bankruptcy', 'attack']

/** Returns a score -1 (very bearish) → 0 (neutral) → +1 (very bullish) */
function biasScore(text: string): number {
  const t = text.toLowerCase()
  const bull = BULLISH_KW.filter((k) => t.includes(k)).length
  const bear = BEARISH_KW.filter((k) => t.includes(k)).length
  if (bull === 0 && bear === 0) return 0
  return Math.max(-1, Math.min(1, (bull - bear) / Math.max(bull + bear, 1)))
}

/** Bias bar — green left, gray center, red right, filled dot at score position */
function BiasBar({ score }: { score: number }) {
  // Map -1..+1 to 0..100%
  const pct = Math.round((score + 1) / 2 * 100)
  const dotColor = score > 0.1 ? '#10b981' : score < -0.1 ? '#ef4444' : '#6875a0'
  const label    = score > 0.1 ? 'Bullish' : score < -0.1 ? 'Bearish' : 'Neutral'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '120px' }}>
      <span style={{ fontSize: '9px', color: '#10b981', fontWeight: 700, flexShrink: 0 }}>B</span>
      <div style={{ position: 'relative', flex: 1, height: '4px', borderRadius: '2px', background: 'var(--surf3)' }}>
        {/* gradient track */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '2px',
          background: 'linear-gradient(to right, #10b981, #6875a0, #ef4444)',
          opacity: 0.35,
        }} />
        {/* dot */}
        <div style={{
          position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
          left: `${pct}%`, width: '8px', height: '8px', borderRadius: '50%',
          background: dotColor, border: '2px solid var(--surf)',
          boxShadow: `0 0 5px ${dotColor}88`,
        }} />
      </div>
      <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 700, flexShrink: 0 }}>S</span>
      <span style={{ fontSize: '9px', color: dotColor, fontWeight: 700, flexShrink: 0, minWidth: '38px' }}>
        {label}
      </span>
    </div>
  )
}

const CAT_LABELS: Record<string, string> = {
  all:     'All',
  crypto:  '₿ Crypto',
  markets: '📈 Markets',
  cyber:   '🔒 Cyber',
  tech:    '🔬 Tech',
  world:   '🌍 World',
}

export default function NewsFeed() {
  const articles          = useStore((s) => s.articles)
  const savedArticles     = useStore((s) => s.savedArticles)
  const toggleSaveArticle = useStore((s) => s.toggleSaveArticle)
  const [filter, setFilter] = useState('all')

  if (!articles.length) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
      <div style={{ fontSize: '28px', marginBottom: '10px' }}>📡</div>
      Fetching live intel…
    </div>
  )

  const savedIds  = new Set(savedArticles.map((a) => a.id))
  const cats      = ['all', ...Array.from(new Set(articles.map((a) => a.cat ?? 'crypto').filter(Boolean)))]
  const visible   = filter === 'all' ? articles : articles.filter((a) => a.cat === filter)

  return (
    <div>
      {/* Category filter bar */}
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            style={{
              height: '26px', padding: '0 10px', borderRadius: '6px',
              fontSize: '10.5px', fontWeight: 700, cursor: 'pointer',
              border: '1px solid var(--border2)',
              background: filter === c ? 'var(--accent)' : 'transparent',
              color: filter === c ? '#fff' : 'var(--text3)',
              transition: 'background .15s',
            }}
          >
            {CAT_LABELS[c] ?? c}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text3)', alignSelf: 'center' }}>
          {visible.length} articles
        </span>
      </div>

      {/* Article list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {visible.map((a) => {
          const isSaved = savedIds.has(a.id)
          const score   = biasScore(a.title + ' ' + (a.desc ?? ''))
          return (
            <div key={a.id} style={{
              background: 'var(--surf2)',
              border: `1px solid ${isSaved ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '10px', padding: '11px 13px',
            }}>
              {/* Meta row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px', flexWrap: 'wrap' }}>
                {a.src && (
                  <span style={{ fontSize: '10px', color: 'var(--text2)', fontWeight: 700 }}>{a.src}</span>
                )}
                {a.cat && a.cat !== 'crypto' && (
                  <span style={{
                    fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '8px',
                    background: 'var(--surf3)', color: 'var(--text3)',
                  }}>
                    {CAT_LABELS[a.cat] ?? a.cat}
                  </span>
                )}
                <span style={{ fontSize: '10px', color: 'var(--text3)', marginLeft: 'auto' }}>
                  {timeAgo(a.date)}
                </span>
                <button
                  onClick={() => toggleSaveArticle(a)}
                  title={isSaved ? 'Remove from Vault' : 'Save to Vault'}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: '13px', padding: '0 2px', lineHeight: 1,
                    color: isSaved ? 'var(--accent)' : 'var(--text3)',
                  }}
                >
                  {isSaved ? '🔖' : '☆'}
                </button>
              </div>

              {/* Headline */}
              <a href={a.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, marginBottom: '8px' }}>
                  {a.title}
                </div>
                {a.desc && (
                  <div style={{ fontSize: '11.5px', color: 'var(--text2)', marginBottom: '8px', lineHeight: 1.5 }}>
                    {a.desc.slice(0, 140)}{a.desc.length > 140 ? '…' : ''}
                  </div>
                )}
              </a>

              {/* Bias bar */}
              <BiasBar score={score} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
