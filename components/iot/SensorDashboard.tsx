'use client'

// SensorDashboard.tsx — Grid of IoT sensor cards with live-updating demo values,
// threshold pulse glow animations, sparkline placeholders, and min/max ranges.
// Also shows a Weather Station card from the Zustand store or /api/weather fallback.

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { apiFetch } from '@/lib/apiFetch'
import { useStore } from '@/store/useStore'

interface Sensor {
  id:        string
  name:      string
  icon:      string
  unit:      string
  value:     number
  min:       number
  max:       number
  threshold: number
  location:  string
  color:     string
}

interface WeatherData {
  current?: {
    temperature_2m?: number
    relative_humidity_2m?: number
    wind_speed_10m?: number
    weather_code?: number
    apparent_temperature?: number
  }
  hourly?: {
    time?: string[]
    temperature_2m?: number[]
  }
}

const INITIAL_SENSORS: Sensor[] = [
  { id: 's1', name: 'Temperature',  icon: '🌡️', unit: '°C',  value: 22.4, min: 15,   max: 45,    threshold: 40,   location: 'Server Room',    color: '#f59e0b' },
  { id: 's2', name: 'Humidity',     icon: '💧', unit: '%',   value: 58.2, min: 30,   max: 90,    threshold: 80,   location: 'Main Lab',       color: '#818cf8' },
  { id: 's3', name: 'Motion',       icon: '🚶', unit: 'det', value: 0,    min: 0,    max: 1,     threshold: 1,    location: 'Hallway B',      color: '#c4485a' },
  { id: 's4', name: 'Door Sensor',  icon: '🚪', unit: '',    value: 0,    min: 0,    max: 1,     threshold: 1,    location: 'East Entrance',  color: '#d4956a' },
  { id: 's5', name: 'Smoke',        icon: '🔥', unit: 'ppm', value: 4.2,  min: 0,    max: 200,   threshold: 50,   location: 'Kitchen',        color: '#ef4444' },
  { id: 's6', name: 'Light Level',  icon: '💡', unit: 'lux', value: 420,  min: 0,    max: 2000,  threshold: 1800, location: 'Greenhouse',     color: '#fbbf24' },
  { id: 's7', name: 'Air Quality',  icon: '🌬️', unit: 'ppm', value: 420,  min: 300,  max: 2000,  threshold: 1000, location: 'Office Area',    color: '#10b981' },
  { id: 's8', name: 'Pressure',     icon: '📊', unit: 'hPa', value: 1013, min: 950,  max: 1100,  threshold: 1080, location: 'Weather Station',color: '#6875a0' },
]

// ── WMO weather code → description ───────────────────────────────────────────
function weatherCodeDesc(code: number): string {
  if (code === 0)            return 'Clear sky'
  if (code <= 3)             return 'Partly cloudy'
  if (code <= 9)             return 'Haze / fog'
  if (code <= 19)            return 'Precipitation'
  if (code <= 29)            return 'Thunderstorm (old obs)'
  if (code <= 39)            return 'Dust / sand storm'
  if (code <= 49)            return 'Fog'
  if (code <= 59)            return 'Drizzle'
  if (code <= 69)            return 'Rain'
  if (code <= 79)            return 'Snow'
  if (code <= 84)            return 'Rain showers'
  if (code <= 94)            return 'Snow showers'
  if (code <= 99)            return 'Thunderstorm'
  return 'Unknown'
}

function weatherCodeIcon(code: number): string {
  if (code === 0)            return '☀️'
  if (code <= 3)             return '⛅'
  if (code <= 49)            return '🌫️'
  if (code <= 69)            return '🌧️'
  if (code <= 79)            return '❄️'
  if (code <= 84)            return '🌦️'
  if (code <= 94)            return '🌨️'
  if (code <= 99)            return '⛈️'
  return '🌡️'
}

