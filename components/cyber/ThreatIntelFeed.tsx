'use client'

import { useStore } from '@/store/useStore'
import { CHART } from '@/lib/chartTheme'

// ── Confidence colour coding ───────────────────────────────────────────────────
function confColor(confidence: number): string {
  if (confidence >= 100) return CHART.red
  if (confidence >= 75)  return CHART.orange
  if (confidence >= 50)  return CHART.gold
  return CHART.text3
}

function confLabel(confidence: number): string {
  if (confidence >= 100) return 'CONFIRMED'
  if (confidence >= 75)  return 'HIGH'
  if (confidence >= 50)  return 'MEDIUM'
  return 'LOW'
}

// ── Pulsing LIVE dot ──────────────────────────────────────────────────────────
function LiveDot() {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginRight: '2px' }}>
      {/* Outer ping ring */}
      <span style={{
        position: 'absolute',
        width: '10px', height: '10px',
        borderRadius: '50%',
        background: CHART.red,
        opacity: 0.4,
        animation: 'nex-pulse 1.5s ease-in-out infinite',
      }} />
      {/* Inner solid dot */}
      <span style={{
        position: 'relative',
        width: '6px', height: '6px',
        borderRadius: '50%',
        background: CHART.red,
        display: 'inline-block',
        boxShadow: `0 0 6px ${CHART.red}`,
      }} />
    </span>
  )
}

// ── Confidence visual bar ─────────────────────────────────────────────────────
function ConfBar({ confidence }: { confidence: number }) {
  const col = confColor(confidence)
  const pct = Math.min(100, confidence)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
      <span style={{ fontSize: '9px', color: CHART.text3, fontWeight: 700, minWidth: '44px', fontFamily: 'monospace' }}>
        CONF
      </span>
      <div style={{
        flex: 1, height: '4px', background: CHART.surf3, borderRadius: '2px', overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(to right, ${col}aa, ${col})`,
          borderRadius: '2px',
          transition: 'width 0.6s ease-out',
          boxShadow: `0 0 4px ${col}88`,
        }} />
      </div>
      <span style={{ fontSize: '9px', fontWeight: 700, color: col, minWidth: '28px', textAlign: 'right', fontFamily: 'monospace' }}>
        {confidence}
      </span>
    </div>
  )
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
      background: CHART.surf2, border: '1px solid var(--border)',
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
            background: CHART.surf3, color: CHART.text3,
          }}>
            {type}
          </span>
        )}
        {malware && (
          <span style={{
            fontSize: '9.5px', fontWeight: 700, padding: '1px 6px', borderRadius: '5px',
            background: 'rgba(196,72,90,.12)', color: CHART.rose,
          }}>
            {malware}
          </span>
        )}
        <span style={{ fontSize: '10px', color: CHART.text3, marginLeft: 'auto' }}>
          {conf}% confidence
        </span>
      </div>

      {/* IOC value */}
      <div style={{
        fontSize: '11.5px', fontWeight: 700, color: CHART.text,
        fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.45, marginBottom: '4px',
      }}>
        {iocVal}
      </div>

      {/* First seen */}
      {seen && (
        <div style={{ fontSize: '10px', color: CHART.text3 }}>
          First seen: {seen}
        </div>
      )}

      {/* Confidence visual bar */}
      <ConfBar confidence={conf} />
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
        background: CHART.surf2, border: '1px solid var(--border)',
        borderRadius: '10px', padding: '24px 20px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🦠</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: CHART.text, marginBottom: '4px' }}>
          ThreatFox IOC Intelligence
        </div>
        <div style={{ fontSize: '12px', color: CHART.text3, lineHeight: 1.5 }}>
          Loading threat indicators…
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header with LIVE pulsing dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <LiveDot />
        <span style={{
          fontSize: '11px', fontWeight: 700, color: CHART.text3,
          textTransform: 'uppercase', letterSpacing: '.5px',
        }}>
          LIVE
        </span>
        <span style={{
          fontSize: '11px', fontWeight: 700, color: CHART.text3,
          textTransform: 'uppercase', letterSpacing: '.5px',
        }}>
          🦠 ThreatFox IOCs
        </span>
        <span style={{ fontSize: '10px', color: CHART.text3 }}>
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
