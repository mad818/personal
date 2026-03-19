'use client'

/**
 * DataLoader — mounts once per page and triggers the relevant data hooks.
 * Each page imports the variant it needs. Data goes into Zustand store,
 * then components read from the store — no prop drilling.
 */

import { useEffect } from 'react'
import { usePrices }   from '@/hooks/usePrices'
import { useArticles } from '@/hooks/useArticles'
import { useCVEs }     from '@/hooks/useCVEs'
import { useOTX }      from '@/hooks/useOTX'
import { useStore }    from '@/store/useStore'
import { apiFetch }    from '@/lib/apiFetch'

// ── Prices (ALPHA + COMMAND tabs) ─────────────────────────────────────────────
export function PricesLoader() {
  const { start, stop } = usePrices()
  useEffect(() => {
    start(60_000) // refresh every 60s
    return stop
  }, [start, stop])
  return null
}

// ── Articles (SIGNALS tab) ────────────────────────────────────────────────────
export function ArticlesLoader() {
  const { fetchArticles } = useArticles()
  useEffect(() => {
    fetchArticles()
    const id = setInterval(fetchArticles, 5 * 60_000) // refresh every 5min
    return () => clearInterval(id)
  }, [fetchArticles])
  return null
}

// ── CVEs (CYBER tab) ──────────────────────────────────────────────────────────
export function CVEsLoader() {
  const { fetchCVEs } = useCVEs()
  useEffect(() => {
    fetchCVEs()
    const id = setInterval(fetchCVEs, 15 * 60_000) // refresh every 15min
    return () => clearInterval(id)
  }, [fetchCVEs])
  return null
}

// ── OTX Threat Pulses (CYBER tab) ─────────────────────────────────────────────
export function OTXLoader() {
  const { fetchOTX } = useOTX()
  useEffect(() => {
    fetchOTX()
    const id = setInterval(fetchOTX, 15 * 60_000) // refresh every 15min
    return () => clearInterval(id)
  }, [fetchOTX])
  return null
}

// ── World Risk background loader (COMMAND tab KPI) ────────────────────────────
// Fetches conflict RSS silently so COMMAND shows worldRisk without needing OPS open
export function WorldRiskLoader() {
  const setWorldRisk = useStore((s) => s.setWorldRisk)

  useEffect(() => {
    const CONFLICT_KW = ['war','conflict','military','attack','killed','airstrike','strike',
      'missile','bomb','troops','invasion','coup','sanctions','nuclear','casualties']

    async function load() {
      try {
        const r = await apiFetch('/api/conflict', { signal: AbortSignal.timeout(15000) })
        const d = await r.json()
        const articles = (d.articles ?? []) as { title: string; impact?: string }[]
        const riskCount = articles.filter((a) => {
          const t = a.title.toLowerCase()
          return CONFLICT_KW.some((k) => t.includes(k))
        }).length
        if (riskCount > 0) setWorldRisk(riskCount)
      } catch { /* silent */ }
    }
    load()
    const id = setInterval(load, 15 * 60_000)
    return () => clearInterval(id)
  }, [setWorldRisk])

  return null
}

// ── Fear & Greed (COMMAND tab) ────────────────────────────────────────────────
export function FearGreedLoader() {
  const setSignals = useStore((s) => s.setSignals)

  useEffect(() => {
    async function fetch_fg() {
      try {
        const r = await fetch('https://api.alternative.me/fng/?limit=1')
        const d = await r.json()
        const entry = d?.data?.[0]
        if (entry) {
          setSignals({
            fg: {
              value: Number(entry.value),
              label: entry.value_classification ?? '',
            },
          })
        }
      } catch { /* silent */ }
    }
    fetch_fg()
    const id = setInterval(fetch_fg, 10 * 60_000)
    return () => clearInterval(id)
  }, [setSignals])

  return null
}
