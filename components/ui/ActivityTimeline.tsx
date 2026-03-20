'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { CHART } from '@/lib/chartTheme'

// ── Event type definitions ─────────────────────────────────────────────────
type TimelineEventType = 'threat' | 'seismic' | 'market' | 'intel' | 'system' | 'weather'

interface TimelineEvent {
  id:          string
  type:        TimelineEventType
  title:       string
  description: string
  timestamp:   number
}

// ── Type metadata ───────────────────────────────────────────────────────────
const TYPE_META: Record<TimelineEventType, { icon: string; color: string; label: string }> = {
  threat:  { icon: '🔴', color: CHART.red,     label: 'THREAT'  },
  seismic: { icon: '🟠', color: CHART.orange,  label: 'SEISMIC' },
  market:  { icon: '🟡', color: CHART.amber,   label: 'MARKET'  },
  intel:   { icon: '🔵', color: CHART.sky,     label: 'INTEL'   },
  system:  { icon: '🟢', color: CHART.emerald, label: 'SYSTEM'  },
  weather: { icon: '🟣', color: CHART.violet,  label: 'WEATHER' },
}

// ── Relative time ──────────────────────────────────────────────────────────
function relTime(ts: number): string {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60)   return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Filter chips ───────────────────────────────────────────────────────────
type FilterType = 'All' | TimelineEventType

const FILTERS: FilterType[] = ['All', 'threat', 'market', 'intel', 'system', 'seismic', 'weather']
const FILTER_LABELS: Record<FilterType, string> = {
  All:     'ALL',
  threat:  'THREATS',
  seismic: 'SEISMIC',
  market:  'MARKET',
  intel:   'INTEL',
  system:  'SYSTEM',
  weather: 'WEATHER',
}

