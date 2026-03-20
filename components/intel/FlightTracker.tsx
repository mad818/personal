'use client'

// ── components/intel/FlightTracker.tsx ────────────────────────────────────────
// NEXUS PRIME — Flight Tracker: fetches live flight data from /api/flights
// and shows top 20 flights with altitude color coding.

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '@/lib/apiFetch'

interface Flight {
  callsign:      string
  originCountry: string
  altitude:      number   // meters
  velocity:      number   // m/s
  latitude:      number
  longitude:     number
  onGround:      boolean
  heading:       number
  icao24:        string
}

// ── Altitude color: low = warm/red, high = cool/blue ─────────────────────────
function altitudeColor(alt: number): string {
  if (alt <= 0)        return 'var(--text3)'
  if (alt < 3000)      return '#f59e0b'    // low — amber
  if (alt < 7000)      return '#10b981'    // mid — teal
  if (alt < 10000)     return '#60a5fa'    // high — sky blue
  return '#818cf8'                          // very high — indigo
}

function altitudeLabel(alt: number): string {
  if (alt <= 0)    return 'Ground'
  if (alt < 1000)  return `${alt.toFixed(0)} m`
  return `${(alt / 1000).toFixed(1)} km`
}

function speedLabel(v: number): string {
  if (v <= 0) return '—'
  const kmh = v * 3.6
  return `${kmh.toFixed(0)} km/h`
}

// ── Flight row ────────────────────────────────────────────────────────────────
function FlightRow({ flight, rank }: { flight: Flight; rank: number }) {
  const color = altitudeColor(flight.altitude)
  const altPct = Math.min(100, (flight.altitude / 13000) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, delay: rank * 0.02 }}
      style={{
        display: 'grid',
        gridTemplateColumns: '20px 90px 1fr 80px 80px',
        alignItems: 'center',
        gap: '8px',
        padding: '7px 10px',
        background: 'var(--surf2)',
        border: '1px solid var(--border)',
        borderRadius: '7px',
        borderLeft: `3px solid ${color}`,
      }}
    >
      {/* Rank */}
      <span style={{ fontSize: '9px', color: 'var(--text3)', fontFamily: 'monospace', textAlign: 'right' }}>
        {rank + 1}
      </span>

      {/* Callsign */}
      <div>
        <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text)', fontFamily: 'monospace' }}>
          {flight.callsign || '—'}
        </div>
        <div style={{ fontSize: '8px', color: 'var(--text3)' }}>
          {flight.originCountry}
        </div>
      </div>

      {/* Altitude bar */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color, fontFamily: 'monospace', minWidth: '44px' }}>
            {altitudeLabel(flight.altitude)}
          </span>
          <div style={{
            flex: 1,
            height: '4px',
            background: 'var(--surf3)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${altPct}%`,
              height: '100%',
              background: color,
              borderRadius: '2px',
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      </div>

      {/* Speed */}
      <div style={{ fontSize: '10px', color: 'var(--text2)', textAlign: 'right', fontFamily: 'monospace' }}>
        {speedLabel(flight.velocity)}
      </div>

      {/* Heading */}
      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
        <span style={{ fontSize: '12px', display: 'inline-block', transform: `rotate(${flight.heading}deg)` }}>
          ↑
        </span>
        <span style={{ fontSize: '9px', color: 'var(--text3)', fontFamily: 'monospace' }}>
          {flight.heading.toFixed(0)}°
        </span>
      </div>
    </motion.div>
  )
}

