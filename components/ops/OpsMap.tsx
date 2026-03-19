'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useStore } from '@/store/useStore'

// ── Quake colours by magnitude ─────────────────────────────────────────────
function quakeColor(mag: number): string {
  if (mag >= 6)  return '#ef4444'
  if (mag >= 5)  return '#f59e0b'
  if (mag >= 4)  return '#a78bfa'
  return '#6875a0'
}

interface Quake {
  id:    string
  lat:   number
  lng:   number
  mag:   number
  place: string
  time:  number
}

interface Fire {
  lat:        number
  lng:        number
  brightness: number
  acq_date:   string
}

interface Flight {
  icao:    string
  callsign: string
  lat:     number
  lng:     number
  alt:     number
  vel:     number
  hdg:     number
}

async function fetchQuakes(): Promise<Quake[]> {
  try {
    const r = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson')
    const d = await r.json()
    return (d.features ?? []).map((f: any) => ({
      id:    f.id,
      lat:   f.geometry.coordinates[1],
      lng:   f.geometry.coordinates[0],
      mag:   f.properties.mag ?? 0,
      place: f.properties.place ?? '',
      time:  f.properties.time ?? 0,
    }))
  } catch { return [] }
}

async function fetchFlights(): Promise<Flight[]> {
  try {
    const r = await fetch('https://opensky-network.org/api/states/all', { signal: AbortSignal.timeout(10000) })
    const d = await r.json()
    return ((d.states ?? []) as any[][])
      .filter((s) => s[5] !== null && s[6] !== null)
      .slice(0, 800)  // cap to avoid overloading the map
      .map((s) => ({
        icao:    s[0] ?? '',
        callsign: (s[1] ?? '').trim(),
        lat:     s[6],
        lng:     s[5],
        alt:     s[13] ?? s[7] ?? 0,
        vel:     s[9] ?? 0,
        hdg:     s[10] ?? 0,
      }))
  } catch { return [] }
}