// ── Build events from store data ────────────────────────────────────────────
function useTimelineEvents(): TimelineEvent[] {
  const earthquakes = useStore((s) => s.earthquakes)
  const threatIntel = useStore((s) => s.threatIntel)
  const prices      = useStore((s) => s.prices)
  const articles    = useStore((s) => s.articles)
  const weather     = useStore((s) => s.weather)
  const fearGreed   = useStore((s) => s.fearGreed)
  const secFilings  = useStore((s) => s.secFilings)
  const hackerNews  = useStore((s) => s.hackerNews)

  return useMemo(() => {
    const events: TimelineEvent[] = []
    const now = Date.now()

    // ── SEISMIC: earthquakes ────────────────────────────────────────────────
    earthquakes.slice(0, 15).forEach((eq: Record<string, unknown>, i: number) => {
      const props = (eq.properties as Record<string, unknown>) ?? {}
      const mag   = typeof props.mag === 'number' ? props.mag : 0
      const place = typeof props.place === 'string' ? props.place : 'Unknown location'
      const ts    = typeof props.time === 'number' ? props.time : now - i * 60000
      if (mag < 2) return
      events.push({
        id:          `eq-${i}`,
        type:        'seismic',
        title:       `M${mag.toFixed(1)} Earthquake`,
        description: place,
        timestamp:   ts,
      })
    })

    // ── THREAT: threatfox ──────────────────────────────────────────────────
    threatIntel.threatfox.slice(0, 10).forEach((item: Record<string, unknown>, i: number) => {
      const name    = typeof item.ioc === 'string' ? item.ioc : typeof item.malware === 'string' ? item.malware : 'Threat IOC'
      const type_   = typeof item.ioc_type === 'string' ? item.ioc_type : 'IOC'
      const tsStr   = typeof item.first_seen === 'string' ? item.first_seen : ''
      const ts      = tsStr ? new Date(tsStr).getTime() : now - i * 300000
      events.push({
        id:          `tf-${i}`,
        type:        'threat',
        title:       `Threat: ${type_}`,
        description: name.slice(0, 80),
        timestamp:   isNaN(ts) ? now - i * 300000 : ts,
      })
    })

    // ── MARKET: significant price moves ────────────────────────────────────
    Object.entries(prices).forEach(([sym, p], i) => {
      if (Math.abs(p.chg) < 5) return
      events.push({
        id:          `price-${sym}`,
        type:        'market',
        title:       `${sym} ${p.chg >= 0 ? '▲' : '▼'} ${Math.abs(p.chg).toFixed(1)}%`,
        description: `Price: $${p.price.toLocaleString(undefined, { maximumFractionDigits: 2 })} · Vol: ${p.vol ? '$' + (p.vol / 1e9).toFixed(1) + 'B' : '—'}`,
        timestamp:   now - i * 120000,
      })
    })

    // ── MARKET: fear & greed shift ─────────────────────────────────────────
    if (fearGreed?.current) {
      const fg = fearGreed.current as Record<string, unknown>
      events.push({
        id:          'fg-current',
        type:        'market',
        title:       `Fear & Greed: ${typeof fg.value_classification === 'string' ? fg.value_classification : 'Updated'}`,
        description: `Index value: ${typeof fg.value === 'string' ? fg.value : '—'}`,
        timestamp:   now - 30000,
      })
    }

    // ── INTEL: news articles ───────────────────────────────────────────────
    articles.slice(0, 8).forEach((a, i) => {
      events.push({
        id:          `art-${a.id}`,
        type:        'intel',
        title:       a.title.slice(0, 70) + (a.title.length > 70 ? '…' : ''),
        description: `${a.src ?? 'News'} — ${a.cat ?? 'general'}`,
        timestamp:   new Date(a.date).getTime() || now - i * 180000,
      })
    })

    // ── INTEL: SEC filings ─────────────────────────────────────────────────
    secFilings.slice(0, 5).forEach((f: Record<string, unknown>, i: number) => {
      const comp   = typeof f.entityName === 'string' ? f.entityName : typeof f.company === 'string' ? f.company : 'Company'
      const form   = typeof f.form === 'string' ? f.form : 'Filing'
      events.push({
        id:          `sec-${i}`,
        type:        'intel',
        title:       `SEC ${form}: ${comp}`,
        description: typeof f.description === 'string' ? f.description.slice(0, 80) : 'New regulatory filing',
        timestamp:   now - i * 240000,
      })
    })

    // ── INTEL: Hacker News ─────────────────────────────────────────────────
    hackerNews.slice(0, 5).forEach((story: Record<string, unknown>, i: number) => {
      const title = typeof story.title === 'string' ? story.title : 'Tech news'
      events.push({
        id:          `hn-${i}`,
        type:        'intel',
        title:       title.slice(0, 70),
        description: `Hacker News · ${typeof story.score === 'number' ? story.score + ' points' : ''}`,
        timestamp:   now - i * 200000,
      })
    })

    // ── WEATHER ────────────────────────────────────────────────────────────
    if (weather) {
      const w    = weather as Record<string, unknown>
      const name = typeof w.name === 'string' ? w.name : 'Local'
      const main = (w.main as Record<string, unknown>) ?? {}
      const temp = typeof main.temp === 'number' ? main.temp : null
      events.push({
        id:          'weather',
        type:        'weather',
        title:       `Weather: ${name}`,
        description: temp !== null
          ? `${temp.toFixed(0)}°F · ${typeof main.humidity === 'number' ? main.humidity + '% humidity' : ''}`
          : 'Weather data updated',
        timestamp:   now - 15000,
      })
    }

    // ── SYSTEM: data refresh events ────────────────────────────────────────
    events.push({
      id:          'sys-refresh',
      type:        'system',
      title:       'Data Refresh Complete',
      description: `${earthquakes.length} seismic · ${articles.length} articles · ${Object.keys(prices).length} prices`,
      timestamp:   now - 5000,
    })

    // Sort newest first, cap at 50
    return events
      .filter((e) => !isNaN(e.timestamp))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50)
  }, [earthquakes, threatIntel, prices, articles, weather, fearGreed, secFilings, hackerNews])
}

