'use client'
import { useCallback, useState } from 'react'
import { useStore } from '@/store/useStore'
import { apiFetch } from '@/lib/apiFetch'

export function useGlobalData() {
  const [loading, setLoading] = useState(false)

  const setEarthquakes = useStore((s) => s.setEarthquakes)
  const setGdeltEvents = useStore((s) => s.setGdeltEvents)
  const setThreatIntel = useStore((s) => s.setThreatIntel)
  const setWeather     = useStore((s) => s.setWeather)
  const setFearGreed   = useStore((s) => s.setFearGreed)
  const setDefiData    = useStore((s) => s.setDefiData)
  const setHackerNews  = useStore((s) => s.setHackerNews)
  const setSecFilings  = useStore((s) => s.setSecFilings)

  const fetchEarthquakes = useCallback(async () => {
    try {
      const r = await apiFetch('/api/earthquakes', { signal: AbortSignal.timeout(10000) })
      const d = await r.json()
      setEarthquakes(d.earthquakes ?? [])
    } catch {
      // silent — one failure should not block others
    }
  }, [setEarthquakes])

  const fetchGdelt = useCallback(async () => {
    try {
      const r = await apiFetch('/api/gdelt?query=conflict+OR+crisis&timespan=24H', {
        signal: AbortSignal.timeout(15000),
      })
      const d = await r.json()
      setGdeltEvents(d.articles ?? [])
    } catch {
      // silent
    }
  }, [setGdeltEvents])

  const fetchThreatIntel = useCallback(async () => {
    try {
      const r = await apiFetch('/api/threat-intel', { signal: AbortSignal.timeout(10000) })
      const d = await r.json()
      setThreatIntel({
        threatfox: d.threatfox ?? [],
        shodan:    d.shodan ?? null,
      })
    } catch {
      // silent
    }
  }, [setThreatIntel])

  const fetchWeather = useCallback(async () => {
    try {
      const r = await apiFetch('/api/weather', { signal: AbortSignal.timeout(10000) })
      const d = await r.json()
      setWeather(d)
    } catch {
      // silent
    }
  }, [setWeather])

  const fetchFearGreed = useCallback(async () => {
    try {
      const r = await apiFetch('/api/fear-greed', { signal: AbortSignal.timeout(10000) })
      const d = await r.json()
      setFearGreed({ current: d.current, history: d.history ?? [] })
    } catch {
      // silent
    }
  }, [setFearGreed])

  const fetchDefi = useCallback(async () => {
    try {
      const r = await apiFetch('/api/defi?type=tvl', { signal: AbortSignal.timeout(10000) })
      const d = await r.json()
      setDefiData({
        protocols:   d.protocols ?? [],
        stablecoins: [],
        yields:      [],
      })
    } catch {
      // silent
    }
  }, [setDefiData])

  const fetchHackerNews = useCallback(async () => {
    try {
      const r = await apiFetch('/api/hacker-news?type=top', { signal: AbortSignal.timeout(10000) })
      const d = await r.json()
      setHackerNews(Array.isArray(d) ? d : d.items ?? [])
    } catch {
      // silent
    }
  }, [setHackerNews])

  const fetchSecFilings = useCallback(async () => {
    try {
      const r = await apiFetch('/api/sec-filings?query=10-K', { signal: AbortSignal.timeout(10000) })
      const d = await r.json()
      setSecFilings(d.filings ?? d.results ?? [])
    } catch {
      // silent
    }
  }, [setSecFilings])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    await Promise.allSettled([
      fetchEarthquakes(),
      fetchGdelt(),
      fetchThreatIntel(),
      fetchWeather(),
      fetchFearGreed(),
      fetchDefi(),
      fetchHackerNews(),
      fetchSecFilings(),
    ])
    setLoading(false)
  }, [
    fetchEarthquakes,
    fetchGdelt,
    fetchThreatIntel,
    fetchWeather,
    fetchFearGreed,
    fetchDefi,
    fetchHackerNews,
    fetchSecFilings,
  ])

  return {
    fetchAll,
    fetchEarthquakes,
    fetchGdelt,
    fetchThreatIntel,
    fetchWeather,
    fetchFearGreed,
    fetchDefi,
    fetchHackerNews,
    fetchSecFilings,
    loading,
  }
}
