'use client'

import { useState, useCallback } from 'react'
import { CHART } from '@/lib/chartTheme'

export type VaultCategory = 'All' | 'News' | 'Intel' | 'Research' | 'Alerts'
export type VaultSort = 'Newest' | 'Oldest' | 'Alphabetical'

export interface VaultFilter {
  query:    string
  category: VaultCategory
  sort:     VaultSort
}

interface VaultSearchProps {
  onChange: (filter: VaultFilter) => void
}

const CATEGORIES: VaultCategory[] = ['All', 'News', 'Intel', 'Research', 'Alerts']
const SORTS: VaultSort[]           = ['Newest', 'Oldest', 'Alphabetical']

export default function VaultSearch({ onChange }: VaultSearchProps) {
  const [query,    setQuery]    = useState('')
  const [category, setCategory] = useState<VaultCategory>('All')
  const [sort,     setSort]     = useState<VaultSort>('Newest')
  const [focused,  setFocused]  = useState(false)

  const emit = useCallback(
    (q: string, cat: VaultCategory, s: VaultSort) => {
      onChange({ query: q, category: cat, sort: s })
    },
    [onChange]
  )

  const handleQuery = (v: string) => {
    setQuery(v)
    emit(v, category, sort)
  }

  const handleCategory = (v: VaultCategory) => {
    setCategory(v)
    emit(query, v, sort)
  }

  const handleSort = (v: VaultSort) => {
    setSort(v)
    emit(query, category, v)
  }

  const selectStyle: React.CSSProperties = {
    background:   CHART.surf3,
    border:       `1px solid ${CHART.border2}`,
    borderRadius: '8px',
    padding:      '6px 10px',
    fontSize:     '11px',
    color:        CHART.text,
    outline:      'none',
    cursor:       'pointer',
    fontFamily:   'monospace',
    appearance:   'none' as 'none',
    WebkitAppearance: 'none',
    paddingRight: '24px',
  }

  return (
    <div style={{
      display:   'flex',
      gap:       '10px',
      flexWrap:  'wrap',
      alignItems: 'center',
      marginBottom: '16px',
    }}>
      {/* Search input */}
      <div style={{ position: 'relative', flex: '1 1 240px' }}>
        {/* magnifying glass icon */}
        <svg
          width="14" height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={focused ? CHART.rose : CHART.text3}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            transition: 'stroke 0.2s',
          }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          placeholder="Search vault…"
          onChange={(e) => handleQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width:        '100%',
            boxSizing:    'border-box',
            background:   CHART.surf3,
            border:       `1px solid ${focused ? CHART.rose : CHART.border2}`,
            borderRadius: '8px',
            padding:      '7px 10px 7px 32px',
            fontSize:     '12px',
            color:        CHART.text,
            outline:      'none',
            fontFamily:   'monospace',
            transition:   'border-color 0.2s, box-shadow 0.2s',
            boxShadow:    focused ? `0 0 0 2px ${CHART.rose}22` : 'none',
          }}
        />
      </div>

      {/* Category dropdown */}
      <div style={{ position: 'relative' }}>
        <select
          value={category}
          onChange={(e) => handleCategory(e.target.value as VaultCategory)}
          style={selectStyle}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <svg
          width="10" height="10" viewBox="0 0 10 10"
          fill={CHART.text3}
          style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <path d="M2 3 L5 7 L8 3" stroke={CHART.text3} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {/* Sort dropdown */}
      <div style={{ position: 'relative' }}>
        <select
          value={sort}
          onChange={(e) => handleSort(e.target.value as VaultSort)}
          style={selectStyle}
        >
          {SORTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <svg
          width="10" height="10" viewBox="0 0 10 10"
          fill={CHART.text3}
          style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <path d="M2 3 L5 7 L8 3" stroke={CHART.text3} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}
