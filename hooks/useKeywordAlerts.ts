'use client'

// ── hooks/useKeywordAlerts.ts ─────────────────────────────────────────────────
// Watches the article feed + alertKeywords setting.
// Fires a notification for every new article that matches a keyword.
// Tracks already-alerted article IDs in a ref so we never fire twice per session.

import { useEffect, useRef } from 'react'
import { useStore }          from '@/store/useStore'
import { scanArticles, articleCatToNotifType } from '@/lib/keywordAlerts'

export function useKeywordAlerts(): void {
  const articles        = useStore((s) => s.articles)
  const settings        = useStore((s) => s.settings)
  const addNotification = useStore((s) => s.addNotification)

  // Persists across renders — never resets unless the component unmounts
  const seenIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!articles.length)                  return
    if (!settings.alertKeywords?.trim())   return

    const matches = scanArticles(articles, settings.alertKeywords, seenIds.current)

    for (const { article, matchedKeyword } of matches) {
      addNotification({
        type:     articleCatToNotifType(article.cat),
        severity: 'medium',
        title:    `Keyword Alert: "${matchedKeyword}"`,
        message:  article.title,
        source:   article.src ?? 'news',
      })
    }
  }, [articles, settings.alertKeywords, addNotification])
}
