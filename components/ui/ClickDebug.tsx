'use client'

import { useEffect, useRef, useState } from 'react'

function safeDescribe(el: Element | null): string {
  if (!el) return 'null'
  const tag = el.tagName.toLowerCase()
  const id = (el as HTMLElement).id ? `#${(el as HTMLElement).id}` : ''
  const cls = (el as HTMLElement).className
  const clsStr = typeof cls === 'string' && cls.trim() ? `.${cls.trim().split(/\s+/).slice(0, 3).join('.')}` : ''
  return `${tag}${id}${clsStr}`
}

export default function ClickDebug() {
  const [last, setLast] = useState<{ at: number; target: string; top: string } | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      // Ignore clicks that land inside the debug overlay region.
      // The overlay is intentionally click-through (pointerEvents: none),
      // so without this, clicking the overlay "clicks" whatever is underneath.
      const rect = boxRef.current?.getBoundingClientRect()
      if (rect) {
        const inside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        if (inside) return
      }
      const top = document.elementFromPoint(e.clientX, e.clientY)
      setLast({
        at: Date.now(),
        target: safeDescribe(e.target as Element | null),
        top: safeDescribe(top),
      })
    }
    window.addEventListener('pointerdown', onDown, true)
    return () => window.removeEventListener('pointerdown', onDown, true)
  }, [])

  // Show by default in dev to diagnose "unclickable UI" quickly.
  if (typeof window === 'undefined') return null
  // Toggle by setting localStorage flag in console: localStorage.nexus_click_debug='1'
  const enabled =
    process.env.NODE_ENV !== 'production' ||
    (() => {
      try {
        return localStorage.getItem('nexus_click_debug') === '1'
      } catch {
        return false
      }
    })()
  if (!enabled) return null

  return (
    <div
      ref={boxRef}
      style={{
        position: 'fixed',
        left: 8,
        top: 54,
        zIndex: 10000,
        pointerEvents: 'none',
        fontFamily: 'monospace',
        fontSize: 10,
        color: '#e5e7eb',
        background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 8,
        padding: '6px 8px',
        maxWidth: 360,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      <div style={{ fontWeight: 800, opacity: 0.9 }}>CLICK DEBUG</div>
      <div style={{ opacity: 0.85 }}>target: {last?.target ?? '—'}</div>
      <div style={{ opacity: 0.85 }}>top: {last?.top ?? '—'}</div>
    </div>
  )
}

