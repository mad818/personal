'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { CHART } from '@/lib/chartTheme'
import { timeAgo } from '@/lib/helpers'
import type { Article } from '@/store/useStore'
import type { VaultFilter } from './VaultSearch'

// ── Bias scoring ────────────────────────────────────────────────────────────
const BULLISH_KW = ['surge','rally','gain','soar','jump','rise','high','bull',
  'breakout','record','adoption','approve','launch','partnership','upgrade']
const BEARISH_KW = ['crash','drop','fall','plunge','decline','sell','bear','loss',
  'low','risk','hack','exploit','ban','fine','lawsuit','bankruptcy','attack']

function biasScore(text: string): number {
  const t    = text.toLowerCase()
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
      <span style={{ fontSize: '9px', color: '#10b981', fontWeight: 700 }}>B</span>
      <div style={{ position: 'relative', flex: 1, height: '3px', borderRadius: '2px', background: 'var(--surf3)' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '2px', background: 'linear-gradient(to right, #10b981, #6875a0, #ef4444)', opacity: 0.3 }} />
        <div style={{ position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)', left: `${pct}%`, width: '7px', height: '7px', borderRadius: '50%', background: dotColor, border: '2px solid var(--surf)', boxShadow: `0 0 4px ${dotColor}88` }} />
      </div>
      <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 700 }}>S</span>
      <span style={{ fontSize: '9px', color: dotColor, fontWeight: 700, minWidth: '38px' }}>{label}</span>
    </div>
  )
}

// ── Category tag colors ─────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  crypto:  CHART.gold,
  markets: CHART.teal,
  cyber:   CHART.rose,
  world:   CHART.violet,
  tech:    CHART.sky,
  intel:   CHART.rose,
  alerts:  CHART.amber,
}

function catLabel(cat?: string): string {
  if (!cat) return 'UNCATEGORIZED'
  return cat.toUpperCase()
}

// ── Category mapping for filtering ─────────────────────────────────────────
const CATEGORY_MAP: Record<string, string[]> = {
  All:      [],
  News:     ['world', 'tech', 'news'],
  Intel:    ['cyber', 'intel'],
  Research: ['markets', 'crypto', 'research'],
  Alerts:   ['alerts'],
}

interface SavedArticlesProps {
  filter?: VaultFilter
}

function filterAndSort(articles: Article[], filter?: VaultFilter): Article[] {
  let result = [...articles]

  if (filter?.query) {
    const q = filter.query.toLowerCase()
    result = result.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.desc ?? '').toLowerCase().includes(q) ||
        (a.src  ?? '').toLowerCase().includes(q)
    )
  }

  if (filter?.category && filter.category !== 'All') {
    const keys = CATEGORY_MAP[filter.category] ?? []
    result = result.filter((a) => keys.includes(a.cat ?? ''))
  }

  if (filter?.sort === 'Oldest') {
    result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  } else if (filter?.sort === 'Alphabetical') {
    result.sort((a, b) => a.title.localeCompare(b.title))
  }
  // Default: Newest (store already newest-first)

  return result
}

