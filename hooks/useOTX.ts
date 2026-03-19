'use client'

import { useCallback, useState } from 'react'
import { useStore } from '@/store/useStore'
import type { OTXPulse } from '@/store/useStore'

// ── Raw API shape ─────────────────────────────────────────────────────────────
interface OTXRawPulse {
  id:              string
  name:            string
  description:     string
  author_name:     string
  tags:            string[]
  indicator_count: number
  created:         string
  modified:        string
  tlp:             string
  adversary:       string
  references:      string[]
}

function parseRaw(r: OTXRawPulse): OTXPulse {
  return {
    id:              r.id ?? '',
    name:            r.name ?? '(unnamed)',
    description:     (r.description ?? '').slice(0, 300),
    author:          r.author_name ?? '',
    tags:            Array.isArray(r.tags) ? r.tags.slice(0, 8) : [],
    indicator_count: r.indicator_count ?? 0,
    created:         r.created ?? '',
    modified:        r.modified ?? '',
    tlp:             (r.tlp ?? 'white').toLowerCase(),
    adversary:       r.adversary ?? '',
    references:      Array.isArray(r.references) ? r.references.slice(0, 3) : [],
  }
}

export function useOTX() {
  const setOtxPulses = useStore((s) => s.setOtxPulses)
  const otxKey       = useStore((s) => s.settings.otxKey)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const fetchOTX = useCallback(async () => {
    if (!otxKey) return  // nothing to do without a key

    setLoading(true)
    setError('')
    try {
      // Activity feed — pulses recently updated by subscriptions + community
      const url = 'https://otx.alienvault.com/api/v1/pulses/activity?limit=20'
      const r   = await fetch(url, {
        headers: { 'X-OTX-API-KEY': otxKey },
        signal:  AbortSignal.timeout(12_000),
      })

      if (r.status === 401) {
        setError('OTX API key is invalid. Check your key in Settings.')
        return
      }
      if (!r.ok) {
        setError(`OTX API error: ${r.status}`)
        return
      }

      const d = await r.json()
      const raw: OTXRawPulse[] = d?.results ?? []
      const pulses = raw.map(parseRaw)
      // Sort: most recently modified first
      pulses.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
      setOtxPulses(pulses)
    } catch {
      setError('Could not reach AlienVault OTX.')
    } finally {
      setLoading(false)
    }
  }, [otxKey, setOtxPulses])

  return { fetchOTX, loading, error }
}
