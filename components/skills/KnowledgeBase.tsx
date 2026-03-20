'use client'

// ── components/skills/KnowledgeBase.tsx ──────────────────────────────────────
// NEXUS PRIME — Knowledge Base: searchable, filterable repository of system-
// acquired knowledge entries, categorized and scored by relevance.

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DEFAULT_KNOWLEDGE, type KnowledgeEntry } from '@/lib/skillEngine'

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  'All',
  'Security Protocols',
  'Vehicle Operations',
  'IoT Configurations',
  'Market Strategies',
  'System Architecture',
]

const CATEGORY_ICONS: Record<string, string> = {
  'Security Protocols':  '🔒',
  'Vehicle Operations':  '🚗',
  'IoT Configurations':  '⚡',
  'Market Strategies':   '📈',
  'System Architecture': '🧠',
}

const CATEGORY_COLORS: Record<string, string> = {
  'Security Protocols':  'var(--accent)',
  'Vehicle Operations':  'var(--gold)',
  'IoT Configurations':  '#818cf8',
  'Market Strategies':   '#10b981',
  'System Architecture': 'var(--blush)',
}

// ── Format date ────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Relevance bar ──────────────────────────────────────────────────────────────
function RelevanceBar({ score }: { score: number }) {
  const color = score >= 90 ? 'var(--gold)' : score >= 75 ? 'var(--accent)' : 'var(--text3)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{
        flex: 1,
        height: '3px',
        background: 'var(--surf3)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: '2px' }}
        />
      </div>
      <span style={{ fontSize: '9px', fontWeight: 700, fontFamily: 'monospace', color, minWidth: '24px', textAlign: 'right' }}>
        {score}
      </span>
    </div>
  )
}

