'use client'

import dynamic        from 'next/dynamic'
import ConflictFeed   from '@/components/ops/ConflictFeed'
import MarketRates    from '@/components/ops/MarketRates'
import { useStore }   from '@/store/useStore'

// Dynamic import keeps Leaflet off the server bundle
const OpsMap = dynamic(() => import('@/components/ops/OpsMap'), { ssr: false })

// ── Earthquake panel ─────────────────────────────────────────────────────────

const MAG_COLOR = (mag: number) =>
  mag >= 7 ? '#ef4444' :
  mag >= 6 ? '#f59e0b' :
  mag >= 5 ? '#d4956a' :
  '#10b981'

function EarthquakePanel() {
  const earthquakes = useStore((s) => s.earthquakes)

  return (
    <div style={{ marginTop: '28px' }}>
      <div style={{
        fontSize: '11px', fontWeight: 700, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '10px',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        🌐 Seismic Activity
        {earthquakes.length > 0 && (
          <span style={{
            fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '5px',
            background: 'rgba(196,72,90,.15)', color: 'var(--accent)',
          }}>
            {earthquakes.length} events
          </span>
        )}
      </div>

      {!earthquakes.length ? (
        <div style={{
          background: 'var(--surf2)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '20px', textAlign: 'center',
          color: 'var(--text3)', fontSize: '12px',
        }}>
          Loading seismic data…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {earthquakes.slice(0, 15).map((eq: any, i: number) => {
            const mag  = eq.magnitude ?? eq.mag ?? eq.properties?.mag ?? 0
            const place = eq.place ?? eq.location ?? eq.properties?.place ?? 'Unknown location'
            const ts    = eq.time ?? eq.properties?.time ?? eq.date ?? ''
            const col   = MAG_COLOR(mag)
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: 'var(--surf2)', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '9px 12px',
              }}>
                {/* Magnitude badge */}
                <div style={{
                  flexShrink: 0, minWidth: '44px', textAlign: 'center',
                  background: `${col}22`, border: `1px solid ${col}44`,
                  borderRadius: '6px', padding: '4px 6px',
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: col, fontFamily: 'monospace', lineHeight: 1 }}>
                    {typeof mag === 'number' ? mag.toFixed(1) : mag}
                  </div>
                  <div style={{ fontSize: '8px', color: col, fontWeight: 700, textTransform: 'uppercase' }}>MAG</div>
                </div>

                {/* Location + time */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
                    {place}
                  </div>
                  {ts !== '' && (
                    <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px' }}>
                      {new Date(typeof ts === 'number' ? ts : ts).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OpsPage() {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '18px 16px 40px' }}>
      <div style={{ fontSize: '18px', fontWeight: 900 }}>🌍 GEOPOLITICAL</div>
      <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px', marginBottom: '16px' }}>
        Conflict intelligence · Live earthquake map · FX rates · Commodities · OSINT
      </div>
      <ConflictFeed />
      <EarthquakePanel />
      <MarketRates />
      <OpsMap />
    </div>
  )
}