// ── Altitude legend ───────────────────────────────────────────────────────────
function AltitudeLegend() {
  const levels = [
    { color: '#f59e0b', label: '< 3 km' },
    { color: '#10b981', label: '3–7 km' },
    { color: '#60a5fa', label: '7–10 km' },
    { color: '#818cf8', label: '> 10 km' },
  ]
  return (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
      {levels.map(l => (
        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: 'var(--text3)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: l.color }} />
          <span>{l.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main FlightTracker export ──────────────────────────────────────────────────
export default function FlightTracker() {
  const [flights, setFlights] = useState<Flight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [sortBy, setSortBy] = useState<'altitude' | 'speed'>('altitude')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await apiFetch('/api/flights')
      const d = await r.json()
      const raw: any[] = d.flights ?? d.states ?? []
      const mapped: Flight[] = raw
        .filter((f: any) => f != null)
        .map((f: any) => ({
          icao24:        f.icao24 ?? f[0] ?? '',
          callsign:      (f.callsign ?? f[1] ?? '').trim(),
          originCountry: f.origin_country ?? f[2] ?? 'Unknown',
          longitude:     f.longitude ?? f[5] ?? 0,
          latitude:      f.latitude ?? f[6] ?? 0,
          altitude:      f.baro_altitude ?? f.geo_altitude ?? f[7] ?? f[13] ?? 0,
          onGround:      f.on_ground ?? f[8] ?? false,
          velocity:      f.velocity ?? f[9] ?? 0,
          heading:       f.true_track ?? f[10] ?? 0,
        }))
        .filter(f => !f.onGround && f.altitude > 0)
      setFlights(mapped)
      setLastUpdated(new Date())
    } catch {
      setError('Unable to fetch flight data. Check API connectivity.')
      setFlights([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-load on mount
  useEffect(() => { load() }, [load])

  const sorted = [...flights]
    .sort((a, b) => sortBy === 'altitude' ? b.altitude - a.altitude : b.velocity - a.velocity)
    .slice(0, 20)

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>
          ✈️ Live Flight Tracker
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {lastUpdated && (
            <span style={{ fontSize: '9px', color: 'var(--text3)' }}>
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            style={{
              height: '26px', padding: '0 12px', borderRadius: '6px',
              background: 'var(--accent)', border: 'none', color: '#fff',
              fontSize: '11px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Altitude legend */}
      <AltitudeLegend />

      {/* Stats bar */}
      {flights.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '12px',
          padding: '8px 12px',
          background: 'var(--surf2)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: '10px', color: 'var(--text3)' }}>
            <span style={{ fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>{flights.length}</span> airborne
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text3)' }}>
            Avg alt: <span style={{ fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>
              {(flights.reduce((s, f) => s + f.altitude, 0) / flights.length / 1000).toFixed(1)} km
            </span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text3)' }}>
            Max alt: <span style={{ fontWeight: 700, color: '#818cf8', fontFamily: 'monospace' }}>
              {(Math.max(...flights.map(f => f.altitude)) / 1000).toFixed(1)} km
            </span>
          </div>
          {/* Sort toggle */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
            {(['altitude', 'speed'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                style={{
                  padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 700,
                  border: '1px solid var(--border2)', cursor: 'pointer',
                  background: sortBy === s ? 'var(--accent)' : 'transparent',
                  color: sortBy === s ? '#fff' : 'var(--text3)',
                  textTransform: 'uppercase', letterSpacing: '0.3px',
                }}
              >
                Sort: {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Column headers */}
      {sorted.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '20px 90px 1fr 80px 80px',
          gap: '8px',
          padding: '4px 10px',
          marginBottom: '4px',
        }}>
          <span style={{ fontSize: '8px', color: 'var(--text3)', textTransform: 'uppercase' }}>#</span>
          <span style={{ fontSize: '8px', color: 'var(--text3)', textTransform: 'uppercase' }}>Callsign</span>
          <span style={{ fontSize: '8px', color: 'var(--text3)', textTransform: 'uppercase' }}>Altitude</span>
          <span style={{ fontSize: '8px', color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'right' }}>Speed</span>
          <span style={{ fontSize: '8px', color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'right' }}>Hdg</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '12px', background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', color: 'var(--text3)', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!flights.length && !loading && !error && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
          Hit Refresh to fetch live flight data.
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{
              height: '44px', background: 'var(--surf2)', border: '1px solid var(--border)',
              borderRadius: '7px', opacity: 0.5,
            }} />
          ))}
        </div>
      )}

      {/* Flights list */}
      {!loading && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
          maxHeight: '520px',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border) transparent',
        }}>
          <AnimatePresence initial={false}>
            {sorted.map((flight, i) => (
              <FlightRow key={flight.icao24 + flight.callsign} flight={flight} rank={i} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {flights.length > 0 && (
        <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text3)', textAlign: 'right' }}>
          Showing top {sorted.length} of {flights.length} airborne
        </div>
      )}
    </div>
  )
}
