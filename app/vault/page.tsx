'use client'

import { useState }       from 'react'
import SavedArticles       from '@/components/vault/SavedArticles'
import VaultSearch         from '@/components/vault/VaultSearch'
import VaultFolders        from '@/components/vault/VaultFolders'
import VaultExport         from '@/components/vault/VaultExport'
import PageTransition      from '@/components/ui/PageTransition'
import { useStore }        from '@/store/useStore'
import { CHART }           from '@/lib/chartTheme'
import type { VaultFilter, VaultCategory } from '@/components/vault/VaultSearch'

export default function VaultPage() {
  const savedArticles = useStore((s) => s.savedArticles)
  const [filter, setFilter] = useState<VaultFilter>({
    query:    '',
    category: 'All',
    sort:     'Newest',
  })

  function handleFolderSelect(cat: VaultCategory) {
    setFilter((prev) => ({ ...prev, category: cat }))
  }

  function handleSearchChange(f: VaultFilter) {
    setFilter(f)
  }

  // Build filtered list for export
  const filteredForExport = savedArticles.filter((a) => {
    const catMap: Record<string, string[]> = {
      All:      [],
      News:     ['world', 'tech', 'news'],
      Intel:    ['cyber', 'intel'],
      Research: ['markets', 'crypto', 'research'],
      Alerts:   ['alerts'],
    }
    const matchesQuery = !filter.query || (
      a.title.toLowerCase().includes(filter.query.toLowerCase()) ||
      (a.desc ?? '').toLowerCase().includes(filter.query.toLowerCase())
    )
    const matchesCat = filter.category === 'All' ||
      (catMap[filter.category] ?? []).includes(a.cat ?? '')
    return matchesQuery && matchesCat
  })

  return (
    <PageTransition>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '18px 16px 40px' }}>
        {/* Page header */}
        <div style={{
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          flexWrap:       'wrap',
          gap:            '10px',
          marginBottom:   '16px',
        }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: CHART.text }}>
              📁 VAULT
            </div>
            <div style={{ fontSize: '12px', color: CHART.text2, marginTop: '2px' }}>
              Bookmarked articles · Saved intelligence · Reports
            </div>
          </div>
          <VaultExport filtered={filteredForExport} />
        </div>

        {/* Search + filters */}
        <VaultSearch onChange={handleSearchChange} />

        {/* Folder grid */}
        <VaultFolders active={filter.category} onSelect={handleFolderSelect} />

        {/* Article list */}
        <SavedArticles filter={filter} />
      </div>
    </PageTransition>
  )
}
