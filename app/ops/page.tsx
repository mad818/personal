'use client'

import dynamic              from 'next/dynamic'
import ConflictFeed         from '@/components/ops/ConflictFeed'
import MarketRates          from '@/components/ops/MarketRates'
import EarthquakeChart      from '@/components/ops/EarthquakeChart'
import ConflictDensityBar   from '@/components/ops/ConflictDensityBar'
import PageTransition       from '@/components/ui/PageTransition'
import DataLoadingState     from '@/components/ui/DataLoadingState'
import { useStore }         from '@/store/useStore'
import { CHART }            from '@/lib/chartTheme'

// Dynamic import keeps Leaflet off the server bundle
const OpsMap = dynamic(() => import('@/components/ops/OpsMap'), { ssr: false })

// ── Seismic wave CSS (injected once) ─────────────────────────────────────────
const SEISMIC_CSS = `
@keyframes nex-seismic {
  0%   { transform: scaleX(0.96) translateX(-1%); opacity: 0.5; }
  25%  { transform: scaleX(1.02) translateX(1%);  opacity: 0.9; }
  50%  { transform: scaleX(0.98) translateX(-0.5%); opacity: 0.7; }
  75%  { transform: scaleX(1.01) translateX(0.5%); opacity: 0.85; }
  100% { transform: scaleX(0.96) translateX(-1%); opacity: 0.5; }
}
@keyframes nex-wave-pulse {
  0%, 100% { opacity: 0.3; transform: scaleY(1); }
  50%       { opacity: 0.8; transform: scaleY(2.5); }
}
`

// ── Seismic wave SVG animation ────────────────────────────────────────────────
function SeismicWave() {
  const pts = Array.from({ length: 60 }, (_, i) => {
    const x = (i / 59) * 100
    const y = 50 + Math.sin(i * 0.42) * 20 * Math.sin(i * 0.1)
    return `${x},${y}`
  }).join(' ')

  return (
    <div style={{ position: 'relative', height: '28px', overflow: 'hidden', marginBottom: '4px' }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          animation: 'nex-seismic 3s ease-in-out infinite',
        }}
        aria-hidden
      >
        <polyline
          points={pts}
          fill="none"
          stroke={CHART.amber}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 2px ${CHART.amber}88)` }}
        />
      </svg>
    </div>
  )
}

// ── Magnitude color ───────────────────────────────────────────────────────────
const MAG_COLOR = (mag: number) =>
  mag >= 7 ? CHART.red :
  mag >= 6 ? CHART.amber :
  mag >= 5 ? CHART.gold :
  CHART.emerald

// ── Earthquake panel ─────────────────────────────────────────────────────────
function EarthquakePanel() {
  const earthquakes = useStore((s) => s.earthquakes)

  return (
    <div style={{ marginTop: '28px' }}>
      <div style={{
        fontSize: '11px', fontWeight: 700, color: CHART.text3,
        textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '10px',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        🌐 Seismic Activity
        {earthquakes.length > 0 && (
          <span style={{
            fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '5px',
            background: 'rgba(196,72,90,.15)', color: CHART.rose,
          }}>
            {earthquakes.length} events
          </span>
        )}
      </div>

      {/* Seismic wave animation */}
      {earthquakes.length > 0 && <SeismicWave />}

      {/* Scatter chart */}
      <EarthquakeChart />

      {!earthquakes.length ? (
        <div style={{
          background: CHART.surf2, border: `1px solid ${CHART.border}`,
          borderRadius: '10px', padding: '20px', textAlign: 'center',
          color: CHART.text3, fontSize: '12px',
        }}>
          Loading seismic data…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {earthquakes.slice(0, 15).map((eq: any, i: number) => {
            const mag   = eq.magnitude ?? eq.mag ?? eq.properties?.mag ?? 0
            const place = eq.place ?? eq.location ?? eq.properties?.place ?? 'Unknown location'
            const ts    = eq.time ?? eq.properties?.time ?? eq.date ?? ''
            const col   = MAG_COLOR(mag)
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: CHART.surf2, border: `1px solid ${CHART.border}`,
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
                  <div style={{ fontSize: '12px', fontWeight: 600, color: CHART.text, lineHeight: 1.4 }}>
                    {place}
                  </div>
                  {ts !== '' && (
                    <div style={{ fontSize: '10px', color: CHART.text3, marginTop: '2px' }}>
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

// ── Conflict content (with loading state) ─────────────────────────────────────
function OpsContent() {
  const gdeltEvents = useStore((s) => s.gdeltEvents)

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '18px 16px 40px' }}>
      <div style={{ fontSize: '18px', fontWeight: 900 }}>🌍 GEOPOLITICAL</div>
      <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px', marginBottom: '16px' }}>
        Conflict intelligence · Live earthquake map · FX rates · Commodities · OSINT
      </div>

      {/* New visualization row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <ConflictDensityBar />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* placeholder slot for future component */}
        </div>
      </div>

      {/* Conflict feed with loading state */}
      {gdeltEvents.length === 0 ? (
        <DataLoadingState dataName="conflict events" height={200} />
      ) : (
        <ConflictFeed />
      )}

      <EarthquakePanel />
      <MarketRates />
      <OpsMap />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OpsPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SEISMIC_CSS }} />
      <PageTransition>
        <OpsContent />
      </PageTransition>
    </>
  )
}
