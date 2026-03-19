'use client'

import { useCallback, useState } from 'react'
import { useStore, Article } from '@/store/useStore'
import { apiFetch } from '@/lib/apiFetch'

// Bias detection — mirrors nexus-final.html logic
const BIAS_KW: Record<string, string[]> = {
  bullish: ['surge', 'rally', 'gain', 'soar', 'jump', 'rise', 'high', 'bull', 'breakout', 'record'],
  bearish: ['crash', 'drop', 'fall', 'plunge', 'decline', 'sell', 'bear', 'loss', 'low', 'risk'],
  neutral: ['stable', 'steady', 'hold', 'flat', 'unchanged', 'mixed'],
}

function detectBias(text: string): string {
  const t = text.toLowerCase()
  const scores: Record<string, number> = { bullish: 0, bearish: 0, neutral: 0 }
  for (const [bias, kws] of Object.entries(BIAS_KW)) {
    scores[bias] = kws.filter((k) => t.includes(k)).length
  }
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  return top[1] > 0 ? top[0] : 'neutral'
}

export function useArticles() {
  const setArticles  = useStore((s) => s.setArticles)
  const guardianKey  = useStore((s) => s.settings.guardianKey)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const articles: Article[] = []

      // ── 1. Server-side RSS (CoinTelegraph + CoinDesk — no CORS, always works) ─
      try {
        const r   = await apiFetch('/api/news', { signal: AbortSignal.timeout(10000) })
        const raw = await r.json() as { title: string; link: string; date: string; src: string; cat?: string }[]
        raw.forEach((a, i) => {
          articles.push({
            id:   `rss-${i}`,
            title: a.title,
            desc:  '',
            link:  a.link,
            date:  a.date,
            bias:  detectBias(a.title),
            src:   a.src,
            cat:   a.cat,
          })
        })
      } catch { /* silent */ }

      // ── 2. CryptoCompare News (free, supplements RSS with richer content) ────
      try {
        const url = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest&limit=30'
        const r   = await fetch(url, { signal: AbortSignal.timeout(8000) })
        const d   = await r.json()
        const raw = (d?.Data ?? []) as {
          id: string; title: string; url: string; source: string
          published_on: number; body?: string
        }[]
        raw.forEach((a) => {
          if (!articles.find((x) => x.title === a.title)) {
            articles.push({
              id:    `cc-${a.id}`,
              title: a.title,
              desc:  (a.body ?? '').slice(0, 160),
              link:  a.url,
              date:  new Date(a.published_on * 1000).toISOString(),
              bias:  detectBias(a.title + ' ' + (a.body ?? '')),
              src:   a.source,
            })
          }
        })
      } catch { /* silent */ }

      // ── 3. Guardian (key required, highest quality — adds on top) ────────────
      if (guardianKey) {
        try {
          const url = `https://content.guardianapis.com/search?q=crypto+finance+markets&api-key=${guardianKey}&show-fields=trailText&page-size=20&order-by=newest`
          const r   = await fetch(url, { signal: AbortSignal.timeout(8000) })
          const d   = await r.json()
          ;(d?.response?.results ?? []).forEach((a: any, i: number) => {
            const title = a.webTitle ?? ''
            const desc  = a.fields?.trailText ?? ''
            if (!articles.find((x) => x.title === title)) {
              articles.push({
                id:   `guardian-${i}`,
                title, desc,
                link: a.webUrl ?? '',
                date: a.webPublicationDate ?? '',
                bias: detectBias(title + ' ' + desc),
                src:  'The Guardian',
              })
            }
          })
        } catch { /* silent */ }
      }

      if (articles.length > 0) {
        setArticles(articles)
      } else {
        setError('Could not load news. Check your connection.')
      }
    } catch {
      setError('Could not fetch articles.')
    } finally {
      setLoading(false)
    }
  }, [guardianKey, setArticles])

  return { fetchArticles, loading, error }
}
