'use client'

import { useEffect, useState, useCallback } from 'react'
import { useStore } from '@/store/useStore'

interface DataSource {
  key:   string
  label: string
  full:  string
  check: (s: ReturnType<typeof useStore.getState>) => boolean
}

const DATA_SOURCES: DataSource[] = [
  {
    key:   'PRC',
    label: 'PRC',
    full:  'Prices',
    check: (s) => Object.keys(s.prices).length > 0,
  },
  {
    key:   'NEW',
    label: 'NEW',
    full:  'News',
    check: (s) => s.articles.length > 0,
  },
  {
    key:   'CVE',
    label: 'CVE',
    full:  'CVEs',
    check: (s) => s.cves.length > 0,
  },
  {
    key:   'OTX',
    label: 'OTX',
    full:  'OTX Pulses',
    check: (s) => s.otxPulses.length > 0,
  },
  {
    key:   'GDL',
    label: 'GDL',
    full:  'GDELT Events',
    check: (s) => s.gdeltEvents.length > 0,
  },
  {
    key:   'WTH',
    label: 'WTH',
    full:  'Weather',
    check: (s) => s.weather !== null,
  },
  {
    key:   'THR',
    label: 'THR',
    full:  'ThreatFox',
    check: (s) => s.threatIntel.threatfox.length > 0,
  },
  {
    key:   'DFI',
    label: 'DFI',
    full:  'DeFi',
    check: (s) => s.defiData.protocols.length > 0,
  },
  {
    key:   'HKN',
    label: 'HKN',
    full:  'HackerNews',
    check: (s) => s.hackerNews.length > 0,
  },
  {
    key:   'SEC',
    label: 'SEC',
    full:  'SEC Filings',
    check: (s) => s.secFilings.length > 0,
  },
]

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatLastRefresh(ms: number): string {
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 min ago'
  return `${mins} min ago`
}

export default function SystemStatusFooter() {
  const [time, setTime]              = useState(() => new Date())
  const [lastRefresh, setLastRefresh] = useState(() => Date.now())
  const [hoveredKey, setHoveredKey]   = useState<string | null>(null)
  const [refreshing, setRefreshing]   = useState(false)

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Listen for data refresh events
  useEffect(() => {
    const handler = () => setLastRefresh(Date.now())
    window.addEventListener('nexus-data-refreshed', handler)
    return () => window.removeEventListener('nexus-data-refreshed', handler)
  }, [])

  const handleRefresh = useCallback(() => {
    if (refreshing) return
    setRefreshing(true)
    window.dispatchEvent(new CustomEvent('nexus-refresh-trigger'))
    setTimeout(() => {
      setRefreshing(false)
      setLastRefresh(Date.now())
    }, 2500)
  }, [refreshing])

  // Read all status checks from store
  const prices     = useStore((s) => s.prices)
  const articles   = useStore((s) => s.articles)
  const cves       = useStore((s) => s.cves)
  const otxPulses  = useStore((s) => s.otxPulses)
  const gdeltEvents = useStore((s) => s.gdeltEvents)
  const weather    = useStore((s) => s.weather)
  const threatIntel = useStore((s) => s.threatIntel)
  const defiData   = useStore((s) => s.defiData)
  const hackerNews = useStore((s) => s.hackerNews)
  const secFilings = useStore((s) => s.secFilings)

  const storeSnapshot = {
    prices, articles, cves, otxPulses, gdeltEvents,
    weather, threatIntel, defiData, hackerNews, secFilings,
  }

  const minsAgo = Math.floor((Date.now() - lastRefresh) / 60000)

  return (
    <div
      style={{
        position:        'fixed',
        bottom:          0,
        left:            'var(--sidebar-width, 220px)',
        right:           0,
        height:          '32px',
        zIndex:          100,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        padding:         '0 14px',
        background:      'rgba(10,7,8,0.92)',
        backdropFilter:  'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop:       '1px solid transparent',
        backgroundImage: 'linear-gradient(rgba(10,7,8,0.92), rgba(10,7,8,0.92)), linear-gradient(90deg, rgba(196,72,90,0.35), rgba(212,149,106,0.2), transparent)',
        backgroundOrigin: 'border-box',
        backgroundClip:  'padding-box, border-box',
        transition:      'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Left: Branding + clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <span style={{
          fontSize: '9px', fontWeight: 800, letterSpacing: '1.5px',
          color: 'rgba(196,72,90,0.8)', textTransform: 'uppercase',
          fontFamily: 'monospace',
        }}>
          NEXUS PRIME v2.0
        </span>
        <span style={{ color: 'rgba(74,51,56,0.6)', fontSize: '9px' }}>│</span>
        <span style={{
          fontSize: '10px', fontFamily: 'monospace', fontWeight: 600,
          color: 'rgba(212,149,106,0.7)', letterSpacing: '0.5px',
        }}>
          {formatTime(time)}
        </span>
      </div>

      {/* Center: API health indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {DATA_SOURCES.map((src) => {
          const isOk = src.check(storeSnapshot as any)
          return (
            <div
              key={src.key}
              onMouseEnter={() => setHoveredKey(src.key)}
              onMouseLeave={() => setHoveredKey(null)}
              style={{
                position:   'relative',
                display:    'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap:        '2px',
                cursor:     'default',
              }}
            >
              {/* Dot */}
              <div style={{
                width:        '6px',
                height:       '6px',
                borderRadius: '50%',
                background:   isOk ? '#22c55e' : '#ef4444',
                boxShadow:    isOk
                  ? '0 0 4px rgba(34,197,94,0.5)'
                  : '0 0 4px rgba(239,68,68,0.4)',
                transition:   'background 0.3s',
              }} />
              {/* Label */}
              <span style={{
                fontSize:      '7px',
                fontWeight:    700,
                color:         isOk ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.5)',
                fontFamily:    'monospace',
                letterSpacing: '0.2px',
              }}>
                {src.label}
              </span>

              {/* Hover tooltip */}
              {hoveredKey === src.key && (
                <div style={{
                  position:     'absolute',
                  bottom:       '26px',
                  left:         '50%',
                  transform:    'translateX(-50%)',
                  background:   'rgba(17,13,14,0.96)',
                  border:       '1px solid rgba(45,31,34,0.8)',
                  borderRadius: '6px',
                  padding:      '5px 8px',
                  whiteSpace:   'nowrap',
                  zIndex:       200,
                  boxShadow:    '0 4px 16px rgba(0,0,0,0.5)',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#f5e6ea' }}>
                    {src.full}
                  </div>
                  <div style={{ fontSize: '9px', color: isOk ? '#22c55e' : '#ef4444', marginTop: '2px' }}>
                    {isOk ? '● Connected' : '● No data'}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Right: Last refresh + manual refresh button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{ fontSize: '9px', color: 'rgba(74,51,56,0.8)', fontFamily: 'monospace' }}>
          Last refresh: {formatLastRefresh(Date.now() - lastRefresh)}
        </span>
        <button
          onClick={handleRefresh}
          title="Refresh all data"
          style={{
            width:        '20px',
            height:       '20px',
            borderRadius: '50%',
            border:       '1px solid rgba(45,31,34,0.6)',
            background:   'transparent',
            color:        refreshing ? 'rgba(196,72,90,0.8)' : 'rgba(74,51,56,0.8)',
            cursor:       'pointer',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            fontSize:     '11px',
            transition:   'color 0.15s, border-color 0.15s',
            animation:    refreshing ? 'nexus-spin 0.8s linear infinite' : 'none',
          }}
          aria-label="Refresh data"
        >
          ↻
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes nexus-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      ` }} />
    </div>
  )
}
