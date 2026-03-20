'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { CHART } from '@/lib/chartTheme'

const STOP = new Set([
  'the','a','an','to','of','in','for','and','is','on','at','by','with',
  'as','from','that','this','are','was','were','be','has','have','had',
  'its','it','or','but','not','will','can','all','after','over','new',
  'says','say','us','amid','amid','into','up','about','over','how','what',
  'why','when','who','more','than','could','would','about','amid','amid',
  'reuters','bloomberg','report','reports','sources','data','amid',
])

function extractKeywords(articles: { title: string }[]) {
  const freq: Record<string, number> = {}
  for (const a of articles) {
    const words = a.title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    for (const w of words) {
      if (w.length < 3 || STOP.has(w)) continue
      freq[w] = (freq[w] || 0) + 1
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }))
}

const FALLBACK_WORDS = [
  { word: 'bitcoin', count: 14 }, { word: 'crypto', count: 12 },
  { word: 'market', count: 11 }, { word: 'federal', count: 9 },
  { word: 'reserve', count: 9 }, { word: 'inflation', count: 8 },
  { word: 'ethereum', count: 7 }, { word: 'stock', count: 7 },
  { word: 'gdp', count: 6 }, { word: 'china', count: 6 },
  { word: 'hack', count: 5 }, { word: 'tech', count: 5 },
  { word: 'ai', count: 5 }, { word: 'dollar', count: 4 },
  { word: 'oil', count: 4 }, { word: 'gold', count: 4 },
  { word: 'rate', count: 3 }, { word: 'bank', count: 3 },
  { word: 'cyber', count: 3 }, { word: 'rally', count: 3 },
]

function tagColor(freq: number, max: number): string {
  const ratio = freq / max
  if (ratio > 0.7) return CHART.rose
  if (ratio > 0.4) return CHART.gold
  return CHART.blush
}

function tagSize(freq: number, max: number): number {
  const ratio = freq / max
  return Math.round(10 + ratio * 10)
}

export default function TrendingTopics() {
  const articles = useStore((s) => s.articles)

  const keywords = useMemo(() => {
    const kw = extractKeywords(articles)
    return kw.length >= 5 ? kw : FALLBACK_WORDS
  }, [articles])

  const max = keywords[0]?.count ?? 1

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.04 } },
  }
  const item = {
    hidden: { opacity: 0, scale: 0.7 },
    show:   { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } },
  }

  return (
    <div style={{
      background: CHART.surf,
      border: `1px solid ${CHART.border}`,
      borderRadius: '10px',
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: CHART.text2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
        Trending Topics
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', minHeight: '120px', alignContent: 'flex-start' }}
      >
        {keywords.map(({ word, count }) => (
          <motion.span
            key={word}
            variants={item}
            style={{
              fontSize: `${tagSize(count, max)}px`,
              color: tagColor(count, max),
              background: `${tagColor(count, max)}18`,
              border: `1px solid ${tagColor(count, max)}44`,
              borderRadius: '5px',
              padding: '2px 7px',
              fontFamily: 'monospace',
              fontWeight: count / max > 0.5 ? 700 : 500,
              cursor: 'default',
              lineHeight: 1.4,
            }}
            title={`${word}: ${count} mentions`}
          >
            {word}
          </motion.span>
        ))}
      </motion.div>
    </div>
  )
}
