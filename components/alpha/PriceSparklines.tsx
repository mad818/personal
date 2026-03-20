'use client'

import { useMemo } from 'react'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { CHART, TOOLTIP_STYLE } from '@/lib/chartTheme'

function fmtPrice(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (n >= 1)    return `$${n.toFixed(2)}`
  return `$${n.toFixed(5)}`
}

const COIN_LABELS: Record<string, string> = {
  bitcoin:        'BTC',
  ethereum:       'ETH',
  solana:         'SOL',
  'binancecoin':  'BNB',
  'cardano':      'ADA',
  'ripple':       'XRP',
  dogecoin:       'DOGE',
  polkadot:       'DOT',
  avalanche:      'AVAX',
  chainlink:      'LINK',
}

export default function PriceSparklines() {
  const prices    = useStore((s) => s.prices)
  const sparklines = useStore((s) => s.sparklines)
  const watchlist = useStore((s) => s.settings.watchlist)

  // Pick top 8 from watchlist if available, else use default popular coins
  const coins = useMemo(() => {
    const preferred = watchlist.length > 0 ? watchlist : Object.keys(COIN_LABELS)
    return preferred.filter((id) => prices[id]).slice(0, 8)
  }, [prices, watchlist])

  if (coins.length === 0) {
    return (
      <div style={{
        background: CHART.surf2, border: `1px solid ${CHART.border}`,
        borderRadius: '12px', padding: '20px', textAlign: 'center',
        color: CHART.text3, fontSize: '12px',
      }}>
        <div style={{ fontSize: '22px', marginBottom: '8px' }}>📊</div>
        Loading sparklines…
      </div>
    )
  }

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
  }
  const item = {
    hidden: { opacity: 0, y: 16 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  }

  return (
    <div style={{
      background: CHART.surf,
      border: `1px solid ${CHART.border}`,
      borderRadius: '12px',
      padding: '16px 18px',
    }}>
      <div style={{
        fontSize: '11px', fontWeight: 700, color: CHART.text3,
        textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '14px',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span style={{ color: CHART.gold }}>◈</span> Price Sparklines
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '10px',
        }}
      >
        {coins.map((coinId) => {
          const p       = prices[coinId]
          const spark   = sparklines[coinId] ?? []
          const isUp    = (p?.chg ?? 0) >= 0
          const fillCol = isUp ? CHART.emerald : CHART.red
          const label   = COIN_LABELS[coinId] ?? coinId.toUpperCase().slice(0, 6)

          const chartData = spark.length > 1
            ? spark.map((v, i) => ({ t: i, v }))
            : [{ t: 0, v: p?.price ?? 0 }, { t: 1, v: p?.price ?? 0 }]

          return (
            <motion.div
              key={coinId}
              variants={item}
              style={{
                background: CHART.surf2,
                border: `1px solid ${CHART.border}`,
                borderRadius: '10px',
                padding: '12px 14px 8px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Subtle bg glow */}
              <div style={{
                position: 'absolute', top: 0, right: 0,
                width: '60px', height: '60px',
                background: `radial-gradient(circle, ${fillCol}22 0%, transparent 70%)`,
                borderRadius: '50%',
                pointerEvents: 'none',
              }} />

              {/* Coin header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: CHART.text, letterSpacing: '.4px' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '10px', color: CHART.text3 }}>{coinId}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: CHART.text, fontFamily: 'monospace' }}>
                    {p ? fmtPrice(p.price) : '—'}
                  </div>
                  <div style={{
                    fontSize: '10px', fontWeight: 700, color: fillCol,
                    fontFamily: 'monospace',
                  }}>
                    {p ? `${isUp ? '+' : ''}${p.chg?.toFixed(2)}%` : ''}
                  </div>
                </div>
              </div>

              {/* AreaChart sparkline */}
              <ResponsiveContainer width="100%" height={48}>
                <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 2, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`spark-fill-${coinId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={fillCol} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={fillCol} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE.contentStyle}
                    itemStyle={TOOLTIP_STYLE.itemStyle}
                    labelStyle={TOOLTIP_STYLE.labelStyle}
                    formatter={(v: any) => [fmtPrice(v), label]}
                    labelFormatter={() => ''}
                  />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={fillCol}
                    strokeWidth={1.5}
                    fill={`url(#spark-fill-${coinId})`}
                    dot={false}
                    activeDot={{ r: 3, fill: fillCol }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
