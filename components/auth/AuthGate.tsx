'use client'

/**
 * AuthGate — Sadie Sink themed token gate.
 * Upgraded with cinematic lock-screen animations.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import { getSessionToken, validateAndStoreToken } from '@/lib/apiFetch'

interface Props {
  children: React.ReactNode
}

// ── Scan-line CSS injected once ────────────────────────────────────────────────
const LOCKSCREEN_CSS = `
@keyframes auth-scanlines {
  0%   { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}
@keyframes auth-heartbeat {
  0%, 100% { box-shadow: 0 0 0 0 rgba(196,72,90,0); border-color: rgba(196,72,90,0.25); }
  30%       { box-shadow: 0 0 20px 4px rgba(196,72,90,0.35), 0 0 60px 10px rgba(107,29,42,0.2); border-color: rgba(196,72,90,0.55); }
  60%       { box-shadow: 0 0 8px 2px rgba(196,72,90,0.12); border-color: rgba(196,72,90,0.35); }
}
@keyframes auth-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
@keyframes auth-biometric {
  0%   { transform: translateY(0%);   opacity: 0.9; }
  45%  { transform: translateY(100%); opacity: 0.9; }
  50%  { transform: translateY(100%); opacity: 0; }
  51%  { transform: translateY(0%);   opacity: 0; }
  55%  { transform: translateY(0%);   opacity: 0.9; }
  100% { transform: translateY(100%); opacity: 0.9; }
}
@keyframes auth-error-flash {
  0%, 100% { border-color: rgba(239,68,68,0.8); box-shadow: 0 0 20px rgba(239,68,68,0.4); }
  50%       { border-color: rgba(239,68,68,0.2); box-shadow: none; }
}
@keyframes auth-success-flash {
  0%   { border-color: rgba(16,185,129,0.8); box-shadow: 0 0 30px rgba(16,185,129,0.5); }
  100% { border-color: rgba(16,185,129,0.2); box-shadow: 0 0 60px rgba(16,185,129,0.2); transform: scale(0.97); opacity: 0; }
}
`

// ── Particle system ────────────────────────────────────────────────────────────
interface Particle {
  id:   number
  x:    number
  y:    number
  vx:   number
  vy:   number
  size: number
  alpha:number
  hue:  number
}

function LockParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas  = canvasRef.current
    if (!canvas) return
    const ctx     = canvas.getContext('2d')
    if (!ctx)     return

    let raf: number
    let particles: Particle[] = []
    const COUNT = 60

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        id:    i,
        x:     Math.random() * canvas.width,
        y:     Math.random() * canvas.height,
        vx:    (Math.random() - 0.5) * 0.6,
        vy:    (Math.random() - 0.5) * 0.6,
        size:  Math.random() * 2.2 + 0.4,
        alpha: Math.random() * 0.7 + 0.1,
        hue:   Math.random() > 0.5 ? 350 : 20, // rose or gold
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0)              p.x = canvas.width
        if (p.x > canvas.width)   p.x = 0
        if (p.y < 0)              p.y = canvas.height
        if (p.y > canvas.height)  p.y = 0

        // Draw line connections
        for (const q of particles) {
          const dx = p.x - q.x
          const dy = p.y - q.y
          const d  = Math.sqrt(dx * dx + dy * dy)
          if (d < 100) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(q.x, q.y)
            ctx.strokeStyle = `hsla(${p.hue}, 65%, 50%, ${(1 - d / 100) * 0.12})`
            ctx.lineWidth   = 0.5
            ctx.stroke()
          }
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 70%, 55%, ${p.alpha})`
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      aria-hidden="true"
    />
  )
}

// ── Typing effect hook ─────────────────────────────────────────────────────────
function useTypingText(text: string, delay = 40) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    setDisplayed('')
    let i = 0
    const timer = setInterval(() => {
      if (i >= text.length) { clearInterval(timer); return }
      setDisplayed(text.slice(0, i + 1))
      i++
    }, delay)
    return () => clearInterval(timer)
  }, [text, delay])

  return displayed
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AuthGate({ children }: Props) {
  const [authed,  setAuthed]  = useState<boolean | null>(null)
  const [token,   setToken]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [cardState, setCardState] = useState<'idle' | 'error' | 'success'>('idle')

  const typedSubtitle = useTypingText('Autonomous Intelligence Command Center', 38)
  const lockControls  = useAnimationControls()

  useEffect(() => {
    const existing = getSessionToken()
    if (existing) {
      fetch('/api/token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token: existing }),
      })
        .then((r) => r.json())
        .then((d) => setAuthed(!!d.ok))
        .catch(() => setAuthed(false))
    } else {
      setAuthed(false)
    }
  }, [])

  const submit = useCallback(async () => {
    if (!token.trim()) { setError('Enter your access token.'); return }
    setLoading(true)
    setError('')

    // Animate lock while validating
    await lockControls.start({
      rotate: [0, -15, 15, -10, 10, 0],
      scale:  [1, 1.15, 1.15, 1.1, 1.1, 1],
      transition: { duration: 0.5 },
    })

    const ok = await validateAndStoreToken(token.trim())
    if (ok) {
      setCardState('success')
      await lockControls.start({ rotate: 20, scale: 1.3, transition: { duration: 0.3 } })
      setTimeout(() => setAuthed(true), 800)
    } else {
      setError('Invalid token. Check your .env.local NEXUS_TOKEN.')
      setCardState('error')
      setTimeout(() => setCardState('idle'), 1000)
    }
    setLoading(false)
  }, [token, lockControls])

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit()
  }, [submit])

  // Still checking sessionStorage
  if (authed === null) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0708',
      }}>
        <span style={{ color: 'rgba(122,107,98,0.7)', fontSize: '13px' }}>Checking session…</span>
      </div>
    )
  }

  // Authenticated — show the app
  if (authed) return <>{children}</>

  // ── Lock screen ────────────────────────────────────────────────────────────
  const cardAnimStyle: React.CSSProperties =
    cardState === 'error'
      ? { animation: 'auth-error-flash 0.18s ease 4' }
      : cardState === 'success'
        ? { animation: 'auth-success-flash 0.6s ease forwards' }
        : { animation: 'auth-heartbeat 2.8s ease-in-out infinite' }

  return (
    <div style={{
      minHeight:   '100vh',
      display:     'flex',
      alignItems:  'center',
      justifyContent: 'center',
      background:  'var(--bg)',
      fontFamily:  'var(--font-sans, system-ui, sans-serif)',
      position:    'relative',
      overflow:    'hidden',
    }}>
      <style dangerouslySetInnerHTML={{ __html: LOCKSCREEN_CSS }} />

      {/* Particle field */}
      <LockParticles />

      {/* Background portrait */}
      <div style={{
        position:           'absolute',
        inset:              0,
        backgroundImage:    'url(/theme/sadie-portrait.jpg)',
        backgroundSize:     'cover',
        backgroundPosition: 'center 20%',
        opacity:            0.12,
        filter:             'blur(2px) saturate(0.5)',
        zIndex:             1,
      }} />

      {/* Deep vignette + gradient overlay */}
      <div style={{
        position:   'absolute',
        inset:      0,
        background: `
          radial-gradient(ellipse 60% 60% at 50% 45%, rgba(107,29,42,0.12) 0%, transparent 65%),
          radial-gradient(ellipse 100% 80% at 50% 50%, transparent 0%, rgba(10,7,8,0.85) 70%),
          linear-gradient(180deg, rgba(10,7,8,0.5) 0%, rgba(10,7,8,0.95) 100%)
        `,
        zIndex:     2,
      }} />

      {/* Animated scan lines overlay */}
      <div
        aria-hidden="true"
        style={{
          position:   'absolute',
          inset:      0,
          zIndex:     3,
          overflow:   'hidden',
          pointerEvents: 'none',
        }}
      >
        {/* Moving scan line */}
        <div style={{
          position:         'absolute',
          left:             0,
          right:            0,
          height:           '2px',
          background:       'linear-gradient(90deg, transparent 0%, rgba(196,72,90,0.15) 30%, rgba(196,72,90,0.3) 50%, rgba(196,72,90,0.15) 70%, transparent 100%)',
          animation:        'auth-scanlines 6s linear infinite',
          top:              0,
        }} />
        {/* Subtle horizontal line texture */}
        <div style={{
          position:         'absolute',
          inset:            0,
          backgroundImage:  'repeating-linear-gradient(0deg, rgba(196,72,90,0.025) 0px, transparent 1px, transparent 3px)',
          pointerEvents:    'none',
        }} />
      </div>

      {/* Card */}
      <div style={{
        width:          '390px',
        background:     'rgba(14, 10, 11, 0.88)',
        border:         `1px solid rgba(196,72,90,0.25)`,
        borderRadius:   '18px',
        padding:        '40px 32px',
        display:        'flex',
        flexDirection:  'column',
        gap:            '22px',
        backdropFilter: 'blur(24px)',
        boxShadow:      '0 0 80px rgba(107,29,42,.12), 0 30px 80px rgba(0,0,0,.7)',
        position:       'relative',
        zIndex:         10,
        ...cardAnimStyle,
      }}>
        {/* Biometric scan line — visible when loading */}
        <AnimatePresence>
          {loading && (
            <div style={{
              position:       'absolute',
              inset:          0,
              borderRadius:   '18px',
              overflow:       'hidden',
              pointerEvents:  'none',
              zIndex:         20,
            }}>
              <motion.div
                initial={{ top: 0 }}
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                style={{
                  position:   'absolute',
                  left:       0,
                  right:      0,
                  height:     '3px',
                  background: 'linear-gradient(90deg, transparent, rgba(196,72,90,0.9), rgba(212,149,106,0.7), rgba(196,72,90,0.9), transparent)',
                  boxShadow:  '0 0 12px rgba(196,72,90,0.6)',
                }}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          {/* Animated lock */}
          <motion.div
            animate={lockControls}
            style={{
              fontSize:    '36px',
              marginBottom:'10px',
              display:     'inline-block',
              filter:      'drop-shadow(0 0 10px rgba(196,72,90,0.5))',
            }}
          >
            🔐
          </motion.div>
          <div style={{
            fontWeight:     900,
            fontSize:       '22px',
            letterSpacing:  '3px',
            textTransform:  'uppercase',
            background:     'linear-gradient(135deg, #f5e6ea 0%, #c4485a 60%, #d4956a 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor:  'transparent',
            marginBottom:   '8px',
          }}>
            NEXUS PRIME
          </div>
          {/* Typing subtitle */}
          <div style={{
            fontSize:   '11px',
            color:      'rgba(184,169,158,0.7)',
            fontStyle:  'italic',
            minHeight:  '16px',
            letterSpacing: '0.3px',
          }}>
            {typedSubtitle}
            <span style={{
              display:   'inline-block',
              width:     '1px',
              height:    '11px',
              background:'rgba(196,72,90,0.8)',
              marginLeft:'1px',
              verticalAlign:'middle',
              animation: 'auth-blink 1s step-end infinite',
            }} />
          </div>
          {/* ACCESS LEVEL tag */}
          <div style={{
            marginTop:     '10px',
            fontSize:      '9px',
            fontWeight:    900,
            letterSpacing: '2px',
            color:         'rgba(212,149,106,0.55)',
            textTransform: 'uppercase',
          }}>
            ACCESS LEVEL: CLASSIFIED
            <span style={{
              display:   'inline-block',
              width:     '6px',
              height:    '11px',
              background:'rgba(212,149,106,0.6)',
              marginLeft:'2px',
              verticalAlign:'middle',
              animation: 'auth-blink 0.9s step-end infinite',
            }} />
          </div>
        </div>

        {/* Token input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{
            fontSize:      '10px',
            fontWeight:    700,
            color:         'rgba(184,169,158,0.6)',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
          }}>
            Access Token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Paste your NEXUS_TOKEN…"
            autoFocus
            style={{
              background:   'rgba(20, 14, 15, 0.8)',
              border:       `1px solid ${error ? '#ef4444' : 'rgba(196,72,90,0.22)'}`,
              borderRadius: '10px',
              color:        'rgba(236,229,223,0.9)',
              fontSize:     '13px',
              padding:      '12px 14px',
              outline:      'none',
              width:        '100%',
              boxSizing:    'border-box',
              fontFamily:   'monospace',
              transition:   'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(196,72,90,0.55)'
              e.currentTarget.style.boxShadow   = '0 0 16px rgba(196,72,90,0.14)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = error ? '#ef4444' : 'rgba(196,72,90,0.22)'
              e.currentTarget.style.boxShadow   = 'none'
            }}
          />
          <AnimatePresence>
            {error && (
              <motion.span
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{   opacity: 0, y: -4 }}
                style={{ fontSize: '11px', color: '#ef4444' }}
              >
                {error}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Submit */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={submit}
          disabled={loading}
          style={{
            height:       '42px',
            borderRadius: '10px',
            background:   loading
              ? 'rgba(58,46,43,0.8)'
              : 'linear-gradient(135deg, #c4485a 0%, #d4956a 100%)',
            border:       'none',
            color:        '#fff',
            fontSize:     '13px',
            fontWeight:   700,
            cursor:       loading ? 'not-allowed' : 'pointer',
            letterSpacing:'0.5px',
            boxShadow:    loading ? 'none' : '0 4px 20px rgba(196,72,90,.3)',
            textTransform:'uppercase' as const,
            position:     'relative',
            overflow:     'hidden',
          }}
        >
          {loading ? 'Verifying Identity…' : 'Connect'}
        </motion.button>

        <div style={{
          fontSize:   '10px',
          color:      'rgba(122,107,98,0.7)',
          textAlign:  'center',
          lineHeight: 1.5,
        }}>
          Your NEXUS_TOKEN is set in{' '}
          <code style={{
            background:   'rgba(36,28,25,0.8)',
            padding:      '1px 5px',
            borderRadius: '4px',
            color:        'rgba(184,169,158,0.7)',
          }}>
            .env.local
          </code>{' '}
          on the server.
        </div>
      </div>
    </div>
  )
}