async function fetchFires(firmsKey: string): Promise<Fire[]> {
  if (!firmsKey) return []
  try {
    // FIRMS CSV → parse manually (lightweight)
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${firmsKey}/MODIS_NRT/world/1`
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) })
    const txt = await r.text()
    const lines = txt.trim().split('\n').slice(1)  // skip header
    return lines.slice(0, 500).map((l) => {
      const [lat, lng, brightness, , acq_date] = l.split(',')
      return { lat: +lat, lng: +lng, brightness: +brightness, acq_date }
    }).filter((f) => !isNaN(f.lat) && !isNaN(f.lng))
  } catch { return [] }
}

// ── Layer types ───────────────────────────────────────────────────────────
type LayerKey = 'quakes' | 'flights' | 'fires'

const LAYER_META: Record<LayerKey, { label: string; icon: string; needsKey?: string }> = {
  quakes:  { label: 'Quakes',  icon: '🔴' },
  flights: { label: 'Flights', icon: '✈️' },
  fires:   { label: 'Fires',   icon: '🔥', needsKey: 'firmsKey' },
}

export default function OpsMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const layerRefs    = useRef<Record<string, any>>({})

  const firmsKey = useStore((s) => s.settings.firmsKey)

  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(new Set<LayerKey>(['quakes']))
  const [layerLoading, setLayerLoading] = useState<Record<string, boolean>>({})

  const toggleLayer = useCallback(async (key: LayerKey) => {
    const map = mapRef.current
    if (!map) return

    setActiveLayers((prev) => {
      const next = new Set<LayerKey>(prev)
      if (next.has(key)) {
        // Remove layer
        if (layerRefs.current[key]) {
          map.removeLayer(layerRefs.current[key])
          delete layerRefs.current[key]
        }
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  // Load layers when activeLayers changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    import('leaflet').then((L) => {
      activeLayers.forEach(async (key) => {
        if (layerRefs.current[key]) return  // already loaded
        setLayerLoading((p) => ({ ...p, [key]: true }))

        if (key === 'quakes') {
          const quakes = await fetchQuakes()
          const group = L.layerGroup()
          quakes.filter((q) => q.mag >= 2.5).forEach((q) => {
            L.circleMarker([q.lat, q.lng], {
              radius: Math.max(4, q.mag * 3),
              color: quakeColor(q.mag), fillColor: quakeColor(q.mag),
              fillOpacity: 0.5, weight: 1,
            })
              .addTo(group)
              .bindPopup(`<b>M${q.mag.toFixed(1)}</b><br>${q.place}<br><small>${new Date(q.time).toUTCString()}</small>`)
          })
          group.addTo(map)
          layerRefs.current[key] = group

        } else if (key === 'flights') {
          const flights = await fetchFlights()
          const group = L.layerGroup()
          flights.forEach((f) => {
            const hdgRad = ((f.hdg ?? 0) * Math.PI) / 180
            const marker = L.circleMarker([f.lat, f.lng], {
              radius: 3, color: '#4f6ef7', fillColor: '#4f6ef7', fillOpacity: 0.7, weight: 1,
            }).bindPopup(
              `<b>${f.callsign || f.icao || '?'}</b><br>Alt: ${Math.round(f.alt)}m · ${Math.round(f.vel * 3.6)} km/h`
            )
            marker.addTo(group)
          })
          group.addTo(map)
          layerRefs.current[key] = group

        } else if (key === 'fires') {
          const fires = await fetchFires(firmsKey)
          const group = L.layerGroup()
          fires.forEach((f) => {
            L.circleMarker([f.lat, f.lng], {
              radius: 3, color: '#f97316', fillColor: '#f97316', fillOpacity: 0.6, weight: 0,
            })
              .addTo(group)
              .bindPopup(`<b>🔥 Fire</b><br>Brightness: ${f.brightness}K<br>${f.acq_date}`)
          })
          group.addTo(map)
          layerRefs.current[key] = group
        }

        setLayerLoading((p) => ({ ...p, [key]: false }))
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayers, firmsKey])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id
    }
    if (mapRef.current) return

    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!, {
        center: [20, 0], zoom: 2,
        zoomControl: true, attributionControl: false,
      })
      mapRef.current = map

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { subdomains: 'abcd', maxZoom: 18 }
      ).addTo(map)

      // Initial quake layer
      fetchQuakes().then((quakes) => {
        const group = L.layerGroup()
        quakes.filter((q) => q.mag >= 2.5).forEach((q) => {
          L.circleMarker([q.lat, q.lng], {
            radius: Math.max(4, q.mag * 3),
            color: quakeColor(q.mag), fillColor: quakeColor(q.mag),
            fillOpacity: 0.5, weight: 1,
          })
            .addTo(group)
            .bindPopup(`<b>M${q.mag.toFixed(1)}</b><br>${q.place}<br><small>${new Date(q.time).toUTCString()}</small>`)
        })
        group.addTo(map)
        layerRefs.current['quakes'] = group
      })
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        layerRefs.current = {}
      }
      if (containerRef.current) {
        delete (containerRef.current as any)._leaflet_id
      }
    }
  }, [])

  return (
    <div style={{ marginTop: '18px' }}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* Header + layer toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '11px', fontWeight: 700, color: 'var(--text3)',
          textTransform: 'uppercase', letterSpacing: '.5px',
        }}>
          🌍 Live Map
        </span>

        {(Object.keys(LAYER_META) as LayerKey[]).map((key) => {
          const meta    = LAYER_META[key]
          const active  = activeLayers.has(key)
          const loading = layerLoading[key]
          const locked  = meta.needsKey === 'firmsKey' && !firmsKey
          return (
            <button
              key={key}
              onClick={() => !locked && toggleLayer(key)}
              title={locked ? 'Add NASA FIRMS key in Settings to enable fire layer' : undefined}
              style={{
                height: '26px', padding: '0 10px', borderRadius: '6px',
                fontSize: '10.5px', fontWeight: 700, cursor: locked ? 'default' : 'pointer',
                border: '1px solid var(--border2)',
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : locked ? 'var(--text3)' : 'var(--text2)',
                opacity: locked ? 0.45 : 1,
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <span style={{ fontSize: '12px' }}>{meta.icon}</span>
              {loading ? '…' : meta.label}
            </button>
          )
        })}
      </div>

      {/* Quake legend */}
      {activeLayers.has('quakes') && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {[
            { color: '#ef4444', label: 'M6+' },
            { color: '#f59e0b', label: 'M5–6' },
            { color: '#a78bfa', label: 'M4–5' },
            { color: '#6875a0', label: 'M2.5–4' },
          ].map((l) => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text3)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color, display: 'inline-block' }} />
              {l.label}
            </span>
          ))}
          {activeLayers.has('flights') && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text3)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4f6ef7', display: 'inline-block' }} />
              Flights
            </span>
          )}
          {activeLayers.has('fires') && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text3)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
              Fire hotspots
            </span>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          width: '100%', height: '420px',
          borderRadius: '10px', overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
      />

      {!firmsKey && (
        <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text3)' }}>
          🔥 Add a NASA FIRMS key in Settings to enable the fire hotspot layer.
        </div>
      )}
    </div>
  )
}
