'use client'

// ── CyberArticleHeatmap.tsx ───────────────────────────────────────────────────
// Cyber/security articles displayed as a heat grid.
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

const CYBER_TOPICS: TopicConfig[] = [
  {
    key: 'malware', label: 'Malware', icon: '🦠', hue: '#ef4444',
    keywords: ['malware','virus','trojan','worm','backdoor','botnet','spyware','rootkit','payload','infect','dropper','stealer','keylogger'],
  },
  {
    key: 'ransomware', label: 'Ransomware', icon: '💀', hue: '#f97316',
    keywords: ['ransomware','ransom','lockbit','blackcat','clop','hive','revil','darkside','encrypt','extort','payment','decryptor','double extortion'],
  },
  {
    key: 'apt', label: 'APT / Espionage', icon: '🕵️', hue: '#7c3aed',
    keywords: ['apt','espionage','nation-state','china','russia','iran','north korea','lazarus','cozy bear','fancy bear','volt typhoon','state-sponsored','intelligence','spy'],
  },
  {
    key: 'breach', label: 'Data Breach', icon: '🔓', hue: '#f59e0b',
    keywords: ['breach','leak','exposed','stolen','compromised','database','records leaked','personal data','credential','dump','exfiltrat','data loss','unauthorized access'],
  },
  {
    key: 'vuln', label: 'Vulnerability', icon: '⚠️', hue: '#4f6ef7',
    keywords: ['vulnerability','cve','exploit','patch','zero-day','zero day','rce','injection','buffer overflow','privilege escalation','critical','severity','poc','proof of concept'],
  },
  {
    key: 'policy', label: 'Policy / Law', icon: '📋', hue: '#10b981',
    keywords: ['regulation','law','gdpr','compliance','fine','legislation','cisa','nist','framework','standard','penalty','arrest','indictment','sanction','cyber law'],
  },
]

// ── Severity / threat level ───────────────────────────────────────────────────
const HIGH_KW   = ['critical','zero-day','actively exploited','emergency','patch now','mass exploitation','supply chain']
const LOW_KW    = ['patched','mitigated','disclosed','low severity','informational','awareness']

function threatScore(text: string): number {
  const t   = text.toLowerCase()
  const hi  = HIGH_KW.filter(k => t.includes(k)).length
  const lo  = LOW_KW.filter(k => t.includes(k)).length
  if (hi === 0 && lo === 0) return 0
  return Math.max(-1, Math.min(1, (hi - lo) / Math.max(hi + lo, 1)))
}

