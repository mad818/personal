'use client'

// ── TelemetryHUD.tsx ──────────────────────────────────────────────────────────
// Compact live-data ticker strip for the AgentOffice zone header area.
// Pulls from Zustand store — no extra fetching.
// Shows: BTC, ETH, Fear & Greed, World Risk, CVE count, news count.

import { useStore } from '@/store/useStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

function chgColor(chg: number): string {
  if (chg > 0)  return '#00FF66'
  if (chg < 0)  return '#ef4444'
  return '#6875a0'
}

function fgColor(val: number): string {
  if (val >= 75) return '#00FF66'
  if (val >= 50) return '#f59e0b'
  if (val >= 25) return '#ef4444'
  return '#dc2626'
}

// ── Ticker item ───────────────────────────────────────────────────────────────

interface TickerItemProps {
  label:     string
  value:     string
  sub?:      string
  subColor?: string
  color?:    string
  dot?:      boolean
}

function TickerItem({ label, value, sub, subColor, color = '#dde1f0', dot }: TickerItemProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '3px 10px',
      borderRight: '1px solid #1A2040',
      flexShrink: 0,
    }}>
      {dot && (
        <span style={{
          width: '4px', height: '4px', borderRadius: '50%',
          background: color, boxShadow: `0 0 4px ${color}`,
          flexShrink: 0,
        }} />
      )}
      <span style={{
        fontSize: '8px', fontFamily: "'VT323', monospace",
        color: '#304060', letterSpacing: '1px',
        flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: '10px', fontFamily: "'VT323', monospace",
        color, letterSpacing: '0.5px', fontWeight: 700,
        flexShrink: 0,
      }}>
        {value}
      </span>
      {sub && (
        <span style={{
          fontSize: '8px', fontFamily: "'VT323', monospace",
          color: subColor ?? '#6875a0', letterSpacing: '0.5px',
        }}>
          {sub}
        </span>
      )}
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────

function Div() {
  return (
    <div style={{
      width: '1px', height: '14px', background: '#1A2040',
      flexShrink: 0, alignSelf: 'center',
    }} />
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TelemetryHUD() {
  const prices    = useStore(s => s.prices)
  const fg        = useStore(s => s.signals?.fg)
  const worldRisk = useStore(s => s.worldRisk)
  const cves      = useStore(s => s.cves)
  const articles  = useStore(s => s.articles)
  const agentStats = useStore(s => s.agentStats)

  const btc = prices['bitcoin']
  const eth = prices['ethereum']
  const sol = prices['solana']

  const totalTasks = Object.values(agentStats).reduce((sum, a) => sum + a.totalTasks, 0)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', overflowX: 'auto',
      background: '#080d18',
      borderBottom: '1px solid #1A2040',
      flexShrink: 0,
      scrollbarWidth: 'none',
    }}>
      {/* Left label */}
      <div style={{
        padding: '3px 10px',
        borderRight: '1px solid #1A2040',
        fontSize: '7px', fontFamily: "'VT323', monospace",
        color: '#00FF6666', letterSpacing: '2px', flexShrink: 0,
      }}>
        LIVE
      </div>

      {/* BTC */}
      {btc ? (
        <TickerItem
          label="BTC"
          value={fmt(btc.price)}
          sub={`${btc.chg >= 0 ? '+' : ''}${btc.chg.toFixed(2)}%`}
          subColor={chgColor(btc.chg)}
          color="#f7931a"
          dot
        />
      ) : (
        <TickerItem label="BTC" value="—" color="#304060" />
      )}

      {/* ETH */}
      {eth ? (
        <TickerItem
          label="ETH"
          value={fmt(eth.price)}
          sub={`${eth.chg >= 0 ? '+' : ''}${eth.chg.toFixed(2)}%`}
          subColor={chgColor(eth.chg)}
          color="#627eea"
          dot
        />
      ) : (
        <TickerItem label="ETH" value="—" color="#304060" />
      )}

      {/* SOL */}
      {sol ? (
        <TickerItem
          label="SOL"
          value={fmt(sol.price)}
          sub={`${sol.chg >= 0 ? '+' : ''}${sol.chg.toFixed(2)}%`}
          subColor={chgColor(sol.chg)}
          color="#9945ff"
          dot
        />
      ) : (
        <TickerItem label="SOL" value="—" color="#304060" />
      )}

      <Div />

      {/* Fear & Greed */}
      {fg ? (
        <TickerItem
          label="F&G"
          value={`${fg.value}`}
          sub={fg.label.toUpperCase()}
          subColor={fgColor(typeof fg.value === 'number' ? fg.value : Number(fg.value))}
          color={fgColor(typeof fg.value === 'number' ? fg.value : Number(fg.value))}
        />
      ) : (
        <TickerItem label="F&G" value="—" color="#304060" />
      )}

      <Div />

      {/* World Risk */}
      <TickerItem
        label="RISK"
        value={worldRisk > 0 ? `${worldRisk}` : '—'}
        color={worldRisk > 70 ? '#ef4444' : worldRisk > 40 ? '#f59e0b' : '#00FF66'}
        dot={worldRisk > 0}
      />

      <Div />

      {/* CVEs today */}
      <TickerItem
        label="CVE"
        value={cves.length > 0 ? `${cves.length}` : '—'}
        sub={cves.length > 0 ? 'TODAY' : undefined}
        color={cves.length > 20 ? '#ef4444' : cves.length > 5 ? '#f59e0b' : '#00DDFF'}
      />

      {/* News */}
      <TickerItem
        label="NEWS"
        value={articles.length > 0 ? `${articles.length}` : '—'}
        sub={articles.length > 0 ? 'FEEDS' : undefined}
        color="#6875a0"
      />

      <Div />

      {/* Agent task count */}
      <TickerItem
        label="OPS"
        value={totalTasks > 0 ? `${totalTasks}` : '—'}
        sub={totalTasks > 0 ? 'TASKS' : undefined}
        color="#00DDFF"
      />

      {/* Right spacer */}
      <div style={{ flex: 1 }} />
    </div>
  )
}