// ── Knowledge entry card ───────────────────────────────────────────────────────
function KnowledgeCard({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: KnowledgeEntry
  isExpanded: boolean
  onToggle: () => void
}) {
  const catColor = CATEGORY_COLORS[entry.category] ?? 'var(--text2)'
  const catIcon = CATEGORY_ICONS[entry.category] ?? '📄'
  const preview = entry.content.slice(0, 140) + (entry.content.length > 140 ? '…' : '')

  return (
    <motion.div
      layout
      style={{
        background: 'var(--surf)',
        border: `1px solid ${isExpanded ? 'var(--border2)' : 'var(--border)'}`,
        borderRadius: '10px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      whileHover={{ borderColor: 'var(--border2)' }}
      onClick={onToggle}
    >
      {/* Top accent bar */}
      <div style={{
        height: '2px',
        background: `${catColor}88`,
      }} />

      <div style={{ padding: '12px 14px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{catIcon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '12.5px',
              fontWeight: 800,
              color: 'var(--text)',
              marginBottom: '2px',
              lineHeight: 1.3,
            }}>
              {entry.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '9px',
                fontWeight: 700,
                padding: '1px 7px',
                borderRadius: '4px',
                background: `${catColor}18`,
                color: catColor,
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}>
                {entry.category}
              </span>
              <span style={{ fontSize: '9px', color: 'var(--text3)' }}>
                {fmtDate(entry.dateAdded)}
              </span>
            </div>
          </div>

          {/* Expand chevron */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ fontSize: '10px', color: 'var(--text3)', flexShrink: 0, marginTop: '2px' }}
          >
            ▼
          </motion.div>
        </div>

        {/* Content preview */}
        <div style={{
          fontSize: '11.5px',
          color: 'var(--text2)',
          lineHeight: 1.5,
          marginBottom: '8px',
        }}>
          {isExpanded ? entry.content : preview}
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {entry.tags.map(tag => (
            <span
              key={tag}
              style={{
                fontSize: '9px',
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: '3px',
                background: 'var(--surf2)',
                color: 'var(--text3)',
                border: '1px solid var(--border)',
                fontFamily: 'monospace',
              }}
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Relevance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '9px', color: 'var(--text3)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Relevance
          </span>
          <RelevanceBar score={entry.relevanceScore} />
        </div>
      </div>
    </motion.div>
  )
}

// ── Add Knowledge modal ────────────────────────────────────────────────────────
function AddModal({ onClose, onAdd }: {
  onClose: () => void
  onAdd: (entry: KnowledgeEntry) => void
}) {
  const [form, setForm] = useState({
    title: '',
    category: 'Security Protocols',
    content: '',
    tags: '',
  })

  const handleSubmit = () => {
    if (!form.title.trim() || !form.content.trim()) return
    const entry: KnowledgeEntry = {
      id: `kb-${Date.now()}`,
      title: form.title.trim(),
      category: form.category,
      content: form.content.trim(),
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      dateAdded: new Date().toISOString(),
      relevanceScore: Math.floor(Math.random() * 30 + 65),
    }
    onAdd(entry)
    onClose()
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--surf)',
    border: '1px solid var(--border2)',
    borderRadius: '6px',
    padding: '8px 10px',
    color: 'var(--text)',
    fontSize: '12px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#00000088',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surf2)',
          border: '1px solid var(--border2)',
          borderRadius: '14px',
          padding: '20px',
          width: '100%',
          maxWidth: '480px',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text)', marginBottom: '16px' }}>
          + Add Knowledge Entry
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Title</div>
            <input
              style={inputStyle}
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Custom RTSP Stream Configuration"
            />
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Category</div>
            <select
              style={{ ...inputStyle, appearance: 'none' }}
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            >
              {CATEGORIES.filter(c => c !== 'All').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Content</div>
            <textarea
              style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
              value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Detailed knowledge content…"
            />
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Tags (comma-separated)</div>
            <input
              style={inputStyle}
              value={form.tags}
              onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              placeholder="rtsp, camera, networking"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--surf)',
              color: 'var(--text3)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: '1px solid var(--accent)',
              background: 'var(--accent)18',
              color: 'var(--accent)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            Add Entry
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main KnowledgeBase export ──────────────────────────────────────────────────
export default function KnowledgeBase() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>(DEFAULT_KNOWLEDGE)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Filter and search
  const filtered = useMemo(() => {
    let result = entries
    if (activeCategory !== 'All') {
      result = result.filter(e => e.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q)) ||
        e.category.toLowerCase().includes(q)
      )
    }
    return result.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }, [entries, activeCategory, search])

  const handleAdd = useCallback((entry: KnowledgeEntry) => {
    setEntries(prev => [entry, ...prev])
  }, [])

  // Category counts
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { All: entries.length }
    entries.forEach(e => { counts[e.category] = (counts[e.category] ?? 0) + 1 })
    return counts
  }, [entries])

  return (
    <div style={{
      background: 'var(--surf2)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '16px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <div>
          <div style={{
            fontSize: '13px',
            fontWeight: 900,
            color: 'var(--text)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            Knowledge Base
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '1px' }}>
            {entries.length} entries · system-acquired knowledge
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowModal(true)}
          style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '6px 14px',
            borderRadius: '6px',
            border: '1px solid var(--accent)',
            background: 'var(--accent)18',
            color: 'var(--accent)',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          + Add Knowledge
        </motion.button>
      </div>

      {/* Search bar */}
      <div style={{
        position: 'relative',
        marginBottom: '12px',
      }}>
        <span style={{
          position: 'absolute',
          left: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '12px',
          color: 'var(--text3)',
          pointerEvents: 'none',
        }}>
          ⌕
        </span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search titles, content, tags…"
          style={{
            width: '100%',
            background: 'var(--surf)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '8px 12px 8px 28px',
            color: 'var(--text)',
            fontSize: '12px',
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--border2)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text3)',
              cursor: 'pointer',
              fontSize: '12px',
              padding: '2px 4px',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Category filters */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '14px',
        overflowX: 'auto',
        paddingBottom: '4px',
        scrollbarWidth: 'none',
      }}>
        {CATEGORIES.map(cat => {
          const color = cat !== 'All' ? CATEGORY_COLORS[cat] : 'var(--text)'
          const isActive = activeCategory === cat
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '5px',
                border: `1px solid ${isActive ? (color) : 'var(--border)'}`,
                background: isActive ? `${color}18` : 'var(--surf)',
                color: isActive ? color : 'var(--text3)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}
            >
              {cat !== 'All' && CATEGORY_ICONS[cat] + ' '}{cat}
              {catCounts[cat] != null && (
                <span style={{ marginLeft: '4px', opacity: 0.7 }}>
                  ({catCounts[cat]})
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Results count */}
      {search && (
        <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: '10px' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
        </div>
      )}

      {/* Entries grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '10px',
        maxHeight: '560px',
        overflowY: 'auto',
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--border) transparent',
      }}>
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                gridColumn: '1 / -1',
                padding: '40px',
                textAlign: 'center',
                color: 'var(--text3)',
                fontSize: '13px',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>💡</div>
              No entries found. Try a different search or add new knowledge.
            </motion.div>
          ) : (
            filtered.map(entry => (
              <KnowledgeCard
                key={entry.id}
                entry={entry}
                isExpanded={expandedId === entry.id}
                onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Add modal */}
      <AnimatePresence>
        {showModal && (
          <AddModal
            onClose={() => setShowModal(false)}
            onAdd={handleAdd}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