function classifyArticle(a: Article): string {
  const text = (a.title + ' ' + (a.desc ?? '') + ' ' + (a.cat ?? '')).toLowerCase()
  let best = 'vuln'; let bestScore = 0
  for (const t of CYBER_TOPICS) {
    const score = t.keywords.filter(k => text.includes(k)).length
    if (score > bestScore) { bestScore = score; best = t.key }
  }
  return best
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
          zIndex: 40, backdropFilter: 'blur(2px)', animation: 'cyberFadeIn .15s ease',
        }} />
      )}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(480px, 92vw)',
        background: 'var(--surf)', borderLeft: '1px solid var(--border2)',
        zIndex: 50,
        pointerEvents: open ? 'auto' : 'none',
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
            const saved  = savedIds.has(a.id)
            const score  = threatScore(a.title + ' ' + (a.desc ?? ''))
            const tColor = score > 0.1 ? '#ef4444' : score < -0.1 ? '#10b981' : '#6875a0'
            const tLabel = score > 0.1 ? 'High Threat' : score < -0.1 ? 'Patched' : 'Monitoring'
            return (
              <div key={a.id} style={{ padding: '10px', borderRadius: '8px', transition: 'background .12s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surf2)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                  {a.src && <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text2)' }}>{a.src}</span>}
                  <span style={{ fontSize: '9px', fontWeight: 700, color: tColor, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: tColor, display: 'inline-block' }} />
                    {tLabel}
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
  const avgScore  = count === 0 ? 0 : articles.reduce((sum, a) => sum + threatScore(a.title + ' ' + (a.desc ?? '')), 0) / count
  const tColor    = avgScore > 0.1 ? '#ef4444' : avgScore < -0.1 ? '#10b981' : '#6875a0'
  const tLabel    = avgScore > 0.1 ? 'High Threat' : avgScore < -0.1 ? 'Patched' : 'Monitoring'
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
          <span style={{ fontSize: '9px', fontWeight: 700, color: tColor, display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: tColor, display: 'inline-block' }} />
            {tLabel}
          </span>
          {freshest && <span style={{ fontSize: '9px', color: 'var(--text3)', marginLeft: 'auto' }}>Latest {timeAgo(freshest.date)}</span>}
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 0, left: '12px', right: '12px', height: '3px', borderRadius: '0 0 2px 2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.round(intensity * 100)}%`, background: topic.hue, borderRadius: '2px', transition: 'width .4s', opacity: .7 }} />
      </div>
    </button>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function CyberArticleHeatmap() {
  const articles          = useStore(s => s.articles)
  const savedArticles     = useStore(s => s.savedArticles)
  const toggleSaveArticle = useStore(s => s.toggleSaveArticle)
  const [activeTopic, setActiveTopic] = useState<TopicConfig | null>(null)
  const closePanel = useCallback(() => setActiveTopic(null), [])

  const savedIds = new Set(savedArticles.map(a => a.id))

  // Filter to cyber-relevant articles
  const cyberArticles = articles.filter(a => {
    if (a.cat === 'cyber') return true
    const text = (a.title + ' ' + (a.desc ?? '')).toLowerCase()
    const allKw = CYBER_TOPICS.flatMap(t => t.keywords)
    return allKw.filter(k => text.includes(k)).length >= 2
  })

  const byTopic: Record<string, Article[]> = {}
  for (const t of CYBER_TOPICS) byTopic[t.key] = []
  for (const a of cyberArticles) {
    const key = classifyArticle(a)
    if (byTopic[key]) byTopic[key].push(a)
    else byTopic['vuln'].push(a)
  }

  const maxCount      = Math.max(1, ...CYBER_TOPICS.map(t => byTopic[t.key].length))
  const panelArticles = activeTopic ? (byTopic[activeTopic.key] ?? []) : []
  const activeTopics  = CYBER_TOPICS.filter(t => byTopic[t.key].length > 0).length

  if (!cyberArticles.length) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
      <div style={{ fontSize: '28px', marginBottom: '10px' }}>🔒</div>
      Loading threat intelligence feed…
    </div>
  )

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
          {cyberArticles.length} threat signals · {activeTopics} active categories
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text3)', marginLeft: 'auto' }}>Click cell to read</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
        {CYBER_TOPICS.map(topic => (
          <HeatCell
            key={topic.key}
            topic={topic}
            articles={byTopic[topic.key]}
            maxCount={maxCount}
            onClick={() => setActiveTopic(topic)}
          />
        ))}
      </div>

      <div style={{
        marginTop: '14px', padding: '8px 14px',
        background: 'var(--surf2)', borderRadius: '8px', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 700 }}>THREAT HEAT</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '60px', height: '4px', borderRadius: '2px', background: 'linear-gradient(to right, var(--surf3), #ef4444)' }} />
          <span style={{ fontSize: '9px', color: 'var(--text3)' }}>Low → High activity</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 700 }}>● High Threat</span>
          <span style={{ fontSize: '9px', color: '#6875a0', fontWeight: 700 }}>● Monitoring</span>
          <span style={{ fontSize: '9px', color: '#10b981', fontWeight: 700 }}>● Patched</span>
        </div>
      </div>

      <SlidePanel
        topic={activeTopic}
        articles={panelArticles}
        savedIds={savedIds}
        toggleSaveArticle={toggleSaveArticle}
        onClose={closePanel}
      />

      <style>{`@keyframes cyberFadeIn { from{opacity:0} to{opacity:1} }`}</style>
    </>
  )
}