function SparklinePlaceholder({ color }: { color: string }) {
  const points = Array.from({ length: 12 }, (_, i) => {
    const x = (i / 11) * 80
    const y = 12 - Math.sin(i * 0.8 + Math.random() * 0.5) * 5 - Math.random() * 3
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
    </svg>
  )
}

// ── Hourly temperature mini bar chart ─────────────────────────────────────────
function HourlyBars({ temps, times }: { temps: number[]; times: string[] }) {
  const slice = temps.slice(0, 24)
  const min = Math.min(...slice)
  const max = Math.max(...slice)
  const range = Math.max(1, max - min)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '32px', marginTop: '6px' }}>
      {slice.map((t, i) => {
        const pct = ((t - min) / range) * 100
        const color = t > 35 ? '#ef4444' : t > 25 ? '#f59e0b' : t > 15 ? '#10b981' : '#818cf8'
        const hour = times[i] ? new Date(times[i]).getHours() : i
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
            <div
              style={{
                width: '100%',
                height: `${Math.max(4, (pct / 100) * 24)}px`,
                background: color,
                borderRadius: '2px',
                opacity: 0.8,
              }}
              title={`${hour}:00 — ${t.toFixed(1)}°C`}
            />
          </div>
        )
      })}
    </div>
  )
}

// ── Weather Station Card ───────────────────────────────────────────────────────
function WeatherStationCard({ weather }: { weather: WeatherData | null }) {
  if (!weather?.current) {
    return (
      <motion.div
        style={{
          background: 'var(--surf2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r)',
          padding: '12px',
          gridColumn: 'span 1',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <span style={{ fontSize: '14px' }}>🌤️</span>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text2)' }}>Weather Station</div>
            <div style={{ fontSize: '8px', color: 'var(--text3)' }}>Outdoor</div>
          </div>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text3)', fontStyle: 'italic' }}>
          Loading weather…
        </div>
      </motion.div>
    )
  }

  const c = weather.current
  const temp = c.temperature_2m ?? 0
  const humidity = c.relative_humidity_2m ?? 0
  const windSpeed = c.wind_speed_10m ?? 0
  const code = c.weather_code ?? 0
  const feels = c.apparent_temperature ?? temp

  const isHot  = temp > 37.8  // 100°F
  const isWindy = windSpeed > 64.4  // 40mph in km/h
  const isStorm = code >= 95

  const alertColor = isStorm ? '#ef4444' : isHot ? '#f59e0b' : isWindy ? '#818cf8' : null

  return (
    <motion.div
      animate={alertColor ? {
        boxShadow: ['0 0 0 1px var(--border)', `0 0 8px 2px ${alertColor}66`, '0 0 0 1px var(--border)'],
      } : { boxShadow: '0 0 0 1px var(--border)' }}
      transition={alertColor ? { duration: 1.5, repeat: Infinity } : {}}
      style={{
        background: 'var(--surf2)',
        border: `1px solid ${alertColor ?? 'var(--border)'}`,
        borderRadius: 'var(--r)',
        padding: '12px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <span style={{ fontSize: '14px' }}>{weatherCodeIcon(code)}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text2)' }}>Weather Station</div>
          <div style={{ fontSize: '8px', color: 'var(--text3)' }}>{weatherCodeDesc(code)}</div>
        </div>
        {alertColor && (
          <span style={{
            fontSize: '8px', fontWeight: 700, color: alertColor,
            background: `${alertColor}22`, padding: '1px 5px', borderRadius: '3px',
          }}>
            ALERT
          </span>
        )}
      </div>

      {/* Main temp */}
      <div style={{ fontSize: '24px', fontWeight: 900, color: isHot ? '#f59e0b' : 'var(--text)', marginBottom: '4px', fontFamily: 'monospace' }}>
        {temp.toFixed(1)}<span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text2)', marginLeft: '3px' }}>°C</span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '9px', color: 'var(--text3)' }}>
          <span style={{ color: 'var(--text2)', fontWeight: 700 }}>{humidity}%</span> humidity
        </div>
        <div style={{ fontSize: '9px', color: 'var(--text3)' }}>
          <span style={{ color: isWindy ? '#818cf8' : 'var(--text2)', fontWeight: 700 }}>{windSpeed.toFixed(1)}</span> km/h wind
        </div>
        <div style={{ fontSize: '9px', color: 'var(--text3)' }}>
          feels <span style={{ color: 'var(--text2)', fontWeight: 700 }}>{feels.toFixed(1)}°C</span>
        </div>
      </div>

      {/* Hourly forecast bars */}
      {weather.hourly?.temperature_2m && weather.hourly.time && (
        <HourlyBars
          temps={weather.hourly.temperature_2m.slice(0, 24)}
          times={weather.hourly.time.slice(0, 24)}
        />
      )}

      <div style={{ marginTop: '4px', fontSize: '8px', color: 'var(--text3)' }}>
        Updated {new Date().toLocaleTimeString()}
      </div>
    </motion.div>
  )
}

