// ── intel/page ──────────────────────────────────────────────
// INTEL tab: Polymarket prediction odds, Porter 5 Forces, VRIO, BCG Matrix.

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic            from 'next/dynamic'
import { ArticlesLoader } from '@/components/ui/DataLoader'
import { useStore } from '@/store/useStore'

const LazyTopicHeatmap      = dynamic(() => import('@/components/signals/TopicHeatmap'),    { ssr: false })
const LazyWorldTopicHeatmap = dynamic(() => import('@/components/ops/WorldTopicHeatmap'),   { ssr: false })
const LazyGeoHeatmap        = dynamic(() => import('@/components/ops/GeoHeatmap'),          { ssr: false })
const LazyConflictFeed      = dynamic(() => import('@/components/ops/ConflictFeed'),        { ssr: false })
const LazyMarketRates       = dynamic(() => import('@/components/ops/MarketRates'),         { ssr: false })
const LazyPolymarketFeed    = dynamic(() => import('@/components/intel/PolymarketFeed'),    { ssr: false })
const LazyOpsMap            = dynamic(() => import('@/components/ops/OpsMap'),              { ssr: false })

// ── Segmented control ─────────────────────────────────────────────────────────
type Segment = 'news' | 'world' | 'markets'
const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'news',    label: '📰 NEWS'         },
  { id: 'world',   label: '🌍 GEOPOLITICAL' },
  { id: 'markets', label: '📊 PREDICTION'   },
]

function CollapsibleSection({ title, children, defaultOpen = false }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: '8px' }}>
      <button
        onClick={() => setOpen((v: boolean) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          width: '100%', background: 'var(--surf2)',
          border: '1px solid var(--border)', borderRadius: open ? '8px 8px 0 0' : '8px',
          padding: '9px 14px', cursor: 'pointer', textAlign: 'left',
          transition: 'border-radius .15s',
        }}
      >
        <span style={{
          fontSize: '9px', color: 'var(--text3)', transition: 'transform .15s',
          display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none',
        }}>▶</span>
        <span style={{
          fontSize: '11px', fontWeight: 700, color: 'var(--text3)',
          letterSpacing: '.08em', textTransform: 'uppercase',
        }}>{title}</span>
      </button>
      {open && (
        <div style={{
          padding: '16px', background: 'var(--surf2)',
          border: '1px solid var(--border)', borderTop: 'none',
          borderRadius: '0 0 8px 8px',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default function IntelPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const seg = useStore((s) => s.intelView) ?? 'news'
  const setSeg = useStore((s) => s.setIntelView)

  const urlSeg = useMemo(() => {
    const v = (searchParams?.get('view') ?? '').toLowerCase()
    return (['news', 'world', 'markets'] as Segment[]).includes(v as Segment) ? (v as Segment) : null
  }, [searchParams])

  // URL → store (so deep links win on first load / navigation)
  useEffect(() => {
    if (!urlSeg) return
    setSeg(urlSeg)
  }, [urlSeg, setSeg])

  // Keep URL in sync when segment changes (shareable deep links).
  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if ((params.get('view') ?? '').toLowerCase() === seg) return
    params.set('view', seg)
    router.replace(`/intel?${params.toString()}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seg])

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '18px 16px 80px', position: 'relative', zIndex: 5 }}>
      <ArticlesLoader />

      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '18px', fontWeight: 900 }}>📡 INTEL</div>
        <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
          News signals · Geopolitical risk · Prediction markets · Strategy tools
        </div>
      </div>

      {/* ── Segmented control ── */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '20px',
        background: 'var(--surf2)', border: '1px solid var(--border)',
        borderRadius: '8px', padding: '3px',
        position: 'relative', zIndex: 2001, pointerEvents: 'auto',
      }}>
        {SEGMENTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onPointerDown={() => setSeg(s.id)}
            style={{
              flex: 1, padding: '6px 8px',
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.3px',
              transition: 'all .15s',
              background: seg === s.id ? 'var(--accent)' : 'transparent',
              color: seg === s.id ? '#fff' : 'var(--text2)',
            }}
            aria-pressed={seg === s.id}
          >
            {s.label}
          </button>
        ))}
      </div>
      {/* ── NEWS ── */}
      {seg === 'news' && (
        <div>
          <div style={{
            fontSize: '11px', fontWeight: 700, color: 'var(--text3)',
            letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '12px',
          }}>
            Live News · Topic Heatmap
          </div>
          <LazyTopicHeatmap />
        </div>
      )}

      {/* ── GEOPOLITICAL ── */}
      {seg === 'world' && (
        <div>
          <div style={{
            fontSize: '11px', fontWeight: 700, color: 'var(--text3)',
            letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '12px',
          }}>
            Intelligence Signals
          </div>
          <LazyWorldTopicHeatmap />

          <div style={{ margin: '20px 0', height: '1px', background: 'var(--border)' }} />

          <div style={{
            fontSize: '11px', fontWeight: 700, color: 'var(--text3)',
            letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '12px',
          }}>
            Conflict Impact Assessment
          </div>
          <LazyGeoHeatmap />

          <div style={{ margin: '20px 0', height: '1px', background: 'var(--border)' }} />

          <CollapsibleSection title="Raw Conflict Feed (GDELT)">
            <LazyConflictFeed />
          </CollapsibleSection>
          <CollapsibleSection title="FX Rates &amp; Commodities">
            <LazyMarketRates />
          </CollapsibleSection>
          <CollapsibleSection title="Live Map — quakes, flights, fires (free public data)" defaultOpen>
            <LazyOpsMap />
          </CollapsibleSection>
        </div>
      )}

      {/* ── PREDICTION MARKETS ── */}
      {seg === 'markets' && <LazyPolymarketFeed />}
    </div>
  )
}