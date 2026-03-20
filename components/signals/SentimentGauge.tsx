'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { CHART } from '@/lib/chartTheme'

const POS_KW = ['rally','surge','bullish','gain','record','growth','breakthrough','soar','boom']
const NEG_KW = ['crash','plunge','bearish','hack','ban','war','attack','sanctions','collapse']

export default function SentimentGauge() {
  const articles = useStore((s) => s.articles)

  const { pos, neu, neg, total } = useMemo(() => {
    let pos = 0, neg = 0
    for (const a of articles) {
      const t = a.title.toLowerCase()
      const isPos = POS_KW.some((k) => t.includes(k))
      const isNeg = NEG_KW.some((k) => t.includes(k))
      if (isPos && !isNeg) pos++
      else if (isNeg && !isPos) neg++
    }
    const total = articles.length || 1
    const neu = total - pos - neg
    return { pos, neu: Math.max(neu, 0), neg, total }
  }, [articles])

  const pPct = Math.round((pos / total) * 100)
  const nPct = Math.round((neg / total) * 100)
  const uPct = 100 - pPct - nPct

  const segments = [
    { label: 'Positive', pct: pPct, count: pos,  color: CHART.emerald },
    { label: 'Neutral',  pct: uPct, count: neu,  color: CHART.gold    },
    { label: 'Negative', pct: nPct, count: neg,  color: CHART.red     },
  ]

  return (
    <div style={{
      background: CHART.surf,
      border: `1px solid ${CHART.border}`,
      borderRadius: '10px',
      padding: '14px 16px',
      marginBottom: '14px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: CHART.text2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Sentiment Analysis · {articles.length} articles
        </span>
        <div style={{ display: 'flex', gap: '12px' }}>
          {segments.map((s) => (
            <span key={s.label} style={{ fontSize: '10px', color: s.color, fontFamily: 'monospace' }}>
              {s.label}: {s.pct}%
            </span>
          ))}
        </div>
      </div>

      {/* Bar */}
      <div style={{ display: 'flex', height: '20px', borderRadius: '6px', overflow: 'hidden', background: CHART.surf3 }}>
        {segments.map((seg) => (
          <motion.div
            key={seg.label}
            initial={{ width: 0 }}
            animate={{ width: `${seg.pct}%` }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: seg.label === 'Neutral' ? 0.15 : seg.label === 'Negative' ? 0.3 : 0 }}
            style={{ background: seg.color, height: '100%', minWidth: seg.pct > 0 ? '2px' : '0' }}
            title={`${seg.label}: ${seg.pct}% (${seg.count})`}
          />
        ))}
      </div>

      {/* Labels below */}
      <div style={{ display: 'flex', marginTop: '6px', gap: '6px' }}>
        {segments.map((seg) => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: seg.color }} />
            <span style={{ fontSize: '10px', color: CHART.text3, fontFamily: 'monospace' }}>
              {seg.label} ({seg.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
