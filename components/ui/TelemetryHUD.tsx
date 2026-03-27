'use client'

// ── TelemetryHUD.tsx ──────────────────────────────────────────────────────────
// Compact live-data ticker strip for the AgentOffice zone header area.
// Pulls from Zustand store — no extra fetching.
// Shows: BTC, ETH, Fear & Greed, World Risk, CVE count, news count.

import { useStore } from '@/store/useStore'
import { memo, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/apiFetch'
import { fetchJsonCached } from '@/lib/apiCache'
import { evalGradeColor, gradeFromEvalScore } from '@/lib/helpers'
import { RUNTIME_CACHE_TTL_MS, RUNTIME_POLL_MS, staggerDelayMs } from '@/lib/runtimeConfig'
import { parseRuntimeEvalPayload } from '@/lib/runtimeTypes'
import { shallow } from 'zustand/shallow'

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
  title?:    string
}

function TickerItem({ label, value, sub, subColor, color = '#dde1f0', dot, title }: TickerItemProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '3px 10px',
      borderRight: '1px solid #1A2040',
      flexShrink: 0,
    }} title={title}>
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

function TelemetryHUD() {
  const { prices, fg, worldRisk, cves, articles, agentStats, agentRuntime } = useStore(
    (s) => ({
      prices: s.prices,
      fg: s.signals?.fg,
      worldRisk: s.worldRisk,
      cves: s.cves,
      articles: s.articles,
      agentStats: s.agentStats,
      agentRuntime: s.agentRuntime,
    }),
    shallow,
  )
  const [evalLatest, setEvalLatest] = useState<{ score: number; minScore?: number; stale?: boolean; failures?: number; failureStreak?: number; effectiveCooldownMin?: number; fetchedAt?: number } | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      if (typeof document !== 'undefined' && document.hidden) return
      try {
        const raw = await fetchJsonCached('runtime-eval:limit=1', async () => {
          const r = await apiFetch('/api/metrics/runtime-eval?limit=1')
          return await r.json()
        }, RUNTIME_CACHE_TTL_MS.runtimeEvalLimit1)
        const d = parseRuntimeEvalPayload(raw)
        if (!active) return
        if (d?.latest && typeof d.latest.score === 'number') {
          setEvalLatest({
            score: d.latest.score,
            minScore: d.latest.minScore,
            stale: Boolean(d.freshness?.stale),
            failures: (d.failures?.checks?.length ?? 0) + (d.failures?.categories?.length ?? 0),
            failureStreak: Number(d.runner?.failureStreak ?? 0),
            effectiveCooldownMin: typeof d.runner?.effectiveCooldownMin === 'number' ? d.runner.effectiveCooldownMin : undefined,
            fetchedAt: Date.now(),
          })
        }
      } catch {
        // silent
      }
    }
    const firstRun = window.setTimeout(() => { void load() }, staggerDelayMs('telemetry-hud-eval'))
    const t = window.setInterval(() => { void load() }, RUNTIME_POLL_MS.telemetryEval)
    const onVisible = () => {
      if (!document.hidden) void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      window.clearTimeout(firstRun)
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

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

      <Div />

      <TickerItem
        label="RUN"
        value={agentRuntime.status.toUpperCase()}
        sub={agentRuntime.runId ? agentRuntime.runId.slice(-6) : undefined}
        color={
          agentRuntime.status === 'verified' ? '#00FF66'
            : agentRuntime.status === 'degraded' ? '#f59e0b'
            : agentRuntime.status === 'failed' ? '#ef4444'
            : '#7ba7d4'
        }
        dot={agentRuntime.status !== 'idle'}
      />

      {evalLatest && (
        <>
          {(() => {
            const evalGrade = gradeFromEvalScore(evalLatest.score, { stale: evalLatest.stale })
            const evalColor = evalLatest.stale ? '#f59e0b' : evalGradeColor(evalGrade)
            const evalSubColor = evalLatest.stale ? '#f59e0b' : (Number(evalLatest.failures ?? 0) > 0 ? '#ef4444' : evalColor)
            return (
              <>
                <Div />
                <TickerItem
                  label="EVAL"
                  value={`${evalLatest.score}`}
                  sub={
                    evalLatest.stale
                      ? `STALE${evalLatest.failures ? ` · ${evalLatest.failures}x` : ''}`
                      : (typeof evalLatest.minScore === 'number' ? `MIN ${evalLatest.minScore}${evalLatest.failures ? ` · ${evalLatest.failures}x` : ''}` : undefined)
                  }
                  subColor={evalSubColor}
                  color={evalColor}
                  dot
                  title={evalLatest.fetchedAt ? `Updated ${new Date(evalLatest.fetchedAt).toLocaleTimeString()}` : undefined}
                />
              </>
            )
          })()}
          {Number(evalLatest.failureStreak ?? 0) > 0 && (
            <>
              <Div />
              <TickerItem
                label="BACKOFF"
                value={`x${2 ** Number(evalLatest.failureStreak ?? 0)}`}
                sub={typeof evalLatest.effectiveCooldownMin === 'number' ? `${evalLatest.effectiveCooldownMin}m` : undefined}
                subColor="#f59e0b"
                color="#f59e0b"
                dot
              />
            </>
          )}
        </>
      )}

      {/* Right spacer */}
      <div style={{ flex: 1 }} />
    </div>
  )
}

export default memo(TelemetryHUD)
