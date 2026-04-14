'use client'

import { useCallback, useState } from 'react'
import { useStore } from '@/store/useStore'
import type { OTXPulse } from '@/store/useStore'
import { apiFetch } from '@/lib/apiFetch'

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
  const updateFeedStatus = useStore((s) => s.updateFeedStatus)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const fetchOTX = useCallback(async () => {
    setLoading(true)
    setError('')
    updateFeedStatus('threatIntel', { lastAttemptAt: Date.now() })
    try {
      // Read through server route so OTX key stays server-side.
      const r = await apiFetch('/api/threat-intel', { signal: AbortSignal.timeout(12_000) })
      const d = await r.json()
      const raw: OTXRawPulse[] = d?.otx_pulses ?? []
      const warnings: string[] = Array.isArray(d?.meta?.warnings) ? d.meta.warnings : []
      const pulses = raw.map(parseRaw)
      // Sort: most recently modified first
      pulses.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
      setOtxPulses(pulses)

      if (!d?.otx_available) {
        updateFeedStatus('threatIntel', {
          lastFailureAt: Date.now(),
          lastError: warnings[0] ?? 'OTX key is not configured on the server.',
        })
        setError(warnings[0] ?? 'OTX key is not configured on the server.')
      } else if (warnings.length > 0 && pulses.length === 0) {
        updateFeedStatus('threatIntel', {
          lastFailureAt: Date.now(),
          lastError: warnings[0],
        })
        setError(warnings[0])
      } else {
        updateFeedStatus('threatIntel', {
          lastSuccessAt: Date.now(),
          lastError: null,
        })
      }
    } catch {
      updateFeedStatus('threatIntel', {
        lastFailureAt: Date.now(),
        lastError: 'Could not reach AlienVault OTX.',
      })
      setError('Could not reach AlienVault OTX.')
    } finally {
      setLoading(false)
    }
  }, [setOtxPulses, updateFeedStatus])

  return { fetchOTX, loading, error }
}
