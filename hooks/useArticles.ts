// ── hooks/useArticles ───────────────────────────────────────
// Hook for fetching and managing news articles with filtering and pagination.

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

function stableArticleId(prefix: string, title: string, link: string): string {
  const s = `${title}|${link}`
  let h = 0
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0
  return `${prefix}-${Math.abs(h).toString(36)}`
}

/** Last-resort categorization for GDELT client fallback */
function guessCatFromTitle(title: string): string {
  const t = title.toLowerCase()
  if (/bitcoin|crypto|ethereum|blockchain|defi|token|btc|solana/.test(t)) return 'crypto'
  if (/hack|cyber|ransom|malware|cve|vulnerability|breach|phish/.test(t)) return 'cyber'
  if (/stock|market|fed|earnings|economy|trade|bank|inflation|gdp/.test(t)) return 'markets'
  if (/software|chip|ai|iphone|google|microsoft|apple|tech/.test(t)) return 'tech'
  return 'world'
}

export function useArticles() {
  const setArticles       = useStore((s) => s.setArticles)
  const setArticlesLoaded = useStore((s) => s.setArticlesLoaded)
  const updateFeedStatus  = useStore((s) => s.updateFeedStatus)
  const alertKeywords     = useStore((s) => s.settings.alertKeywords)
  const addNotification   = useStore((s) => s.addNotification)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    setError('')
    updateFeedStatus('articles', { lastAttemptAt: Date.now() })
    try {
      const articles: Article[] = []

      // ── 1. Server-side RSS + CryptoCompare + GDELT fallback (see app/api/news/route.ts) ─
      try {
        const r   = await apiFetch('/api/news', { signal: AbortSignal.timeout(15000) })
        const raw = await r.json() as { title: string; link: string; date: string; src: string; cat?: string }[]
        raw.forEach((a) => {
          articles.push({
            id:    stableArticleId('news', a.title, a.link),
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

      // ── 2. Client GDELT backup if /api/news returned nothing (edge case) ─────────
      if (articles.length === 0) {
        try {
          const r = await apiFetch(
            '/api/gdelt?query=cryptocurrency+OR+cybersecurity+OR+markets+OR+geopolitics&timespan=24H&maxrecords=35',
            { signal: AbortSignal.timeout(12000) },
          )
          const d = await r.json() as { articles?: Array<{ title?: string; url?: string; seendate?: string }> }
          ;(d?.articles ?? []).forEach((a) => {
            const title = String(a.title ?? '')
            const link = String(a.url ?? '')
            if (!title || !link.startsWith('http')) return
            const cat = guessCatFromTitle(title)
            articles.push({
              id: stableArticleId('gdelt', title, link),
              title,
              desc: '',
              link,
              date: String(a.seendate ?? ''),
              bias: detectBias(title),
              src: 'GDELT',
              cat,
            })
          })
        } catch { /* silent */ }
      }

      if (articles.length > 0) {
        // ── Keyword alert engine ─────────────────────────────────────────────
        // Fire one notification per matching keyword (first article hit only).
        const keywords = alertKeywords
          .split(',')
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean)
        if (keywords.length > 0) {
          const fired = new Set<string>()
          for (const article of articles) {
            const titleLow = article.title.toLowerCase()
            for (const kw of keywords) {
              if (!fired.has(kw) && titleLow.includes(kw)) {
                fired.add(kw)
                addNotification({
                  type:     'intel',
                  severity: 'medium',
                  title:    `Alert: "${kw}"`,
                  message:  article.title,
                  source:   article.src ?? 'News',
                })
              }
            }
          }
        }
        setArticles(articles)
        updateFeedStatus('articles', {
          lastSuccessAt: Date.now(),
          lastError: null,
        })
      } else {
        updateFeedStatus('articles', {
          lastFailureAt: Date.now(),
          lastError: 'Could not load news. Check your connection.',
        })
        setError('Could not load news. Check your connection.')
      }
    } catch {
      updateFeedStatus('articles', {
        lastFailureAt: Date.now(),
        lastError: 'Could not fetch articles.',
      })
      setError('Could not fetch articles.')
    } finally {
      setArticlesLoaded(true)
      setLoading(false)
    }
  }, [alertKeywords, addNotification, setArticles, setArticlesLoaded, updateFeedStatus])

  return { fetchArticles, loading, error }
}
