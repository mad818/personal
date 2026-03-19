'use client'

import { useState, useMemo } from 'react'
import { fmtPrice } from '@/lib/helpers'

// ── Position sizing using the Kelly Criterion + fixed % risk ─────────────────
//
//  Two methods shown side-by-side:
//  1. Fixed risk % of account — standard approach: risk = account * riskPct
//  2. Kelly fraction — f = (p * b - q) / b, where p=win%, b=reward:risk ratio

function riskColor(riskPct: number): string {
  if (riskPct > 3) return '#ef4444'
  if (riskPct > 1.5) return '#f59e0b'
  return '#10b981'
}

export default function PositionSizer() {
  const [account,    setAccount]    = useState('')
  const [entry,      setEntry]      = useState('')
  const [stopLoss,   setStopLoss]   = useState('')
  const [target,     setTarget]     = useState('')
  const [riskPct,    setRiskPct]    = useState('1')   // % of account to risk
  const [winRate,    setWinRate]    = useState('55')  // % win rate for Kelly

  const inputStyle: React.CSSProperties = {
    background: 'var(--surf3)', border: '1px solid var(--border2)',
    borderRadius: '6px', color: 'var(--text)', fontSize: '12px',
    padding: '7px 10px', outline: 'none', width: '100%', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '10.5px', fontWeight: 700, color: 'var(--text3)',
    textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '4px', display: 'block',
  }

  const calc = useMemo(() => {
    const acc   = parseFloat(account)
    const ep    = parseFloat(entry)
    const sl    = parseFloat(stopLoss)
    const tp    = parseFloat(target)
    const rp    = parseFloat(riskPct) / 100
    const wr    = parseFloat(winRate) / 100

    if (!acc || !ep || !sl || ep <= 0 || sl <= 0) return null

    const slDist  = Math.abs(ep - sl)
    const slPct   = (slDist / ep) * 100

    // Fixed risk
    const riskAmt    = acc * rp
    const posSize    = riskAmt / slDist   // units
    const posValue   = posSize * ep       // USD

    // R:R and Kelly
    const hasTarget = tp > 0
    const rrRatio   = hasTarget ? Math.abs(tp - ep) / slDist : null
    // Kelly: f = (p*b - q) / b where b = reward/risk
    const kellyFrac = hasTarget && rrRatio
      ? Math.max(0, (wr * rrRatio - (1 - wr)) / rrRatio)
      : null
    const kellyPos  = kellyFrac !== null ? (acc * kellyFrac) / ep : null

    const pnlWin    = hasTarget ? posSize * Math.abs(tp - ep) : null
    const pnlLoss   = posSize * slDist

    return { slDist, slPct, riskAmt, posSize, posValue, rrRatio, kellyFrac, kellyPos, pnlWin, pnlLoss }
  }, [account, entry, stopLoss, target, riskPct, winRate])

  const col = riskColor(parseFloat(riskPct))

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text)', marginBottom: '14px' }}>
        📐 Position Sizer
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <label>
          <span style={labelStyle}>Account Size ($)</span>
          <input type="number" min={0} value={account} onChange={(e) => setAccount(e.target.value)}
            placeholder="10000" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Risk per trade (%)</span>
          <input type="number" min={0.1} max={10} step={0.1} value={riskPct} onChange={(e) => setRiskPct(e.target.value)}
            placeholder="1" style={{ ...inputStyle, color: col }} />
        </label>
        <label>
          <span style={labelStyle}>Entry Price ($)</span>
          <input type="number" min={0} value={entry} onChange={(e) => setEntry(e.target.value)}
            placeholder="0.00" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Stop Loss ($)</span>
          <input type="number" min={0} value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}
            placeholder="0.00" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Take Profit ($) <span style={{ color: 'var(--text3)', fontWeight: 400 }}>optional</span></span>
          <input type="number" min={0} value={target} onChange={(e) => setTarget(e.target.value)}
            placeholder="0.00" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Win Rate (%) <span style={{ color: 'var(--text3)', fontWeight: 400 }}>for Kelly</span></span>
          <input type="number" min={1} max={99} step={1} value={winRate} onChange={(e) => setWinRate(e.target.value)}
            placeholder="55" style={inputStyle} />
        </label>
      </div>

      {/* Results */}
      {calc ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Risk summary row */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'Risk $', val: `$${calc.riskAmt.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, col },
              { label: 'Stop Dist', val: `${calc.slPct.toFixed(2)}%`, col: calc.slPct > 5 ? '#ef4444' : 'var(--text)' },
              { label: 'Units', val: calc.posSize >= 1 ? calc.posSize.toFixed(4) : calc.posSize.toFixed(8), col: 'var(--text)' },
              { label: 'Position $', val: fmtPrice(calc.posValue), col: 'var(--text)' },
            ].map((m) => (
              <div key={m.label} style={{
                flex: 1, minWidth: '100px', padding: '9px 12px',
                background: 'var(--surf3)', borderRadius: '8px', border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '3px' }}>
                  {m.label}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 900, fontFamily: 'monospace', color: m.col }}>
                  {m.val}
                </div>
              </div>
            ))}
          </div>

          {/* R:R + Kelly */}
          {calc.rrRatio !== null && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: 'Risk : Reward', val: `1 : ${calc.rrRatio!.toFixed(2)}`, col: calc.rrRatio! >= 2 ? '#10b981' : '#f59e0b' },
                { label: 'Win if TP', val: `+$${calc.pnlWin!.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, col: '#10b981' },
                { label: 'Loss if SL', val: `-$${calc.pnlLoss.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, col: '#ef4444' },
                { label: 'Kelly Pos $', val: calc.kellyPos !== null && calc.kellyPos > 0 ? fmtPrice(calc.kellyPos!) : 'n/a', col: 'var(--accent)' },
              ].map((m) => (
                <div key={m.label} style={{
                  flex: 1, minWidth: '100px', padding: '9px 12px',
                  background: 'var(--surf3)', borderRadius: '8px', border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '3px' }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 900, fontFamily: 'monospace', color: m.col }}>
                    {m.val}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Warning: over-leveraged */}
          {(calc.posValue / parseFloat(account)) > 1 && (
            <div style={{ padding: '8px 12px', borderRadius: '7px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', fontSize: '11px', color: '#ef4444' }}>
              ⚠ Position value exceeds account size — consider reducing risk %.
            </div>
          )}

          {/* R:R warning */}
          {calc.rrRatio !== null && calc.rrRatio < 1.5 && (
            <div style={{ padding: '8px 12px', borderRadius: '7px', background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)', fontSize: '11px', color: '#f59e0b' }}>
              ⚠ R:R below 1.5 — trade may not be worth taking.
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text3)', fontSize: '12px',
          background: 'var(--surf2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          Fill in account size, entry, and stop loss to see position sizing.
        </div>
      )}
    </div>
  )
}
