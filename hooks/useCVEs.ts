// ── hooks/useCVEs ───────────────────────────────────────────
// Hook for fetching and caching CVE data with search and filtering.

'use client'

import { useCallback, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { apiFetch } from '@/lib/apiFetch'
import { buildDeltaSweep } from '@/lib/liveContext'

export interface CVE {
  id:          string
  description: string
  severity:    'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
  score:       number
  published:   string
  url:         string
}

const SEV_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4 }

function parseSeverity(metrics: any): { severity: CVE['severity']; score: number } {
  const cvss31 = metrics?.cvssMetricV31?.[0]?.cvssData
  const cvss30 = metrics?.cvssMetricV30?.[0]?.cvssData
  const cvss2  = metrics?.cvssMetricV2?.[0]?.cvssData
  const data   = cvss31 ?? cvss30 ?? cvss2

  if (!data) return { severity: 'NONE', score: 0 }

  const score = data.baseScore ?? 0
  const sev   = (data.baseSeverity ?? (score >= 9 ? 'CRITICAL' : score >= 7 ? 'HIGH' : score >= 4 ? 'MEDIUM' : 'LOW')).toUpperCase()

  return {
    severity: sev as CVE['severity'],
    score,
  }
}

export function useCVEs() {
  const setCves         = useStore((s) => s.setCves)
  const setCvesLoaded   = useStore((s) => s.setCvesLoaded)
  const setCveFetchError = useStore((s) => s.setCveFetchError)
  const addNotification = useStore((s) => s.addNotification)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [cves,    setLocalCves] = useState<CVE[]>([])
  const prevCves = useRef<CVE[]>([])

  const fetchCVEs = useCallback(async () => {
    setLoading(true)
    setError('')
    setCveFetchError('')
    try {
      // Proxied through Next.js server route — NVD blocks direct browser fetches (CORS)
      const r = await apiFetch('/api/cves', { signal: AbortSignal.timeout(55000) })
      const d = await r.json()

      const raw: CVE[] = (d.vulnerabilities ?? []).map((v: any) => {
        const cve    = v.cve
        const desc   = cve.descriptions?.find((d: any) => d.lang === 'en')?.value ?? ''
        const { severity, score } = parseSeverity(cve.metrics)
        return {
          id:          cve.id,
          description: desc.slice(0, 200),
          severity,
          score,
          published:   cve.published ?? '',
          url:         `https://nvd.nist.gov/vuln/detail/${cve.id}`,
        } satisfies CVE
      })

      raw.sort((a, b) => (SEV_ORDER[a.severity] ?? 4) - (SEV_ORDER[b.severity] ?? 4))

      // ── Delta sweep: fire threat notifications on CVE spikes ──────────────
      if (prevCves.current.length > 0) {
        const alerts = buildDeltaSweep(
          { cves: prevCves.current },
          { cves: raw },
        )
        alerts.forEach((a) =>
          addNotification({
            type:     'threat',
            severity: a.severity,
            title:    a.title,
            message:  a.message,
            source:   a.source,
          }),
        )
      }
      prevCves.current = raw

      setLocalCves(raw)
      setCves(raw)
    } catch {
      const message = 'Could not fetch CVE data.'
      setError(message)
      setCveFetchError(message)
    } finally {
      setLoading(false)
      setCvesLoaded(true) // mark done regardless of outcome
    }
  }, [setCves, setCvesLoaded, setCveFetchError, addNotification])

  return { fetchCVEs, cves, loading, error }
}
