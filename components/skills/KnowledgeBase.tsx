'use client'

// ── components/skills/KnowledgeBase.tsx ──────────────────────────────────────
// NEXUS PRIME — Knowledge Base: searchable, filterable repository of system-
// acquired knowledge entries wired to memoryStore (IndexedDB) for real
// persistence. Search uses recall(), new entries use remember().

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DEFAULT_KNOWLEDGE, type KnowledgeEntry } from '@/lib/skillEngine'
import {
  remember,
  recall,
  exportMemories,
  importMemories,
  type Memory,
  type MemoryType,
} from '@/lib/memoryStore'

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

// ── Memory type → category mapping ───────────────────────────────────────────
const MEMORY_TYPE_CATEGORY: Record<MemoryType, string> = {
  fact:       'System Architecture',
  preference: 'System Architecture',
  episode:    'Security Protocols',
  skill_note: 'System Architecture',
}

function memoryToKnowledge(mem: Memory): KnowledgeEntry {
  const category = MEMORY_TYPE_CATEGORY[mem.type] ?? 'System Architecture'
  return {
    id: mem.id,
    title: mem.content.slice(0, 60) + (mem.content.length > 60 ? '…' : ''),
    category,
    content: mem.content,
    tags: mem.tags,
    dateAdded: new Date(mem.timestamp).toISOString(),
    relevanceScore: Math.round(mem.relevanceScore * 100),
  }
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
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) return
    setSaving(true)
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
      // Persist to IndexedDB via remember()
      const mem = await remember(
        form.content.trim(),
        'fact',
        tags,
        'user'
      )
      const entry: KnowledgeEntry = {
        id: mem.id,
        title: form.title.trim(),
        category: form.category,
        content: form.content.trim(),
        tags,
        dateAdded: new Date(mem.timestamp).toISOString(),
        relevanceScore: Math.floor(Math.random() * 30 + 65),
      }
      onAdd(entry)
      onClose()
    } catch {
      // Fallback: add without IndexedDB
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
    } finally {
      setSaving(false)
    }
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
            disabled={saving}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: '1px solid var(--accent)',
              background: 'var(--accent)18',
              color: 'var(--accent)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            {saving ? 'Saving…' : 'Add Entry'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Memory Search Results ─────────────────────────────────────────────────────
