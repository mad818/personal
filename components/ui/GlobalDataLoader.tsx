'use client'
import { useEffect }         from 'react'
import { useGlobalData }     from '@/hooks/useGlobalData'
import { useKeywordAlerts }  from '@/hooks/useKeywordAlerts'

export default function GlobalDataLoader() {
  const { fetchAll } = useGlobalData()

  // Keyword alert engine — fires notifications when articles match user keywords
  useKeywordAlerts()

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, 5 * 60_000) // refresh every 5 min
    return () => clearInterval(id)
  }, [fetchAll])

  return null
}
