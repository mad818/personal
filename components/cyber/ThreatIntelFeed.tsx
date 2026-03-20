'use client'

import { useStore } from '@/store/useStore'

// ── Confidence colour coding ───────────────────────────────────────────────────
function confColor(confidence: number): string {
  if (confidence >= 100) return '#ef4444'        // red
  if (confidence >= 75)  return '#f59e0b'        // orange
  if (confidence >= 50)  return '#d4956a'        // gold
  return 'var(--text3)'                          // gray
}

function confLabel(confidence: number): string {
  if (confidence >= 100) return 'CONFIRMED'
  if (confidence >= 75)  return 'HIGH'
  if (confidence >= 50)  return 'MEDIUM'
  return 'LOW'
}

// ── IOC card ──────────────────────────────────────────────────────────────────
interface IOCCardProps {
  ioc: any
}

function IOCCard({ ioc }: IOCCardProps) {
  const conf    = ioc.confidence_level ?? ioc.confidence ?? 0
  const col     = confColor(conf)
  const label   = confLabel(conf)
  const iocVal  = ioc.ioc_value ?? ioc.ioc ?? ''
  const type    = ioc.threat_type ?? ioc.type ?? ''
  const malware = ioc.malware ?? ioc.malware_printable ?? ''
  const seen    = ioc.first_seen ?? ioc.date_added ?? ''

  return (
    <div style={{
      background: 'var(--surf2)', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '11px 13px',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '8.5px', fontWeight: 800, padding: '2px 7px', borderRadius: '5px',
          background: `${col}22`, color: col, textTransform: 'uppercase', letterSpacing: '.4px',
        }}>
          {label}
        </span>
        {type && (
          <span style={{
            fontSize: '9.5px', fontWeight: 700, padding: '1px 6px', borderRadius: '5px',
            background: 'var(--surf3)', color: 'var(--text3)',
          }}>
            {type}
          </span>
        )}
        {malware && (
          <span style={{
            fontSize: '9.5px', fontWeight: 700, padding: '1px 6px', borderRadius: '5px',
            background: 'rgba(196,72,90,.12)', color: 'var(--accent)',
          }}>
            {malware}
          </span>
        )}
        <span style={{ fontSize: '10px', color: 'var(--text3)', marginLeft: 'auto' }}>
          {conf}% confidence
        </span>
      </div>

      {/* IOC value */}
      <div style={{
        fontSize: '11.5px', fontWeight: 700, color: 'var(--text)',
        fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.45, marginBottom: '4px',
      }}>
        {iocVal}
      </div>

      {/* First seen */}
      {seen && (
        <div style={{ fontSize: '10px', color: 'var(--text3)' }}>
          First seen: {seen}
        </div>
      )}

      {/* Confidence bar */}
      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '9px', color: 'var(--text3)', fontWeight: 700, minWidth: '44px' }}>CONF</span>
        <div style={{ flex: 1, height: '3px', background: 'var(--surf3)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(100, conf)}%`, height: '100%',
            background: col, borderRadius: '2px',
          }} />
        </div>
        <span style={{ fontSize: '9px', fontWeight: 700, color: col, minWidth: '28px', textAlign: 'right' }}>
          {conf}
        </span>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ThreatIntelFeed() {
  const threatIntel = useStore((s) => s.threatIntel)
  const iocs        = threatIntel?.threatfox ?? []

  if (!iocs.length) {
    return (
      <div style={{
        background: 'var(--surf2)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '24px 20px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🦠</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
          ThreatFox IOC Intelligence
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text3)', lineHeight: 1.5 }}>
          Loading threat indicators…
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '11px', fontWeight: 700, color: 'var(--text3)',
          textTransform: 'uppercase', letterSpacing: '.5px',
        }}>
          🦠 ThreatFox IOCs
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text3)' }}>
          {iocs.length} indicators
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {iocs.map((ioc: any, i: number) => (
          <IOCCard key={ioc.id ?? i} ioc={ioc} />
        ))}
      </div>
    </div>
  )
}
