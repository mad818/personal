'use client'

import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { CHART } from '@/lib/chartTheme'
import type { VaultCategory } from './VaultSearch'

interface VaultFoldersProps {
  active:   VaultCategory
  onSelect: (cat: VaultCategory) => void
}

const FOLDERS: Array<{
  id:       VaultCategory
  emoji:    string
  label:    string
  catKey:   string | null
}> = [
  { id: 'All',      emoji: '📋', label: 'All',       catKey: null },
  { id: 'News',     emoji: '📰', label: 'News',      catKey: 'world' },
  { id: 'Intel',    emoji: '🔒', label: 'Intel',     catKey: 'cyber' },
  { id: 'Research', emoji: '📊', label: 'Research',  catKey: 'markets' },
  { id: 'Alerts',   emoji: '⚡', label: 'Alerts',    catKey: 'alerts' },
]

const BOOKMARK_FOLDER = { id: 'Bookmarks' as const, emoji: '🔖', label: 'Bookmarks', catKey: null }

export default function VaultFolders({ active, onSelect }: VaultFoldersProps) {
  const savedArticles = useStore((s) => s.savedArticles)

  function countFor(catKey: string | null, id: VaultCategory): number {
    if (id === 'All') return savedArticles.length
    // Map folder IDs to article cat fields
    const mapping: Record<string, string[]> = {
      News:     ['world', 'tech', 'news'],
      Intel:    ['cyber', 'intel'],
      Research: ['markets', 'crypto', 'research'],
      Alerts:   ['alerts'],
    }
    const keys = mapping[id] ?? []
    return savedArticles.filter((a) => keys.includes(a.cat ?? '')).length
  }

  const allFolders = [...FOLDERS, BOOKMARK_FOLDER]

  return (
    <div style={{
      display:              'grid',
      gridTemplateColumns:  'repeat(auto-fill, minmax(100px, 1fr))',
      gap:                  '10px',
      marginBottom:         '16px',
    }}>
      {allFolders.map((folder, i) => {
        const isActive = folder.id === active
        const count    = folder.id === 'Bookmarks'
          ? savedArticles.length
          : countFor(folder.catKey, folder.id as VaultCategory)

        return (
          <motion.div
            key={folder.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (folder.id !== 'Bookmarks') {
                onSelect(folder.id as VaultCategory)
              }
            }}
            style={{
              background:   isActive ? `${CHART.burgundy}44` : CHART.surf2,
              border:       `1px solid ${isActive ? CHART.rose : CHART.border2}`,
              borderRadius: '10px',
              padding:      '14px 10px',
              textAlign:    'center',
              cursor:       'pointer',
              boxShadow:    isActive ? `0 0 12px ${CHART.rose}22` : 'none',
              transition:   'border-color 0.2s, background 0.2s, box-shadow 0.2s',
            }}
          >
            <div style={{ fontSize: '22px', marginBottom: '6px', lineHeight: 1 }}>
              {folder.emoji}
            </div>
            <div style={{
              fontSize:   '10px',
              fontWeight: 700,
              color:      isActive ? CHART.rose : CHART.text,
              fontFamily: 'monospace',
              letterSpacing: '0.5px',
            }}>
              {folder.label}
            </div>
            <div style={{
              fontSize:   '11px',
              fontWeight: 900,
              color:      isActive ? CHART.blush : CHART.text2,
              marginTop:  '4px',
              fontFamily: 'monospace',
            }}>
              {count}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
