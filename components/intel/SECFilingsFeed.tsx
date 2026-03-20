'use client'

// ── components/intel/SECFilingsFeed.tsx ────────────────────────────────────────
// NEXUS PRIME — SEC Filings Feed: fetches recent filings from /api/sec-filings
// and displays them with color-coding by form type.

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '@/lib/apiFetch'

interface Filing {
  id:          string
  company:     string
  formType:    string
  dateFiled:   string
  description: string
  url?:        string
  cik?:        string
}

// Form type color coding per spec
const FORM_TYPE_COLOR: Record<string, string> = {
  '10-K':  'var(--gold)',
  '10-Q':  'var(--blush)',
  '8-K':   'var(--rose)',
  '10-K/A':'var(--gold)',
  '10-Q/A':'var(--blush)',
  '8-K/A': 'var(--rose)',
  'S-1':   '#818cf8',
  'S-11':  '#818cf8',
  'DEF 14A': 'var(--text3)',
}

function getFormColor(formType: string): string {
  // Exact match first
  if (FORM_TYPE_COLOR[formType]) return FORM_TYPE_COLOR[formType]
  // Prefix match
  if (formType.startsWith('10-K')) return FORM_TYPE_COLOR['10-K']
  if (formType.startsWith('10-Q')) return FORM_TYPE_COLOR['10-Q']
  if (formType.startsWith('8-K'))  return FORM_TYPE_COLOR['8-K']
  if (formType.startsWith('S-'))   return '#818cf8'
  return 'var(--text3)'
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Filing row ────────────────────────────────────────────────────────────────
function FilingRow({ filing }: { filing: Filing }) {
  const color = getFormColor(filing.formType)

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 12px',
        background: 'var(--surf2)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        borderLeft: `3px solid ${color}`,
      }}
    >
      {/* Form type badge */}
      <span style={{
        fontSize: '9px',
        fontWeight: 800,
        padding: '2px 7px',
        borderRadius: '4px',
        background: `${color}18`,
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        flexShrink: 0,
        minWidth: '40px',
        textAlign: 'center',
        border: `1px solid ${color}44`,
      }}>
        {filing.formType}
      </span>

      {/* Company + description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '11.5px',
          fontWeight: 700,
          color: 'var(--text)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {filing.company}
        </div>
        {filing.description && (
          <div style={{
            fontSize: '10px',
            color: 'var(--text3)',
            marginTop: '1px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {filing.description}
          </div>
        )}
      </div>

      {/* Date */}
      <div style={{
        fontSize: '10px',
        color: 'var(--text3)',
        flexShrink: 0,
        fontFamily: 'monospace',
        textAlign: 'right',
      }}>
        {fmtDate(filing.dateFiled)}
      </div>

      {/* Link if available */}
      {filing.url && (
        <a
          href={filing.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            fontSize: '10px',
            color: 'var(--text3)',
            flexShrink: 0,
            textDecoration: 'none',
          }}
        >
          ↗
        </a>
      )}
    </motion.div>
  )
}

// ── Main SECFilingsFeed export ────────────────────────────────────────────────
export default function SECFilingsFeed() {
  const [filings, setFilings] = useState<Filing[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | '10-K' | '10-Q' | '8-K'>('all')
  const [query, setQuery] = useState('10-K')

  const load = useCallback(async (q: string = query) => {
    setLoading(true)
    setError(null)
    try {
      const r = await apiFetch(`/api/sec-filings?query=${encodeURIComponent(q)}`)
      const d = await r.json()
      const raw: any[] = d.filings ?? []
      const mapped: Filing[] = raw.slice(0, 40).map((f: any, i: number) => ({
        id:          f.id ?? f.accessionNumber ?? `filing-${i}`,
        company:     f.companyName ?? f.company ?? f.entityName ?? 'Unknown Company',
        formType:    f.form ?? f.formType ?? f.type ?? '?',
        dateFiled:   f.filed ?? f.dateFiled ?? f.filedAt ?? '',
        description: f.description ?? f.fileDescription ?? f.items ?? '',
        url:         f.url ?? (f.accessionNumber
          ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(f.companyName ?? '')}&type=${encodeURIComponent(f.form ?? '')}&dateb=&owner=include&count=40`
          : undefined),
        cik:         f.cik ?? '',
      }))
      setFilings(mapped)
    } catch (err) {
      setError('Unable to fetch SEC filings. Check API connectivity.')
      setFilings([])
    } finally {
      setLoading(false)
    }
  }, [query])

  // Auto-load on mount
  useEffect(() => { load() }, [load])

  const visible = filter === 'all'
    ? filings
    : filings.filter(f => f.formType.startsWith(filter))

  const FORM_FILTERS: Array<{ key: 'all' | '10-K' | '10-Q' | '8-K'; label: string }> = [
    { key: 'all', label: 'All Forms' },
    { key: '10-K', label: '10-K Annual' },
    { key: '10-Q', label: '10-Q Quarterly' },
    { key: '8-K', label: '8-K Current' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>
          📄 SEC EDGAR — Filings
        </span>
        <div style={{ flex: 1, display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load(query)}
            placeholder="Search query (e.g. 10-K, Apple, AI)"
            style={{
              flex: 1,
              maxWidth: '220px',
              background: 'var(--surf)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '5px 8px',
              color: 'var(--text)',
              fontSize: '11px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => load(query)}
            disabled={loading}
            style={{
              height: '26px', padding: '0 12px', borderRadius: '6px',
              background: 'var(--accent)', border: 'none', color: '#fff',
              fontSize: '11px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Form type legend */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {(['10-K', '10-Q', '8-K'] as const).map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: 'var(--text3)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: getFormColor(t) }} />
            <span>{t}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      {filings.length > 0 && (
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {FORM_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                height: '24px', padding: '0 9px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 700,
                border: '1px solid var(--border2)', cursor: 'pointer',
                background: filter === f.key ? 'var(--accent)' : 'transparent',
                color: filter === f.key ? '#fff' : 'var(--text3)',
              }}
            >
              {f.label}
              {f.key !== 'all' && (
                <span style={{ marginLeft: '4px', opacity: 0.7 }}>
                  ({filings.filter(fl => fl.formType.startsWith(f.key)).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '12px', background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', color: 'var(--text3)', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!filings.length && !loading && !error && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
          Hit Refresh to fetch live SEC filings.
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{
              height: '52px', background: 'var(--surf2)', border: '1px solid var(--border)',
              borderRadius: '8px', opacity: 0.5,
            }} />
          ))}
        </div>
      )}

      {/* Filings list */}
      {!loading && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          maxHeight: '480px',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border) transparent',
        }}>
          <AnimatePresence initial={false}>
            {visible.map(filing => (
              <FilingRow key={filing.id} filing={filing} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {filings.length > 0 && (
        <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text3)', textAlign: 'right' }}>
          {visible.length} filing{visible.length !== 1 ? 's' : ''} shown
        </div>
      )}
    </div>
  )
}
