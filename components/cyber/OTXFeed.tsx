'use client'

import { useStore } from '@/store/useStore'
import type { OTXPulse } from '@/store/useStore'
import { timeAgo } from '@/lib/helpers'

// TLP colour coding (Traffic Light Protocol)
const TLP_COLOR: Record<string, string> = {
  red:   '#ef4444',
  amber: '#f59e0b',
  green: '#10b981',
  white: '#6875a0',
}

function TLPBadge({ tlp }: { tlp: string }) {
  const color = TLP_COLOR[tlp] ?? TLP_COLOR.white
  return (
    <span style={{
      fontSize: '9.5px', fontWeight: 800, padding: '1px 6px', borderRadius: '6px',
      background: `${color}22`, color, textTransform: 'uppercase', letterSpacing: '0.5px',
    }}>
      TLP:{tlp.toUpperCase()}
    </span>
  )
}

/** Indicator density bar — higher IOC count = larger fill = more threat surface */
function ThreatDensityBar({ count, tlp }: { count: number; tlp: string }) {
  const pct = Math.min(100, (count / 500) * 100)
  const col = TLP_COLOR[tlp] ?? TLP_COLOR.white
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
      <span style={{ fontSize: '9px', color: 'var(--text3)', fontWeight: 700, minWidth: '52px' }}>IOC DENSITY</span>
      <div style={{ flex: 1, height: '3px', background: 'var(--surf3)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: '2px', opacity: 0.8 }} />
      </div>
      <span style={{ fontSize: '9px', color: col, fontWeight: 700, minWidth: '28px', textAlign: 'right' }}>{count}</span>
    </div>
  )
}

function PulseCard({ pulse }: { pulse: OTXPulse }) {
  const url = `https://otx.alienvault.com/pulse/${pulse.id}`
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block', background: 'var(--surf2)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '12px 14px', textDecoration: 'none',
        transition: 'border-color var(--t)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>
          OTX
        </span>
        <TLPBadge tlp={pulse.tlp} />
        {pulse.adversary && (
          <span style={{
            fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '6px',
            background: 'rgba(239,68,68,.12)', color: '#ef4444',
          }}>
            {pulse.adversary}
          </span>
        )}
        <span style={{ fontSize: '10px', color: 'var(--text3)', marginLeft: 'auto' }}>
          {timeAgo(pulse.modified)} · {pulse.indicator_count} indicators
        </span>
      </div>

      {/* Title */}
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px', lineHeight: 1.35 }}>
        {pulse.name}
      </div>

      {/* Description */}
      {pulse.description && (
        <div style={{ fontSize: '11.5px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '6px' }}>
          {pulse.description.slice(0, 180)}{pulse.description.length > 180 ? '…' : ''}
        </div>
      )}

      {/* Tags */}
      {pulse.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
          {pulse.tags.slice(0, 6).map((tag) => (
            <span key={tag} style={{
              fontSize: '9.5px', padding: '1px 6px', borderRadius: '5px',
              background: 'var(--surf3)', color: 'var(--text3)',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}
      {/* Threat density bar */}
      <ThreatDensityBar count={pulse.indicator_count} tlp={pulse.tlp} />
    </a>
  )
}

export default function OTXFeed() {
  const pulses = useStore((s) => s.otxPulses)
  const otxKey = useStore((s) => s.settings.otxKey)

  // No key configured
  if (!otxKey) {
    return (
      <div style={{
        background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: '10px',
        padding: '24px 20px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🛡️</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
          OTX Threat Intel
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text3)', lineHeight: 1.5 }}>
          Add your AlienVault OTX API key in Settings to see live threat pulses.
          <br />Free key at{' '}
          <a
            href="https://otx.alienvault.com/api"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent)' }}
          >
            otx.alienvault.com
          </a>
        </div>
      </div>
    )
  }

  // Key set but no pulses yet
  if (!pulses.length) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🛡️</div>
        Loading OTX pulses…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {pulses.map((p) => <PulseCard key={p.id} pulse={p} />)}
    </div>
  )
}
