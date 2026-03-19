'use client'

import { useState, useMemo, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/ai'
import { fmtPrice, fmtPct, timeAgo } from '@/lib/helpers'

// ── Types ─────────────────────────────────────────────────────────────────────
interface BotSignal {
  id:        string
  sym:       string
  price:     number
  chg24h:    number
  score:     number
  action:    'STRONG BUY' | 'BUY' | 'SELL' | 'STRONG SELL'
  timestamp: string  // ISO
  aiNote?:   string
}

// ── Score → action ─────────────────────────────────────────────────────────
function toAction(score: number): BotSignal['action'] | null {
  if (score >= 80) return 'STRONG BUY'
  if (score >= 65) return 'BUY'
  if (score <= 20) return 'STRONG SELL'
  if (score <= 35) return 'SELL'
  return null  // neutral — skip
}

const ACTION_COLOR: Record<BotSignal['action'], string> = {
  'STRONG BUY':  '#10b981',
  'BUY':         '#34d399',
  'SELL':        '#f59e0b',
  'STRONG SELL': '#ef4444',
}

// Simple score computation (duplicate logic from MomentumScanner)
function computeScore(spark: number[], chg24h: number, vol: number, mcap: number): number {
  if (!spark || spark.length < 2) return 50
  const n = spark.length
  const mean_x = (n - 1) / 2
  const mean_y = spark.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (i - mean_x) * (spark[i] - mean_y)
    den += (i - mean_x) ** 2
  }
  const slope     = den !== 0 ? num / den : 0
  const priceRange = Math.max(...spark) - Math.min(...spark) || 1
  const normSlope  = slope / (priceRange / n)
  const trendScore = Math.min(35, Math.max(0, (normSlope + 1) * 17.5))
  const pctMove    = ((spark[n - 1] - spark[0]) / spark[0]) * 100
  const velScore   = ((Math.max(-40, Math.min(40, pctMove)) + 40) / 80) * 25
  const chgScore   = ((Math.max(-10, Math.min(10, chg24h)) + 10) / 20) * 25
  const volNorm    = mcap > 0 ? Math.min(15, ((vol / mcap) / 0.08) * 15) : 0
  return Math.round(trendScore + velScore + chgScore + volNorm)
}

// ── Alert threshold bar ────────────────────────────────────────────────────
function SignalPill({ action }: { action: BotSignal['action'] }) {
  const col = ACTION_COLOR[action]
  const icon = action.includes('BUY') ? '▲' : '▼'
  return (
    <span style={{
      fontSize: '9.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
      background: `${col}22`, color: col, letterSpacing: '0.4px',
      display: 'inline-flex', alignItems: 'center', gap: '4px',
    }}>
      <span style={{ fontSize: '8px' }}>{icon}</span>
      {action}
    </span>
  )
}