// ── Timeline entry component ────────────────────────────────────────────────
function TimelineEntry({
  event,
  index,
  isLast,
}: {
  event:  TimelineEvent
  index:  number
  isLast: boolean
}) {
  const meta = TYPE_META[event.type]

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      style={{
        display:  'flex',
        gap:      '12px',
        position: 'relative',
      }}
    >
      {/* Vertical line + dot */}
      <div style={{
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        flexShrink:    0,
        width:         '16px',
      }}>
        <div style={{
          width:        '10px',
          height:       '10px',
          borderRadius: '50%',
          background:   meta.color,
          boxShadow:    `0 0 6px ${meta.color}88`,
          flexShrink:   0,
          marginTop:    '3px',
          border:       `2px solid ${CHART.surf}`,
          position:     'relative',
          zIndex:       1,
        }} />
        {!isLast && (
          <div style={{
            width:      '1px',
            flex:       1,
            background: `linear-gradient(to bottom, ${meta.color}44, ${CHART.border})`,
            minHeight:  '20px',
          }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : '16px', minWidth: 0 }}>
        <div style={{
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          gap:            '8px',
          marginBottom:   '2px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
            <span style={{
              background:   `${meta.color}22`,
              border:       `1px solid ${meta.color}44`,
              borderRadius: '3px',
              padding:      '0px 5px',
              fontSize:     '8px',
              fontWeight:   700,
              color:        meta.color,
              fontFamily:   'monospace',
              letterSpacing: '0.5px',
              flexShrink:   0,
            }}>
              {meta.icon} {meta.label}
            </span>
            <span style={{
              fontSize:   '12px',
              fontWeight: 600,
              color:      CHART.text,
              overflow:   'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}>
              {event.title}
            </span>
          </div>
          <span style={{
            fontSize:   '9px',
            color:      CHART.text3,
            fontFamily: 'monospace',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}>
            {relTime(event.timestamp)}
          </span>
        </div>
        <div style={{
          fontSize:  '10.5px',
          color:     CHART.text2,
          lineHeight: 1.4,
          overflow:   'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
        }}>
          {event.description}
        </div>
      </div>
    </motion.div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ActivityTimeline() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('All')
  const allEvents = useTimelineEvents()

  const filtered = useMemo(() => {
    if (activeFilter === 'All') return allEvents
    return allEvents.filter((e) => e.type === activeFilter)
  }, [allEvents, activeFilter])

  return (
    <div style={{
      background:   CHART.surf2,
      border:       `1px solid ${CHART.border2}`,
      borderRadius: '12px',
      overflow:     'hidden',
      marginBottom: '16px',
    }}>
      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '12px 16px',
        borderBottom:   `1px solid ${CHART.border}`,
        flexWrap:       'wrap',
        gap:            '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: CHART.emerald,
            boxShadow: `0 0 6px ${CHART.emerald}`,
            display: 'inline-block',
          }} />
          <span style={{
            fontSize:      '11px',
            fontWeight:    900,
            letterSpacing: '2px',
            color:         CHART.text,
            fontFamily:    'monospace',
          }}>
            ACTIVITY TIMELINE
          </span>
        </div>
        <span style={{
          fontSize:   '10px',
          color:      CHART.text3,
          fontFamily: 'monospace',
        }}>
          {filtered.length} events
        </span>
      </div>

      {/* Filter chips */}
      <div style={{
        display:    'flex',
        gap:        '6px',
        padding:    '10px 16px',
        flexWrap:   'wrap',
        borderBottom: `1px solid ${CHART.border}`,
      }}>
        {FILTERS.map((f) => {
          const isActive = f === activeFilter
          const meta     = f === 'All' ? null : TYPE_META[f]
          const color    = meta?.color ?? CHART.rose
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                background:   isActive ? `${color}22` : 'transparent',
                border:       `1px solid ${isActive ? color : CHART.border2}`,
                borderRadius: '20px',
                padding:      '3px 10px',
                fontSize:     '9px',
                fontWeight:   700,
                color:        isActive ? color : CHART.text3,
                fontFamily:   'monospace',
                letterSpacing: '0.5px',
                cursor:       'pointer',
                transition:   'all 0.15s',
              }}
            >
              {meta?.icon ? `${meta.icon} ` : ''}{FILTER_LABELS[f]}
            </button>
          )
        })}
      </div>

      {/* Timeline entries */}
      <div style={{
        padding:   '14px 16px',
        maxHeight: '600px',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        <AnimatePresence initial={false}>
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                padding:   '40px',
                textAlign: 'center',
                color:     CHART.text3,
                fontSize:  '12px',
              }}
            >
              No events for this filter yet
            </motion.div>
          ) : (
            filtered.map((event, i) => (
              <TimelineEntry
                key={event.id}
                event={event}
                index={i}
                isLast={i === filtered.length - 1}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
