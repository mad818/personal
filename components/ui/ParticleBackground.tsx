'use client'

// ── components/ui/ParticleBackground.tsx ──────────────────────────────────────
// Subtle floating particle background — dust motes / stars effect
// Very lightweight: pure CSS keyframe animations, no requestAnimationFrame

import { useMemo } from 'react'
import { CHART } from '@/lib/chartTheme'

interface Particle {
  id:        number
  x:         number
  y:         number
  size:      number
  color:     string
  duration:  number
  delay:     number
  driftX:    number
  driftY:    number
}

// Seeded pseudo-random for consistent SSR/client render
function seededRandom(seed: number) {
  let s = seed
  return function() {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

const PARTICLE_COLORS = [CHART.rose, CHART.gold, CHART.blush]

export default function ParticleBackground() {
  const particles = useMemo<Particle[]>(() => {
    const rand = seededRandom(42)
    return Array.from({ length: 36 }, (_, i) => ({
      id:       i,
      x:        rand() * 100,
      y:        rand() * 100,
      size:     rand() * 2 + 1,           // 1–3px
      color:    PARTICLE_COLORS[Math.floor(rand() * PARTICLE_COLORS.length)],
      duration: rand() * 40 + 20,         // 20–60s
      delay:    -(rand() * 40),            // negative = start mid-animation
      driftX:   (rand() - 0.5) * 4,      // ±2vw drift
      driftY:   (rand() - 0.5) * 4,      // ±2vh drift
    }))
  }, [])

  return (
    <>
      <style>{`
        ${particles.map(p => `
          @keyframes particle-drift-${p.id} {
            0%   { transform: translate(0px, 0px) scale(1);   opacity: ${(p.size / 3) * 0.12}; }
            25%  { transform: translate(${p.driftX * 0.5}vw, ${p.driftY * 0.3}vh) scale(1.1); }
            50%  { transform: translate(${p.driftX}vw, ${p.driftY}vh) scale(0.9); opacity: ${(p.size / 3) * 0.08}; }
            75%  { transform: translate(${p.driftX * 0.3}vw, ${p.driftY * 0.7}vh) scale(1.05); }
            100% { transform: translate(0px, 0px) scale(1);   opacity: ${(p.size / 3) * 0.12}; }
          }
        `).join('')}
      `}</style>

      <div
        aria-hidden="true"
        style={{
          position:      'fixed',
          inset:         0,
          pointerEvents: 'none',
          zIndex:        0,
          overflow:      'hidden',
        }}
      >
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position:     'absolute',
              left:         `${p.x}%`,
              top:          `${p.y}%`,
              width:        `${p.size}px`,
              height:       `${p.size}px`,
              borderRadius: '50%',
              background:   p.color,
              animation:    `particle-drift-${p.id} ${p.duration}s ease-in-out ${p.delay}s infinite`,
              boxShadow:    `0 0 ${p.size * 2}px ${p.color}44`,
            }}
          />
        ))}
      </div>
    </>
  )
}