// ── Article card ────────────────────────────────────────────────────────────
function ArticleCard({
  article,
  index,
  onRemove,
}: {
  article: Article
  index:   number
  onRemove: (a: Article) => void
}) {
  const score    = biasScore(article.title + ' ' + (article.desc ?? ''))
  const catColor = CAT_COLORS[article.cat ?? ''] ?? CHART.text3

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      style={{
        background:   CHART.surf2,
        border:       `1px solid ${CHART.border2}`,
        borderRadius: '12px',
        padding:      '14px 16px',
        position:     'relative',
        overflow:     'hidden',
      }}
    >
      {/* Colored left accent bar */}
      <div style={{
        position:     'absolute',
        left:         0,
        top:          0,
        bottom:       0,
        width:        '3px',
        background:   catColor,
        borderRadius: '12px 0 0 12px',
        opacity:      0.7,
      }} />

      {/* Header row */}
      <div style={{
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'space-between',
        gap:            '8px',
        marginBottom:   '8px',
        paddingLeft:    '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
          {/* Category tag */}
          <span style={{
            background:   `${catColor}22`,
            border:       `1px solid ${catColor}44`,
            borderRadius: '4px',
            padding:      '1px 6px',
            fontSize:     '9px',
            fontWeight:   700,
            color:        catColor,
            fontFamily:   'monospace',
            letterSpacing: '0.5px',
          }}>
            {catLabel(article.cat)}
          </span>
          {/* Source */}
          {article.src && (
            <span style={{ fontSize: '10px', color: CHART.text3, fontWeight: 600 }}>
              {article.src}
            </span>
          )}
          {/* Date */}
          <span style={{ fontSize: '10px', color: CHART.text3, marginLeft: 'auto' }}>
            {timeAgo(article.date)}
          </span>
        </div>

        {/* Remove/bookmark button */}
        <button
          onClick={() => onRemove(article)}
          title="Remove from Vault"
          style={{
            background:   'transparent',
            border:       'none',
            cursor:       'pointer',
            fontSize:     '13px',
            padding:      '0 2px',
            color:        CHART.rose,
            flexShrink:   0,
            lineHeight:   1,
          }}
        >
          🔖
        </button>
      </div>

      {/* Title + description */}
      <a
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none', paddingLeft: '8px', display: 'block' }}
      >
        <div style={{
          fontSize:   '13px',
          fontWeight: 700,
          color:      CHART.text,
          lineHeight: 1.45,
          marginBottom: article.desc ? '6px' : 0,
        }}>
          {article.title}
        </div>
        {article.desc && (
          <div style={{
            fontSize:   '11.5px',
            color:      CHART.text2,
            lineHeight: 1.5,
          }}>
            {article.desc.slice(0, 200)}{article.desc.length > 200 ? '…' : ''}
          </div>
        )}
      </a>

      <div style={{ paddingLeft: '8px' }}>
        <BiasBar score={score} />
      </div>
    </motion.div>
  )
}

// ── Empty state ─────────────────────────────────────────────────────────────
function EmptyState({ isFiltered }: { isFiltered: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        padding:   '60px 20px',
        textAlign: 'center',
        color:     CHART.text3,
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>
        {isFiltered ? '🔍' : '🗂'}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: CHART.text2, marginBottom: '8px' }}>
        {isFiltered ? 'No articles match your search' : 'Your vault is empty'}
      </div>
      <div style={{ fontSize: '12px', color: CHART.text3, lineHeight: 1.6 }}>
        {isFiltered
          ? 'Try adjusting your filters or search query.'
          : 'Save articles from the News tab by tapping ☆ — they\'ll appear here.'}
      </div>
      {!isFiltered && (
        <div style={{
          marginTop:    '24px',
          display:      'inline-flex',
          alignItems:   'center',
          gap:          '6px',
          background:   `${CHART.rose}15`,
          border:       `1px solid ${CHART.rose}33`,
          borderRadius: '8px',
          padding:      '8px 16px',
          fontSize:     '11px',
          color:        CHART.rose,
          fontFamily:   'monospace',
        }}>
          <span>→</span> Go to SIGNALS to discover articles
        </div>
      )}
    </motion.div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function SavedArticles({ filter }: SavedArticlesProps) {
  const savedArticles     = useStore((s) => s.savedArticles)
  const toggleSaveArticle = useStore((s) => s.toggleSaveArticle)

  const displayed = useMemo(
    () => filterAndSort(savedArticles, filter),
    [savedArticles, filter]
  )

  const isFiltered = !!(filter?.query || (filter?.category && filter.category !== 'All'))

  return (
    <div>
      {/* Article count */}
      {savedArticles.length > 0 && (
        <div style={{
          fontSize:     '10px',
          color:        CHART.text3,
          fontFamily:   'monospace',
          marginBottom: '10px',
        }}>
          {displayed.length} of {savedArticles.length} article{savedArticles.length !== 1 ? 's' : ''}
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {displayed.length === 0 ? (
          <EmptyState key="empty" isFiltered={isFiltered} />
        ) : (
          <motion.div
            key="list"
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {displayed.map((a, i) => (
              <ArticleCard
                key={a.id}
                article={a}
                index={i}
                onRemove={toggleSaveArticle}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
