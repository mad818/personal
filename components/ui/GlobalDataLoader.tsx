'use client'
import { useEffect } from 'react'
import { useGlobalData } from '@/hooks/useGlobalData'

export default function GlobalDataLoader() {
  const { fetchAll } = useGlobalData()

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, 5 * 60_000) // refresh every 5 min
    return () => clearInterval(id)
  }, [fetchAll])

  return null
}
