// ── hooks/usePrices ─────────────────────────────────────────
// Hook for fetching and subscribing to crypto price updates with caching.

'use client'

import { useCallback, useRef, useState } from 'react'
import { useStore, PriceData } from '@/store/useStore'
import { apiFetch } from '@/lib/apiFetch'
import { buildDeltaSweep } from '@/lib/liveContext'

export const DEFAULT_COINS = [
  'bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple',
  'cardano', 'avalanche-2', 'polkadot', 'chainlink', 'uniswap',
]

const DEFAULT_SYM: Record<string, string> = {
  'bitcoin': 'BTC', 'ethereum': 'ETH', 'solana': 'SOL',
  'binancecoin': 'BNB', 'ripple': 'XRP', 'cardano': 'ADA',
  'avalanche-2': 'AVAX', 'polkadot': 'DOT', 'chainlink': 'LINK',
  'uniswap': 'UNI',
}

export function usePrices() {
  const setPrices       = useStore((s) => s.setPrices)
  const setSparklines   = useStore((s) => s.setSparklines)
  const addNotification = useStore((s) => s.addNotification)
  const watchlist       = useStore((s) => s.settings.watchlist)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevPrices  = useRef<Record<string, PriceData>>({})
  // Visibility listener ref so we can remove it on stop()
  const onVisibleRef = useRef<(() => void) | null>(null)

  const fetchPrices = useCallback(async () => {
    setLoading(true)
    setError('')
    // Merge watchlist with defaults; deduplicate
    const coins = Array.from(new Set([...DEFAULT_COINS, ...(watchlist ?? [])]))
    const coinsParam = coins.join(',')
    try {
      // Both calls go through the server proxy — avoids browser rate limits
      const [mktRes, spkRes] = await Promise.all([
        apiFetch(`/api/prices?mode=markets&coins=${coinsParam}`,    { signal: AbortSignal.timeout(12000) }),
        apiFetch(`/api/prices?mode=sparklines&coins=${coinsParam}`, { signal: AbortSignal.timeout(12000) }),
      ])

      const mktJson = await mktRes.json()
      const spkJson = await spkRes.json()
      const mkt: any[] = mktJson.data ?? []
      const spk: any[] = spkJson.data ?? []

      const prices: Record<string, PriceData> = {}
      mkt.forEach((c) => {
        prices[c.id] = {
          price: c.current_price ?? 0,
          chg:   c.price_change_percentage_24h ?? 0,
          sym:   DEFAULT_SYM[c.id] ?? c.symbol?.toUpperCase() ?? '',
          mcap:  c.market_cap ?? 0,
          vol:   c.total_volume ?? 0,
        }
      })

      // ── Delta sweep: fire notifications for significant price moves ────────
      if (Object.keys(prevPrices.current).length > 0) {
        const alerts = buildDeltaSweep(
          { prices: prevPrices.current },
          { prices },
        )
        alerts.forEach((a) =>
          addNotification({
            type:    a.type === 'market' ? 'market' : 'intel',
            severity: a.severity,
            title:   a.title,
            message: a.message,
            source:  a.source,
          }),
        )
      }
      prevPrices.current = prices

      setPrices(prices)

      const sparklines: Record<string, number[]> = {}
      spk.forEach((c) => {
        const line = c.sparkline_in_7d?.price as number[] | undefined
        if (line) sparklines[c.id] = line
      })
      setSparklines(sparklines)
    } catch {
      setError('Could not fetch prices.')
    } finally {
      setLoading(false)
    }
  }, [setPrices, setSparklines, addNotification, watchlist])

  const start = useCallback((intervalMs = 60_000) => {
    fetchPrices()
    timerRef.current = setInterval(() => {
      // Skip polling when the browser tab is hidden — saves API quota and CPU
      if (typeof document !== 'undefined' && document.hidden) return
      fetchPrices()
    }, intervalMs)

    // Resume polling when the user returns to the tab
    const onVisible = () => { if (!document.hidden) fetchPrices() }
    onVisibleRef.current = onVisible
    document.addEventListener('visibilitychange', onVisible)
  }, [fetchPrices])

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (onVisibleRef.current) {
      document.removeEventListener('visibilitychange', onVisibleRef.current)
      onVisibleRef.current = null
    }
  }, [])

  return { fetchPrices, start, stop, loading, error }
}
