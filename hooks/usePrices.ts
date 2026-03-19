'use client'

import { useCallback, useRef, useState } from 'react'
import { useStore, PriceData } from '@/store/useStore'
import { apiFetch } from '@/lib/apiFetch'

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
  const setPrices     = useStore((s) => s.setPrices)
  const setSparklines = useStore((s) => s.setSparklines)
  const watchlist     = useStore((s) => s.settings.watchlist)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
  }, [setPrices, setSparklines, watchlist])

  const start = useCallback((intervalMs = 60_000) => {
    fetchPrices()
    timerRef.current = setInterval(fetchPrices, intervalMs)
  }, [fetchPrices])

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return { fetchPrices, start, stop, loading, error }
}
