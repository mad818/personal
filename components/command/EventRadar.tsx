'use client'

/**
 * EventRadar — surfaces high-signal events from the live data already in the
 * Zustand store. No extra API calls. Shows top conflict items + top bearish
 * market news as an "incoming risk" radar.
 */

import { useStore } from '@/store/useStore'
import { timeAgo }  from '@/lib/helpers'
import type { Article } from '@/store/useStore'

const RISK_KW = [
  'hack','exploit','attack','breach','vulnerability','sanctions','ban','crash',
  'lawsuit','fine','war','airstrike','missile','nuclear','coup','collapse',
  'bankruptcy','regulatory','investigation','arrest','seized',
]

function riskScore(title: string): number {
  const t = title.toLowerCase()
  return RISK_KW.filter((k) => t.includes(k)).length
}

const SEV_COLOR = (n: number) =>
  n >= 3 ? '#ef4444' : n >= 2 ? '#f59e0b' : '#818cf8'

const SEV_LABEL = (n: number) =>
  n >= 3 ? 'HIGH' : n >= 2 ? 'MED' : 'LOW'

export default function EventRadar() {
  const articles    = useStore((s) => s.articles)
  const gdeltEvents = useStore((s) => s.gdeltEvents)
  const earthquakes = useStore((s) => s.earthquakes)

  // Merge standard articles with GDELT events into a unified event list
  const gdeltArticles: Article[] = gdeltEvents.slice(0, 30).map((g: any, i: number) => ({
    id:    `gdelt-${i}`,
    title: g.title ?? '',
    desc:  g.domain ?? '',
    link:  g.url ?? '#',
    date:  g.seendate ?? g.publishdate ?? '',
    src:   'GDELT',
    cat:   'world',
  }))

  // Top earthquakes as events (M5+)
  const quakeEvents: Article[] = earthquakes
    .filter((eq: any) => {
      const mag = eq.magnitude ?? eq.mag ?? eq.properties?.mag ?? 0
      return mag >= 5
    })
    .slice(0, 10)
    .map((eq: any, i: number) => {
      const mag   = eq.magnitude ?? eq.mag ?? eq.properties?.mag ?? 0
      const place = eq.place ?? eq.location ?? eq.properties?.place ?? 'Unknown'
      const ts    = eq.time ?? eq.properties?.time ?? ''
      return {
        id:    `quake-${i}`,
        title: `M${typeof mag === 'number' ? mag.toFixed(1) : mag} earthquake — ${place}`,
        desc:  '',
        link:  '#',
        date:  ts ? new Date(typeof ts === 'number' ? ts : ts).toISOString() : '',
        src:   'USGS',
        cat:   'world',
      }
    })

  const allSources = [...articles, ...gdeltArticles, ...quakeEvents]

  const events = allSources
    .map((a: Article) => ({ ...a, risk: riskScore(a.title) }))
    .filter((a) => a.risk >= 1)
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 10)

  if (!events.length) return null

  return (
    <div style={{ marginTop: '18px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '10px' }}>
        ⚡ Event Radar — Incoming Signals
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {events.map((e) => {
          const col = SEV_COLOR(e.risk)
          return (
            <a
              key={e.id}
              href={e.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                background: 'var(--surf2)', border: `1px solid var(--border)`,
                borderRadius: '8px', padding: '9px 12px', textDecoration: 'none',
              }}
            >
              {/* Risk badge */}
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', paddingTop: '1px' }}>
                <span style={{
                  fontSize: '8px', fontWeight: 800, padding: '2px 5px', borderRadius: '4px',
                  background: `${col}22`, color: col, textTransform: 'uppercase',
                }}>
                  {SEV_LABEL(e.risk)}
                </span>
                {/* Mini risk bar */}
                <div style={{ width: '28px', height: '3px', background: 'var(--surf3)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(e.risk / 4, 1) * 100}%`, height: '100%', background: col, borderRadius: '2px' }} />
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.35 }}>
                  {e.title}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                  {e.src && <span style={{ fontSize: '10px', color: 'var(--text3)' }}>{e.src}</span>}
                  <span style={{ fontSize: '10px', color: 'var(--text3)' }}>{timeAgo(e.date)}</span>
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