export default function SensorDashboard() {
  const [sensors, setSensors] = useState<Sensor[]>(INITIAL_SENSORS)
  const [localWeather, setLocalWeather] = useState<WeatherData | null>(null)

  // Read weather from Zustand store (typed as any, field added by GlobalDataLoader)
  const storeWeather = useStore((s) => (s as any).weather as WeatherData | null ?? null)

  const weather = storeWeather ?? localWeather

  // If store doesn't have weather yet, fetch locally
  useEffect(() => {
    if (!storeWeather && !localWeather) {
      apiFetch('/api/weather?lat=34.05&lon=-118.24')
        .then(r => r.json())
        .then((d: WeatherData) => setLocalWeather(d))
        .catch(() => {/* graceful fail */})
    }
  }, [storeWeather, localWeather])

  // Simulate sensor value updates
  useEffect(() => {
    const id = setInterval(() => {
      setSensors((prev) => prev.map((s) => {
        if (s.unit === 'det' || s.unit === '') {
          return Math.random() < 0.02 ? { ...s, value: s.value === 0 ? 1 : 0 } : s
        }
        const delta = (Math.random() - 0.5) * (s.max - s.min) * 0.01
        const next  = Math.max(s.min, Math.min(s.max, s.value + delta))
        return { ...s, value: next }
      }))
    }, 1200)
    return () => clearInterval(id)
  }, [])

  const formatValue = (s: Sensor) => {
    if (s.unit === 'det')  return s.value >= 1 ? 'DETECTED' : 'CLEAR'
    if (s.unit === '')     return s.value >= 1 ? 'OPEN' : 'CLOSED'
    if (Number.isInteger(s.value) || Math.abs(s.value) >= 100) return s.value.toFixed(0)
    return s.value.toFixed(1)
  }

  const isAlert = (s: Sensor) => s.value >= s.threshold

  const totalDevices = sensors.length + 1  // +1 for weather station

  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
        Sensor Network — {totalDevices} Devices
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {/* Weather Station card — first */}
        <WeatherStationCard weather={weather} />

        {/* Regular sensors */}
        {sensors.map((s) => {
          const alert    = isAlert(s)
          const pct      = Math.max(0, Math.min(100, ((s.value - s.min) / (s.max - s.min)) * 100))
          const boolVal  = s.unit === 'det' || s.unit === ''

          return (
            <motion.div
              key={s.id}
              animate={alert ? {
                boxShadow: ['0 0 0 1px var(--border)', `0 0 8px 2px ${s.color}66`, '0 0 0 1px var(--border)'],
              } : { boxShadow: '0 0 0 1px var(--border)' }}
              transition={alert ? { duration: 1.5, repeat: Infinity } : {}}
              style={{
                background:   'var(--surf2)',
                border:       `1px solid ${alert ? s.color : 'var(--border)'}`,
                borderRadius: 'var(--r)',
                padding:      '12px',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontSize: '14px' }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text2)' }}>{s.name}</div>
                  <div style={{ fontSize: '8px', color: 'var(--text3)' }}>{s.location}</div>
                </div>
                {alert && (
                  <span style={{ marginLeft: 'auto', fontSize: '8px', fontWeight: 700, color: s.color, background: `${s.color}22`, padding: '1px 5px', borderRadius: '3px' }}>
                    ALERT
                  </span>
                )}
              </div>

              {/* Value */}
              <div style={{ fontSize: boolVal ? '16px' : '24px', fontWeight: 900, color: alert ? s.color : 'var(--text)', marginBottom: '4px', fontFamily: 'monospace' }}>
                {formatValue(s)}{!boolVal && <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text2)', marginLeft: '3px' }}>{s.unit}</span>}
              </div>

              {/* Sparkline */}
              {!boolVal && (
                <div style={{ marginBottom: '6px' }}>
                  <SparklinePlaceholder color={s.color} />
                </div>
              )}

              {/* Range bar */}
              {!boolVal && (
                <div>
                  <div style={{ height: '3px', background: 'var(--surf3)', borderRadius: '2px', overflow: 'hidden', marginBottom: '3px' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: s.color, borderRadius: '2px', transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '8px', color: 'var(--text3)' }}>min {s.min}{s.unit}</span>
                    <span style={{ fontSize: '8px', color: 'var(--text3)' }}>max {s.max}{s.unit}</span>
                  </div>
                </div>
              )}

              {/* Last updated */}
              <div style={{ marginTop: '4px', fontSize: '8px', color: 'var(--text3)' }}>
                Updated {new Date().toLocaleTimeString()}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
