'use client'

// ── WorldTopicHeatmap.tsx ──────────────────────────────────────────────────────
// Geopolitical articles displayed as a heat grid.
// Six topic cells — intensity driven by article volume.
// Click any cell → slide panel with full article list.

import { useState, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { timeAgo }  from '@/lib/helpers'
import type { Article } from '@/store/useStore'

// ── Topic config ──────────────────────────────────────────────────────────────
interface TopicConfig {
  key:      string
  label:    string
  icon:     string
  hue:      string
  keywords: string[]
}

const WORLD_TOPICS: TopicConfig[] = [
  {
    key: 'conflict', label: 'War / Conflict', icon: '⚔️', hue: '#ef4444',
    keywords: ['war','conflict','battle','military','troops','attack','assault','missile','airstrike','invasion','offensive','drone','strike','casualties','fighting','forces','army','navy','soldier','bomb','weapon'],
  },
  {
    key: 'sanctions', label: 'Sanctions / Trade', icon: '💰', hue: '#f59e0b',
    keywords: ['sanction','tariff','embargo','ban','trade war','export','import','restriction','economic','penalty','blocked','seized','freeze','asset'],
  },
  {
    key: 'energy', label: 'Energy', icon: '⚡', hue: '#10b981',
    keywords: ['oil','gas','pipeline','nuclear energy','opec','barrel','fuel','energy','lng','crude','refinery','natural gas','electricity','grid','renewable','solar','wind power'],
  },
  {
    key: 'diplomacy', label: 'Diplomacy', icon: '🕊️', hue: '#4f6ef7',
    keywords: ['diplomat','summit','treaty','agreement','negotiation','talks','peace','ceasefire','bilateral','foreign minister','secretary of state','un ','united nations','nato','alliance'],
  },
  {
    key: 'politics', label: 'Politics', icon: '🗳️', hue: '#7c3aed',
    keywords: ['election','government','president','prime minister','parliament','coup','protest','democracy','vote','party','minister','senate','congress','policy','ruling'],
  },
  {
    key: 'crisis', label: 'Crisis / Disaster', icon: '🌊', hue: '#0ea5e9',
    keywords: ['crisis','disaster','flood','earthquake','hurricane','emergency','refugee','humanitarian','famine','drought','evacuation','aid','relief','deaths','killed','civilian'],
  },
]

// ── Article classifier ─────────────────────────────────────────────────────────
function classifyArticle(a: Article): string {
  // prefer explicit cat tag 'world' articles; classify all by keywords
  const text = (a.title + ' ' + (a.desc ?? '') + ' ' + (a.cat ?? '')).toLowerCase()

  let best = 'other'
  let bestScore = 0

  for (const topic of WORLD_TOPICS) {
    const score = topic.keywords.filter(k => text.includes(k)).length
    if (score > bestScore) { bestScore = score; best = topic.key }
  }

  return best
}

// ── Intensity-based sentiment ─────────────────────────────────────────────────
const BULLISH_KW = ['ceasefire','peace','agreement','deal','resolved','aid','relief','recovery','growth']
const BEARISH_KW = ['escalat','killed','casualties','attack','crisis','collapse','war','invasion','surge']

function sentimentScore(text: string): number {
  const t    = text.toLowerCase()
  const bull = BULLISH_KW.filter(k => t.includes(k)).length
  const bear = BEARISH_KW.filter(k => t.includes(k)).length
  if (bull === 0 && bear === 0) return 0
  return Math.max(-1, Math.min(1, (bull - bear) / Math.max(bull + bear, 1)))
}

// ── Slide panel ───────────────────────────────────────────────────────────────
function SlidePanel({
  topic, articles, savedIds, toggleSaveArticle, onClose,
}: {
  topic: TopicConfig | null
  articles: Article[]
  savedIds: Set<string>
  toggleSaveArticle: (a: Article) => void
  onClose: () => void
}) {
  const open = topic !== null
  return (
    <>
      {open && (
        <div onClick={onClose} style={{
          position: 'fixed', inset: 0, background: 'rgba(7,8,13,0.6)',
          zIndex: 40, backdropFilter: 'blur(2px)', animation: 'worldFadeIn .15s ease',
        }} />
      )}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(480px, 92vw)',
        background: 'var(--surf)', borderLeft: '1px solid var(--border2)',
        zIndex: 50,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column',
        boxShadow: open ? '-12px 0 40px rgba(0,0,0,.5)' : 'none',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '16px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <span style={{ fontSize: '20px' }}>{topic?.icon}</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>{topic?.label}</div>
            <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{articles.length} article{articles.length !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={onClose} style={{
            marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text3)', fontSize: '16px', width: '28px', height: '28px',
            borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {articles.map(a => {
            const saved = savedIds.has(a.id)
            const score = sentimentScore(a.title + ' ' + (a.desc ?? ''))
            const sentColor = score > 0.1 ? '#10b981' : score < -0.1 ? '#ef4444' : '#6875a0'
            const sentLabel = score > 0.1 ? 'Stable' : score < -0.1 ? 'Hostile' : 'Neutral'
            return (
              <div key={a.id} style={{ padding: '10px', borderRadius: '8px', transition: 'background .12s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surf2)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                  {a.src && <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text2)' }}>{a.src}</span>}
                  <span style={{ fontSize: '9px', fontWeight: 700, color: sentColor, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: sentColor, display: 'inline-block' }} />
                    {sentLabel}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '9px', color: 'var(--text3)' }}>{timeAgo(a.date)}</span>
                  <button onClick={() => toggleSaveArticle(a)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', color: saved ? 'var(--accent)' : 'var(--text3)' }}>
                    {saved ? '🔖' : '☆'}
                  </button>
                </div>
                <a href={a.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.45 }}>{a.title}</div>
                </a>
              </div>
            )
          })}
          {!articles.length && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '12px' }}>
              No articles in this category yet.
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Heat cell ─────────────────────────────────────────────────────────────────
function HeatCell({ topic, articles, maxCount, onClick }: {
  topic: TopicConfig; articles: Article[]; maxCount: number; onClick: () => void
}) {
  const count     = articles.length
  const intensity = maxCount > 0 ? count / maxCount : 0
  const avgScore  = count === 0 ? 0 : articles.reduce((sum, a) => sum + sentimentScore(a.title + ' ' + (a.desc ?? '')), 0) / count
  const sentColor = avgScore > 0.1 ? '#10b981' : avgScore < -0.1 ? '#ef4444' : '#6875a0'
  const sentLabel = avgScore > 0.1 ? 'Stable' : avgScore < -0.1 ? 'Hostile' : 'Neutral'
  const freshest  = articles.length ? articles.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b) : null
  const glowPct   = Math.round((0.08 + intensity * 0.30) * 100)
  const bordPct   = Math.round((0.15 + intensity * 0.5) * 100)

  return (
    <button
      onClick={onClick}
      disabled={count === 0}
      style={{
        position: 'relative',
        background: `color-mix(in srgb, ${topic.hue} ${glowPct}%, var(--surf2))`,
        border: `1px solid color-mix(in srgb, ${topic.hue} ${bordPct}%, var(--border))`,
        borderRadius: '12px', padding: '18px 16px',
        cursor: count === 0 ? 'default' : 'pointer',
        textAlign: 'left', transition: 'transform .15s, box-shadow .15s',
        minHeight: '110px', display: 'flex', flexDirection: 'column', gap: '6px',
        boxShadow: intensity > 0.4 ? `0 0 20px color-mix(in srgb, ${topic.hue} ${Math.round(intensity * 25)}%, transparent)` : 'none',
      }}
      onMouseEnter={e => {
        if (count === 0) return
        const el = e.currentTarget as HTMLButtonElement
        el.style.transform = 'translateY(-2px) scale(1.01)'
        el.style.boxShadow = `0 6px 24px color-mix(in srgb, ${topic.hue} 30%, transparent)`
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.transform = ''
        el.style.boxShadow = intensity > 0.4 ? `0 0 20px color-mix(in srgb, ${topic.hue} ${Math.round(intensity * 25)}%, transparent)` : 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '18px', lineHeight: 1 }}>{topic.icon}</span>
        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{topic.label}</span>
      </div>
      <div style={{ fontSize: '32px', fontWeight: 900, lineHeight: 1, color: count === 0 ? 'var(--text3)' : 'var(--text)' }}>
        {count}
        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)', marginLeft: '4px' }}>{count === 1 ? 'article' : 'articles'}</span>
      </div>
      {count > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto' }}>
          <span style={{ fontSize: '9px', fontWeight: 700, color: sentColor, display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: sentColor, display: 'inline-block' }} />
            {sentLabel}
          </span>
          {freshest && (
            <span style={{ fontSize: '9px', color: 'var(--text3)', marginLeft: 'auto' }}>Latest {timeAgo(freshest.date)}</span>
          )}
        </div>
      )}
      {/* Intensity bar */}
      <div style={{ position: 'absolute', bottom: 0, left: '12px', right: '12px', height: '3px', borderRadius: '0 0 2px 2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.round(intensity * 100)}%`, background: topic.hue, borderRadius: '2px', transition: 'width .4s', opacity: .7 }} />
      </div>
    </button>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function WorldTopicHeatmap() {
  const articles          = useStore(s => s.articles)
  const savedArticles     = useStore(s => s.savedArticles)
  const toggleSaveArticle = useStore(s => s.toggleSaveArticle)
  const [activeTopic, setActiveTopic] = useState<TopicConfig | null>(null)
  const closePanel = useCallback(() => setActiveTopic(null), [])

  const savedIds = new Set(savedArticles.map(a => a.id))

  // Filter to world-relevant articles (cat=world or matches any world keyword)
  const worldArticles = articles.filter(a => {
    if (a.cat === 'world') return true
    const text = (a.title + ' ' + (a.desc ?? '')).toLowerCase()
    const allKw = WORLD_TOPICS.flatMap(t => t.keywords)
    return allKw.filter(k => text.includes(k)).length >= 2
  })

  // Bucket by topic
  const byTopic: Record<string, Article[]> = {}
  for (const t of WORLD_TOPICS) byTopic[t.key] = []
  for (const a of worldArticles) {
    const key = classifyArticle(a)
    if (byTopic[key]) byTopic[key].push(a)
    else byTopic['crisis'].push(a)
  }

  const maxCount     = Math.max(1, ...WORLD_TOPICS.map(t => byTopic[t.key].length))
  const panelArticles = activeTopic ? (byTopic[activeTopic.key] ?? []) : []
  const activeTopics  = WORLD_TOPICS.filter(t => byTopic[t.key].length > 0).length

  if (!worldArticles.length) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
      <div style={{ fontSize: '28px', marginBottom: '10px' }}>🌍</div>
      Fetching geopolitical intelligence…
    </div>
  )

  return (
    <>
      {/* Summary bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
          {worldArticles.length} geopolitical signals · {activeTopics} active zones
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text3)', marginLeft: 'auto' }}>Click cell to read</span>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
        {WORLD_TOPICS.map(topic => (
          <HeatCell
            key={topic.key}
            topic={topic}
            articles={byTopic[topic.key]}
            maxCount={maxCount}
            onClick={() => setActiveTopic(topic)}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '14px', padding: '8px 14px',
        background: 'var(--surf2)', borderRadius: '8px', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 700 }}>HEAT</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '60px', height: '4px', borderRadius: '2px', background: 'linear-gradient(to right, var(--surf3), #ef4444)' }} />
          <span style={{ fontSize: '9px', color: 'var(--text3)' }}>Low → High activity</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          <span style={{ fontSize: '9px', color: '#10b981', fontWeight: 700 }}>● Stable</span>
          <span style={{ fontSize: '9px', color: '#6875a0', fontWeight: 700 }}>● Neutral</span>
          <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 700 }}>● Hostile</span>
        </div>
      </div>

      <SlidePanel
        topic={activeTopic}
        articles={panelArticles}
        savedIds={savedIds}
        toggleSaveArticle={toggleSaveArticle}
        onClose={closePanel}
      />

      <style>{`@keyframes worldFadeIn { from{opacity:0} to{opacity:1} }`}</style>
    </>
  )
}