// ── History entry ──────────────────────────────────────────────────────────
function HistoryRow({ sig, onAnalyse, loading }: { sig: BotSignal; onAnalyse: (s: BotSignal) => void; loading: boolean }) {
  return (
    <div style={{
      background: 'var(--surf2)', border: `1px solid ${ACTION_COLOR[sig.action]}33`,
      borderRadius: '9px', padding: '10px 13px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text)' }}>
          {sig.sym}
        </span>
        <SignalPill action={sig.action} />
        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text)' }}>
          {fmtPrice(sig.price)}
        </span>
        <span style={{
          fontSize: '11px', fontFamily: 'monospace', fontWeight: 700,
          color: sig.chg24h >= 0 ? 'var(--fhi)' : 'var(--flo)',
        }}>
          {fmtPct(sig.chg24h)}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text3)', marginLeft: 'auto' }}>
          Score {sig.score} · {timeAgo(sig.timestamp)}
        </span>
        <button
          onClick={() => onAnalyse(sig)}
          disabled={loading}
          style={{
            height: '22px', padding: '0 10px', borderRadius: '5px',
            background: 'var(--accent)', border: 'none', color: '#fff',
            fontSize: '10px', fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1,
          }}
        >
          AI
        </button>
      </div>
      {sig.aiNote && (
        <div style={{
          marginTop: '8px', fontSize: '11.5px', color: 'var(--text2)',
          lineHeight: 1.55, borderTop: '1px solid var(--border)', paddingTop: '8px',
          whiteSpace: 'pre-wrap',
        }}>
          {sig.aiNote}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function BuyBot() {
  const prices      = useStore((s) => s.prices)
  const sparklines  = useStore((s) => s.sparklines)
  const settings    = useStore((s) => s.settings)
  const botHistory  = useStore((s) => s.settings.botHistory) as BotSignal[]
  const updateSettings = useStore((s) => s.updateSettings)

  const [aiLoading, setAiLoading] = useState<string | null>(null)  // id of signal being analysed
  const [analysed,  setAnalysed]  = useState<Record<string, string>>({})

  // Derive live signals from current price data
  const liveSignals: BotSignal[] = useMemo(() => {
    return Object.entries(prices)
      .map(([id, p]) => {
        const spark  = sparklines[id] ?? []
        const score  = computeScore(spark, p.chg ?? 0, p.vol ?? 0, p.mcap ?? 1)
        const action = toAction(score)
        if (!action) return null
        return {
          id,
          sym:       p.sym || id.slice(0, 6).toUpperCase(),
          price:     p.price,
          chg24h:    p.chg,
          score,
          action,
          timestamp: new Date().toISOString(),
        } satisfies BotSignal
      })
      .filter(Boolean) as BotSignal[]
  }, [prices, sparklines])

  // Save a signal to botHistory
  const saveSignal = useCallback((sig: BotSignal) => {
    const existing = (settings.botHistory as BotSignal[]) ?? []
    // Deduplicate by id+date (keep latest)
    const updated = [sig, ...existing.filter((s: BotSignal) => s.id !== sig.id)].slice(0, 50)
    updateSettings({ botHistory: updated as unknown[] })
  }, [settings.botHistory, updateSettings])

  // AI analysis for a signal
  const analyseSignal = useCallback(async (sig: BotSignal) => {
    if (!settings.apiKey) {
      setAnalysed((p) => ({ ...p, [sig.id]: 'Add your API key in Settings for AI analysis.' }))
      return
    }
    setAiLoading(sig.id)
    const prompt = `Crypto signal: ${sig.sym} — ${sig.action}. Price: ${fmtPrice(sig.price)}, 24h: ${fmtPct(sig.chg24h)}, momentum score: ${sig.score}/100. Give a 2-sentence trade rationale and one key risk. Be direct.`
    try {
      const note = await callAI(prompt, 200)
      setAnalysed((p) => ({ ...p, [sig.id]: note }))
      // Persist AI note to history
      const saved = { ...sig, aiNote: note }
      saveSignal(saved)
    } catch {
      setAnalysed((p) => ({ ...p, [sig.id]: 'AI call failed. Check your API key.' }))
    } finally {
      setAiLoading(null)
    }
  }, [settings.apiKey, saveSignal])

  const clearHistory = () => updateSettings({ botHistory: [] as unknown[] })

  const displaySignals = liveSignals.map((s) => ({
    ...s,
    aiNote: analysed[s.id],
  }))

  const histSignals = (botHistory ?? []) as BotSignal[]

  return (
    <div style={{ marginTop: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text)' }}>🤖 Buy Bot</span>
        <span style={{
          fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px',
          background: 'rgba(16,185,129,.15)', color: '#10b981', letterSpacing: '.4px',
        }}>
          LIVE
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text3)', marginLeft: '4px' }}>
          Signals scoring ≥65 or ≤35
        </span>
      </div>

      {/* Live signals */}
      {displaySignals.length === 0 ? (
        <div style={{
          padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: '12px',
          background: 'var(--surf2)', borderRadius: '9px', border: '1px solid var(--border)',
        }}>
          No strong signals right now — all assets are in neutral territory.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {displaySignals.map((sig) => (
            <HistoryRow
              key={sig.id}
              sig={sig}
              onAnalyse={analyseSignal}
              loading={aiLoading === sig.id}
            />
          ))}
        </div>
      )}

      {/* Save all live signals button */}
      {displaySignals.length > 0 && (
        <button
          onClick={() => displaySignals.forEach(saveSignal)}
          style={{
            marginTop: '10px', height: '28px', padding: '0 14px', borderRadius: '7px',
            background: 'transparent', border: '1px solid var(--border2)',
            color: 'var(--text3)', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer',
          }}
        >
          ↓ Save signals to history
        </button>
      )}

      {/* Signal history */}
      {histSignals.length > 0 && (
        <div style={{ marginTop: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px' }}>
              Signal History
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text3)' }}>{histSignals.length} saved</span>
            <button onClick={clearHistory} style={{
              marginLeft: 'auto', height: '22px', padding: '0 10px', borderRadius: '5px',
              background: 'transparent', border: '1px solid var(--border2)',
              color: 'var(--text3)', fontSize: '10px', cursor: 'pointer',
            }}>
              Clear
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {histSignals.slice(0, 20).map((sig, i) => (
              <HistoryRow
                key={`${sig.id}-${i}`}
                sig={sig}
                onAnalyse={analyseSignal}
                loading={aiLoading === sig.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
