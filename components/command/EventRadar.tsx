'use client'

/**
 * EventRadar — surfaces high-signal events from the live data already in the
 * Zustand store. No extra API calls. Shows top conflict items + top bearish
 * market news as an "incoming risk" radar.
 * UPGRADED: severity distribution mini bar chart at top + pulse on HIGH items.
 */

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { timeAgo }  from '@/lib/helpers'
import { CHART, TOOLTIP_STYLE, AXIS_STYLE } from '@/lib/chartTheme'
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
  n >= 3 ? CHART.red : n >= 2 ? CHART.amber : CHART.violet

const SEV_LABEL = (n: number) =>
  n >= 3 ? 'HIGH' : n >= 2 ? 'MED' : 'LOW'

export default function EventRadar() {
  const articles    = useStore((s) => s.articles)
  const gdeltEvents = useStore((s) => s.gdeltEvents)
  const earthquakes = useStore((s) => s.earthquakes)

  const gdeltArticles: Article[] = gdeltEvents.slice(0, 30).map((g: any, i: number) => ({
    id:    `gdelt-${i}`,
    title: g.title ?? '',
    desc:  g.domain ?? '',
    link:  g.url ?? '#',
    date:  g.seendate ?? g.publishdate ?? '',
    src:   'GDELT',
    cat:   'world',
  }))

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

  // Severity distribution
  const sevCounts = useMemo(() => {
    const all = allSources
      .map((a: Article) => ({ ...a, risk: riskScore(a.title) }))
      .filter((a) => a.risk >= 1)
    return [
      { name: 'HIGH', count: all.filter((a) => a.risk >= 3).length, color: CHART.red },
      { name: 'MED',  count: all.filter((a) => a.risk === 2).length, color: CHART.amber },
      { name: 'LOW',  count: all.filter((a) => a.risk === 1).length, color: CHART.violet },
    ]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles.length, gdeltEvents.length, earthquakes.length])

  if (!events.length) return null

  return (
    <div style={{ marginTop: '18px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: CHART.text3, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '10px' }}>
        ⚡ Event Radar — Incoming Signals
      </div>

      {/* Severity Distribution Bar Chart */}
      <div style={{
        background: CHART.surf2,
        border: `1px solid ${CHART.border}`,
        borderRadius: '10px',
        padding: '12px 14px',
        marginBottom: '10px',
      }}>
        <div style={{ fontSize: '9.5px', fontWeight: 700, color: CHART.text3, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '8px' }}>
          Severity Distribution
        </div>
        <ResponsiveContainer width="100%" height={56}>
          <BarChart data={sevCounts} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tick={{ ...AXIS_STYLE }} width={28} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [`${v} events`, 'Count']} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={14}>
              {sevCounts.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Event list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {events.map((e) => {
          const col   = SEV_COLOR(e.risk)
          const isHigh = e.risk >= 3
          return (
            <motion.a
              key={e.id}
              href={e.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                background: CHART.surf2,
                border: `1px solid ${isHigh ? `${CHART.red}44` : CHART.border}`,
                borderRadius: '8px', padding: '9px 12px', textDecoration: 'none',
                animation: isHigh ? 'nex-pulse 2.5s ease-in-out infinite' : 'none',
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
                <div style={{ width: '28px', height: '3px', background: CHART.surf3, borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(e.risk / 4, 1) * 100}%`, height: '100%', background: col, borderRadius: '2px' }} />
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: CHART.text, lineHeight: 1.35 }}>
                  {e.title}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                  {e.src && <span style={{ fontSize: '10px', color: CHART.text3 }}>{e.src}</span>}
                  <span style={{ fontSize: '10px', color: CHART.text3 }}>{timeAgo(e.date)}</span>
                </div>
              </div>
            </motion.a>
          )
        })}
      </div>
    </div>
  )
}
