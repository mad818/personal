'use client'

// ── components/skills/SkillLibrary.tsx ────────────────────────────────────────
// NEXUS PRIME — Skill Library: category grid of skills with level bars,
// status badges, and interactive "Train" button wired to real observeSkill().
// Route Task search input uses routeTask() to highlight matching skills.

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DEFAULT_SKILLS,
  getSkillStatus,
  getStatusColor,
  getSkillBarGradient,
  getSkillTier,
  type Skill,
  type LearningEvent,
} from '@/lib/skillEngine'
import {
  observeSkill,
  routeTask,
  configureSkillCycle,
} from '@/lib/skillCycle'

// ── Category icons ─────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
  'INTELLIGENCE & OSINT': '🕵️',
  'CYBERSECURITY': '🔒',
  'PHYSICAL SECURITY': '📷',
  'AUTONOMOUS VEHICLES': '🚗',
  'IoT & AUTOMATION': '⚡',
  'MARKET INTELLIGENCE': '📈',
}

const CATEGORY_ORDER = [
  'INTELLIGENCE & OSINT',
  'CYBERSECURITY',
  'PHYSICAL SECURITY',
  'AUTONOMOUS VEHICLES',
  'IoT & AUTOMATION',
  'MARKET INTELLIGENCE',
]

// ── Skill level progress bar ───────────────────────────────────────────────────
function SkillBar({ level, animate }: { level: number; animate?: boolean }) {
  return (
    <div style={{
      height: '5px',
      background: 'var(--surf3)',
      borderRadius: '3px',
      overflow: 'hidden',
      margin: '6px 0 4px',
    }}>
      <motion.div
        initial={{ width: animate ? '0%' : `${level}%` }}
        animate={{ width: `${level}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          height: '100%',
          borderRadius: '3px',
          background: getSkillBarGradient(level),
          boxShadow: level >= 75 ? `0 0 6px var(--rose)44` : 'none',
        }}
      />
    </div>
  )
}

// ── Individual skill card ──────────────────────────────────────────────────────
function SkillCard({
  skill,
  onTrain,
  training,
  highlighted,
}: {
  skill: Skill
  onTrain: (skill: Skill) => void
  training: boolean
  highlighted: boolean
}) {
  const status = getSkillStatus(skill.level)
  const statusColor = getStatusColor(skill.level)
  const hoursAgo = Math.round((Date.now() - skill.lastUsed) / 3600000)
  const lastUsedStr = hoursAgo < 1
    ? 'Just now'
    : hoursAgo < 24
    ? `${hoursAgo}h ago`
    : `${Math.round(hoursAgo / 24)}d ago`
  const successPct = Math.round((skill.successRate ?? 0) * 100)
  const srColor = successPct >= 85 ? 'var(--fhi)' : successPct >= 65 ? 'var(--gold)' : 'var(--flo)'

  return (
    <motion.div
      layout
      style={{
        background: highlighted ? 'var(--surf3)' : 'var(--surf)',
        border: `1px solid ${highlighted ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '8px',
        padding: '12px 14px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: highlighted ? '0 0 10px var(--accent)33' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
      }}
      whileHover={{ borderColor: highlighted ? 'var(--accent)' : 'var(--border2)' }}
      transition={{ duration: 0.15 }}
    >
      {/* Glow for mastery/expert */}
      {skill.level >= 75 && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '2px',
          background: getSkillBarGradient(skill.level),
          opacity: 0.8,
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '0.2px',
            marginBottom: '2px',
          }}>
            {skill.name}
          </div>
          {/* abstract subtitle */}
          {skill.abstract && (
            <div style={{
              fontSize: '10px',
              color: 'var(--text3)',
              lineHeight: 1.35,
              marginBottom: '2px',
              fontStyle: 'italic',
            }}>
              {skill.abstract}
            </div>
          )}
          <div style={{
            fontSize: '10.5px',
            color: 'var(--text2)',
            lineHeight: 1.4,
          }}>
            {skill.description}
          </div>
        </div>

        {/* Level badge + version */}
        <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 900,
            fontFamily: 'monospace',
            color: statusColor,
            minWidth: '32px',
          }}>
            {skill.level}
          </div>
          {skill.version && (
            <span style={{
              fontSize: '8px',
              fontWeight: 700,
              fontFamily: 'monospace',
              color: 'var(--text3)',
              background: 'var(--surf2)',
              padding: '1px 4px',
              borderRadius: '3px',
            }}>
              v{skill.version}
            </span>
          )}
        </div>
      </div>

      <SkillBar level={skill.level} animate={training} />

      {/* Tags row */}
      {skill.tags && skill.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '6px' }}>
          {skill.tags.slice(0, 5).map(tag => (
            <span
              key={tag}
              style={{
                fontSize: '8px',
                fontWeight: 600,
                padding: '1px 5px',
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
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '9px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            background: `${statusColor}18`,
            color: statusColor,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {status}
          </span>
          {/* Success rate badge */}
          <span style={{
            fontSize: '9px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            background: `${srColor}18`,
            color: srColor,
            fontFamily: 'monospace',
          }}>
            {successPct}% SR
          </span>
          <span style={{ fontSize: '9px', color: 'var(--text3)' }}>
            {lastUsedStr}
          </span>
        </div>

        <motion.button
          onClick={() => onTrain(skill)}
          disabled={training}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            fontSize: '9px',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '4px',
            border: '1px solid var(--border2)',
            background: training ? 'var(--surf3)' : 'var(--surf2)',
            color: training ? 'var(--text3)' : 'var(--accent)',
            cursor: training ? 'not-allowed' : 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            transition: 'background 0.15s',
          }}
        >
          {training ? '⟳ Training' : '▶ Train'}
        </motion.button>
      </div>

      {/* XP flash overlay */}
      <AnimatePresence>
        {training && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '8px',
              background: `linear-gradient(135deg, var(--burgundy)22, var(--accent)11)`,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Category card ─────────────────────────────────────────────────────────────
function CategoryCard({
  category,
  skills,
  onTrain,
  trainingIds,
  highlightedIds,
}: {
  category: string
  skills: Skill[]
  onTrain: (skill: Skill) => void
  trainingIds: Set<string>
  highlightedIds: Set<string>
}) {
  const avgLevel = Math.round(skills.reduce((s, sk) => s + sk.level, 0) / skills.length)
  const icon = CATEGORY_ICONS[category] ?? '⚙️'

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
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>{icon}</span>
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 900,
              color: 'var(--text)',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
            }}>
              {category}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text3)' }}>
              {skills.length} skills
            </div>
          </div>
        </div>

        {/* Category avg level */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '18px',
            fontWeight: 900,
            fontFamily: 'monospace',
            color: getStatusColor(avgLevel),
          }}>
            {avgLevel}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            avg lvl
          </div>
        </div>
      </div>

      {/* Category avg bar */}
      <div style={{ height: '3px', background: 'var(--surf3)', borderRadius: '2px', marginBottom: '14px', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${avgLevel}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          style={{ height: '100%', borderRadius: '2px', background: getSkillBarGradient(avgLevel) }}
        />
      </div>

      {/* Skills list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {skills.map(skill => (
          <SkillCard
            key={skill.id}
            skill={skill}
            onTrain={onTrain}
            training={trainingIds.has(skill.id)}
            highlighted={highlightedIds.has(skill.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ── XP gain toast ─────────────────────────────────────────────────────────────
function XPToast({ event, onDone }: { event: LearningEvent; onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      onAnimationComplete={onDone}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: 'var(--surf2)',
        border: '1px solid var(--accent)',
        borderRadius: '10px',
        padding: '12px 16px',
        zIndex: 1000,
        maxWidth: '280px',
        boxShadow: '0 8px 32px #00000060',
      }}
    >
      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', marginBottom: '4px' }}>
        ▶ {event.skillName}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text2)', lineHeight: 1.4 }}>
        {event.description}
      </div>
      <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--gold)', marginTop: '6px', fontFamily: 'monospace' }}>
        +{event.xpGained} XP
      </div>
    </motion.div>
  )
}

// ── Route Task search input ────────────────────────────────────────────────────
function RouteTaskSearch({
  skills,
  onHighlight,
}: {
  skills: Skill[]
  onHighlight: (ids: Set<string>) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{ skillId: string; skillName: string; score: number; matchedBy: string }>>([])
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (val: string) => {
    setQuery(val)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (!val.trim()) {
      setResults([])
      onHighlight(new Set())
      return
    }
    timeoutRef.current = setTimeout(() => {
      const res = routeTask(val.trim(), 5)
      setResults(res)
      onHighlight(new Set(res.map(r => r.skillId)))
    }, 250)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    onHighlight(new Set())
  }

  return (
    <div style={{
      background: 'var(--surf2)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '12px 14px',
      marginBottom: '14px',
    }}>
      <div style={{
        fontSize: '10px',
        fontWeight: 700,
        color: 'var(--text3)',
        textTransform: 'uppercase',
        letterSpacing: '0.7px',
        marginBottom: '8px',
      }}>
        ⊕ Route Task — Find Best Skills
      </div>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder="Describe a task to find matching skills…"
          style={{
            width: '100%',
            background: 'var(--surf)',
            border: '1px solid var(--border)',
            borderRadius: '7px',
            padding: '8px 32px 8px 12px',
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
        {query && (
          <button
            onClick={handleClear}
            style={{
              position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer',
              fontSize: '12px', padding: '2px 4px',
            }}
          >
            ✕
          </button>
        )}
      </div>
      {results.length > 0 && (
        <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {results.map((r, i) => (
            <div key={r.skillId} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '5px',
              background: 'var(--accent)18',
              border: '1px solid var(--accent)44',
              fontSize: '10px',
            }}>
              <span style={{ fontWeight: 900, color: 'var(--accent)', fontFamily: 'monospace' }}>
                #{i + 1}
              </span>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>{r.skillName}</span>
              <span style={{ color: 'var(--text3)', fontSize: '9px' }}>via {r.matchedBy}</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--gold)', fontSize: '9px' }}>
                {r.score.toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main SkillLibrary export ───────────────────────────────────────────────────
export default function SkillLibrary({
  onNewEvent,
}: {
  onNewEvent?: (evt: LearningEvent) => void
}) {
  const [skills, setSkills] = useState<Skill[]>(DEFAULT_SKILLS)
  const [trainingIds, setTrainingIds] = useState<Set<string>>(new Set())
  const [activeToast, setActiveToast] = useState<LearningEvent | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set())

  // Configure skillCycle with our local skill store
  useEffect(() => {
    configureSkillCycle({
      updateSkill: (skillId, updates) => {
        setSkills(prev => prev.map(s => s.id === skillId ? { ...s, ...updates } : s))
      },
      getSkill: (skillId) => skills.find(s => s.id === skillId),
      getSkills: () => skills,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills])

  const handleTrain = useCallback((skill: Skill) => {
    if (trainingIds.has(skill.id)) return

    setTrainingIds(prev => { const s = new Set(Array.from(prev)); s.add(skill.id); return s })

    // Simulate async training delay (1-2.5s)
    const delay = 1000 + Math.random() * 1500
    setTimeout(() => {
      // Use real observeSkill — success 85% of the time
      const outcome = Math.random() > 0.15 ? 'success' : 'failure'
      const event = observeSkill({
        skillId: skill.id,
        taskInput: 'manual_training',
        outcome,
      })

      setTrainingIds(prev => {
        const next = new Set(prev)
        next.delete(skill.id)
        return next
      })

      setActiveToast(event)
      onNewEvent?.(event)

      // Auto-dismiss toast after 4s
      setTimeout(() => setActiveToast(null), 4000)
    }, delay)
  }, [trainingIds, onNewEvent])

  // Group by category in defined order
  const grouped = CATEGORY_ORDER.reduce<Record<string, Skill[]>>((acc, cat) => {
    acc[cat] = skills.filter(s => s.category === cat)
    return acc
  }, {})

  const totalSkills = skills.length
  const avgLevel = Math.round(skills.reduce((s, sk) => s + sk.level, 0) / skills.length)
  const trainingCount = trainingIds.size
  const avgSuccessRate = Math.round(
    skills.reduce((s, sk) => s + (sk.successRate ?? 0), 0) / skills.length * 100
  )

  return (
    <div>
      {/* Route Task search */}
      <RouteTaskSearch skills={skills} onHighlight={setHighlightedIds} />

      {/* Summary bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '16px',
        padding: '10px 14px',
        background: 'var(--surf2)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total Skills</span>
          <span style={{ fontSize: '14px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--text)' }}>{totalSkills}</span>
        </div>
        <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Avg Level</span>
          <span style={{ fontSize: '14px', fontWeight: 900, fontFamily: 'monospace', color: getStatusColor(avgLevel) }}>{avgLevel}</span>
        </div>
        <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Avg Success</span>
          <span style={{ fontSize: '14px', fontWeight: 900, fontFamily: 'monospace', color: avgSuccessRate >= 80 ? 'var(--fhi)' : 'var(--gold)' }}>
            {avgSuccessRate}%
          </span>
        </div>
        <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Categories</span>
          <span style={{ fontSize: '14px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--text)' }}>{CATEGORY_ORDER.length}</span>
        </div>
        {highlightedIds.size > 0 && (
          <>
            <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />
              <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 700 }}>
                {highlightedIds.size} matched
              </span>
            </div>
          </>
        )}
        {trainingCount > 0 && (
          <>
            <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{
                  width: '6px', height: '6px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 700 }}>
                {trainingCount} training
              </span>
            </div>
          </>
        )}
      </div>

      {/* Category grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: '14px',
      }}>
        {CATEGORY_ORDER.map(cat => (
          <CategoryCard
            key={cat}
            category={cat}
            skills={grouped[cat] ?? []}
            onTrain={handleTrain}
            trainingIds={trainingIds}
            highlightedIds={highlightedIds}
          />
        ))}
      </div>

      {/* XP toast */}
      <AnimatePresence>
        {activeToast && (
          <XPToast
            key={activeToast.id}
            event={activeToast}
            onDone={() => {}}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