function MemoryResults({ results }: { results: Memory[] }) {
  if (results.length === 0) return null
  return (
    <div style={{
      background: 'var(--surf)',
      border: '1px solid var(--border2)',
      borderRadius: '8px',
      padding: '10px 12px',
      marginBottom: '12px',
    }}>
      <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', fontWeight: 700 }}>
        Memory Recall — {results.length} found
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
        {results.map(mem => (
          <div key={mem.id} style={{
            padding: '6px 8px',
            background: 'var(--surf2)',
            borderRadius: '5px',
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '10px', color: 'var(--text2)', lineHeight: 1.4 }}>
              {mem.content.slice(0, 120)}{mem.content.length > 120 ? '…' : ''}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase' }}>{mem.type}</span>
              {mem.tags.slice(0, 3).map(t => (
                <span key={t} style={{ fontSize: '8px', color: 'var(--text3)', fontFamily: 'monospace' }}>#{t}</span>
              ))}
              <span style={{ fontSize: '8px', color: 'var(--text3)', marginLeft: 'auto' }}>
                rel: {(mem.relevanceScore * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main KnowledgeBase export ──────────────────────────────────────────────────
export default function KnowledgeBase() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>(DEFAULT_KNOWLEDGE)
  const [search, setSearch] = useState('')
  const [memorySearch, setMemorySearch] = useState('')
  const [memoryResults, setMemoryResults] = useState<Memory[]>([])
  const [memorySearching, setMemorySearching] = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [remembering, setRemembering] = useState(false)
  const [newMemoryText, setNewMemoryText] = useState('')
  const [showRememberInput, setShowRememberInput] = useState(false)

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

  // Search memories via recall()
  const handleMemorySearch = useCallback(async () => {
    if (!memorySearch.trim()) return
    setMemorySearching(true)
    try {
      const results = await recall(memorySearch.trim(), 10)
      setMemoryResults(results)
    } catch {
      setMemoryResults([])
    } finally {
      setMemorySearching(false)
    }
  }, [memorySearch])

  // Remember new fact
  const handleRemember = useCallback(async () => {
    if (!newMemoryText.trim()) return
    setRemembering(true)
    try {
      await remember(newMemoryText.trim(), 'fact', [], 'user')
      setNewMemoryText('')
      setShowRememberInput(false)
      setImportStatus('Memory stored successfully')
      setTimeout(() => setImportStatus(null), 3000)
    } catch {
      setImportStatus('Error: IndexedDB unavailable')
      setTimeout(() => setImportStatus(null), 3000)
    } finally {
      setRemembering(false)
    }
  }, [newMemoryText])

  // Export memories
  const handleExport = useCallback(async () => {
    try {
      const json = await exportMemories()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nexus-memories-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setImportStatus('Error exporting memories')
      setTimeout(() => setImportStatus(null), 3000)
    }
  }, [])

  // Import memories
  const handleImport = useCallback(async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const result = await importMemories(text)
        setImportStatus(`Imported ${result.imported} memories (${result.skipped} skipped)`)
        setTimeout(() => setImportStatus(null), 5000)
      } catch (err) {
        setImportStatus(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setTimeout(() => setImportStatus(null), 5000)
      }
    }
    input.click()
  }, [])

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
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {/* Remember button */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowRememberInput(v => !v)}
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--gold)',
              background: 'var(--gold)18',
              color: 'var(--gold)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            ★ Remember
          </motion.button>
          {/* Export memories button */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleExport}
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border2)',
              background: 'var(--surf)',
              color: 'var(--text2)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            ↓ Export
          </motion.button>
          {/* Import memories button */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleImport}
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border2)',
              background: 'var(--surf)',
              color: 'var(--text2)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            ↑ Import
          </motion.button>
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
      </div>

      {/* Status message */}
      <AnimatePresence>
        {importStatus && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              padding: '8px 12px',
              background: 'var(--surf)',
              border: '1px solid var(--border2)',
              borderRadius: '7px',
              fontSize: '11px',
              color: 'var(--text2)',
              marginBottom: '12px',
            }}
          >
            {importStatus}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remember input (inline) */}
      <AnimatePresence>
        {showRememberInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginBottom: '12px', overflow: 'hidden' }}
          >
            <div style={{
              background: 'var(--surf)',
              border: '1px solid var(--gold)44',
              borderRadius: '8px',
              padding: '10px 12px',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-end',
            }}>
              <textarea
                value={newMemoryText}
                onChange={e => setNewMemoryText(e.target.value)}
                placeholder="Enter a fact to remember permanently (stored in IndexedDB)…"
                rows={2}
                style={{
                  flex: 1,
                  background: 'var(--surf2)',
                  border: '1px solid var(--border)',
                  borderRadius: '5px',
                  padding: '6px 8px',
                  color: 'var(--text)',
                  fontSize: '11px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={handleRemember}
                disabled={remembering || !newMemoryText.trim()}
                style={{
                  padding: '6px 12px',
                  borderRadius: '5px',
                  border: '1px solid var(--gold)',
                  background: 'var(--gold)18',
                  color: 'var(--gold)',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: remembering || !newMemoryText.trim() ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                {remembering ? 'Storing…' : 'Store'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Memory search (IndexedDB recall) */}
      <div style={{
        background: 'var(--surf)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '10px 12px',
        marginBottom: '12px',
      }}>
        <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', fontWeight: 700 }}>
          ◈ Search Memories (IndexedDB)
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            value={memorySearch}
            onChange={e => setMemorySearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleMemorySearch()}
            placeholder="Search persistent memory store…"
            style={{
              flex: 1,
              background: 'var(--surf2)',
              border: '1px solid var(--border)',
              borderRadius: '5px',
              padding: '6px 8px',
              color: 'var(--text)',
              fontSize: '11px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleMemorySearch}
            disabled={memorySearching}
            style={{
              padding: '6px 12px',
              borderRadius: '5px',
              border: '1px solid var(--border2)',
              background: 'var(--surf2)',
              color: 'var(--text2)',
              fontSize: '10px',
              fontWeight: 700,
              cursor: memorySearching ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            {memorySearching ? '…' : 'Recall'}
          </button>
        </div>
      </div>

      {/* Memory search results */}
      <MemoryResults results={memoryResults} />

      {/* Knowledge search bar */}
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
