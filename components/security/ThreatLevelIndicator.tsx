'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { CHART } from '@/lib/chartTheme'

type ThreatLevel = 'LOW' | 'GUARDED' | 'ELEVATED' | 'HIGH' | 'SEVERE'

const LEVELS: { id: ThreatLevel; color: string; bg: string; desc: string }[] = [
  { id: 'LOW',      color: CHART.emerald, bg: '#052e1c', desc: 'Minimal threat activity detected' },
  { id: 'GUARDED',  color: CHART.teal,    bg: '#062028', desc: 'General threat conditions apply' },
  { id: 'ELEVATED', color: CHART.gold,    bg: '#2a1a04', desc: 'Significant threat environment' },
  { id: 'HIGH',     color: CHART.orange,  bg: '#2a0e04', desc: 'High risk of hostile activity' },
  { id: 'SEVERE',   color: CHART.red,     bg: '#2a0404', desc: 'Severe risk — imminent threat' },
]

function computeThreatLevel(
  alertCount: number,
  threatIntelCount: number,
  weatherSeverity: number,
): ThreatLevel {
  const score = alertCount * 2 + threatIntelCount + weatherSeverity
  if (score >= 30) return 'SEVERE'
  if (score >= 20) return 'HIGH'
  if (score >= 10) return 'ELEVATED'
  if (score >= 4)  return 'GUARDED'
  return 'LOW'
}

export default function ThreatLevelIndicator() {
  const securityAlerts = useStore((s) => s.securityAlerts)
  const threatIntel    = useStore((s) => s.threatIntel)
  const weather        = useStore((s) => s.weather)

  const currentLevel = useMemo(() => {
    const alertCount = securityAlerts.filter((a) => !a.acknowledged).length
    const intelCount = (threatIntel?.threatfox?.length ?? 0)
    const weatherScore = weather?.alerts?.length ?? 0
    return computeThreatLevel(alertCount, intelCount, weatherScore)
  }, [securityAlerts, threatIntel, weather])

  const idx    = LEVELS.findIndex((l) => l.id === currentLevel)
  const level  = LEVELS[idx]

  return (
    <div style={{
      background: CHART.surf,
      border: `1px solid ${CHART.border}`,
      borderRadius: '10px',
      padding: '16px 20px',
      marginBottom: '16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(135deg, ${level.bg} 0%, ${CHART.surf} 60%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        {/* Pulsing ring + level badge */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            style={{
              position: 'absolute', inset: '-10px',
              borderRadius: '50%',
              border: `2px solid ${level.color}`,
            }}
          />
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: level.bg,
            border: `3px solid ${level.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column',
            boxShadow: `0 0 20px ${level.color}55`,
          }}>
            <span style={{ fontSize: '22px', lineHeight: 1 }}>🛡️</span>
          </div>
        </div>

        {/* Current level text */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '10px', color: CHART.text3, fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Current Threat Level
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: level.color, letterSpacing: '0.05em', lineHeight: 1.1 }}>
            {currentLevel}
          </div>
          <div style={{ fontSize: '11px', color: CHART.text2, marginTop: '3px' }}>
            {level.desc}
          </div>
        </div>

        {/* Level scale */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
          {LEVELS.map((l, i) => {
            const active = l.id === currentLevel
            return (
              <div key={l.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <motion.div
                  animate={active ? { opacity: [1, 0.4, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                  style={{
                    width: '22px',
                    height: `${14 + i * 8}px`,
                    background: i <= idx ? l.color : CHART.surf3,
                    borderRadius: '3px',
                    border: active ? `1px solid ${l.color}` : 'none',
                    boxShadow: active ? `0 0 8px ${l.color}` : 'none',
                  }}
                />
                <span style={{ fontSize: '7px', color: active ? l.color : CHART.text3, fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                  {l.id.slice(0, 3)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
