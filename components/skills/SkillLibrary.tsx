'use client'

// ── components/skills/SkillLibrary.tsx ────────────────────────────────────────
// NEXUS PRIME — Skill Library: category grid of skills with level bars,
// status badges, and interactive "Train" button that simulates learning.

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DEFAULT_SKILLS,
  getSkillStatus,
  getStatusColor,
  getSkillBarGradient,
  simulateLearning,
  type Skill,
  type LearningEvent,
} from '@/lib/skillEngine'

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
}: {
  skill: Skill
  onTrain: (skill: Skill) => void
  training: boolean
}) {
  const status = getSkillStatus(skill.level)
  const statusColor = getStatusColor(skill.level)
  const hoursAgo = Math.round((Date.now() - skill.lastUsed) / 3600000)
  const lastUsedStr = hoursAgo < 1
    ? 'Just now'
    : hoursAgo < 24
    ? `${hoursAgo}h ago`
    : `${Math.round(hoursAgo / 24)}d ago`

  return (
    <motion.div
      layout
      style={{
        background: 'var(--surf)',
        border: `1px solid var(--border)`,
        borderRadius: '8px',
        padding: '12px 14px',
        position: 'relative',
        overflow: 'hidden',
      }}
      whileHover={{ borderColor: 'var(--border2)' }}
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
          <div style={{
            fontSize: '10.5px',
            color: 'var(--text2)',
            lineHeight: 1.4,
          }}>
            {skill.description}
          </div>
        </div>

        {/* Level badge */}
        <div style={{
          fontSize: '13px',
          fontWeight: 900,
          fontFamily: 'monospace',
          color: statusColor,
          minWidth: '32px',
          textAlign: 'right',
          flexShrink: 0,
        }}>
          {skill.level}
        </div>
      </div>

      <SkillBar level={skill.level} animate={training} />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '6px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
}: {
  category: string
  skills: Skill[]
  onTrain: (skill: Skill) => void
  trainingIds: Set<string>
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

// ── Main SkillLibrary export ───────────────────────────────────────────────────
export default function SkillLibrary({
  onNewEvent,
}: {
  onNewEvent?: (evt: LearningEvent) => void
}) {
  const [skills, setSkills] = useState<Skill[]>(DEFAULT_SKILLS)
  const [trainingIds, setTrainingIds] = useState<Set<string>>(new Set())
  const [activeToast, setActiveToast] = useState<LearningEvent | null>(null)

  const handleTrain = useCallback((skill: Skill) => {
    if (trainingIds.has(skill.id)) return

    setTrainingIds(prev => { const s = new Set(Array.from(prev)); s.add(skill.id); return s })

    // Simulate async training delay (1-2.5s)
    const delay = 1000 + Math.random() * 1500
    setTimeout(() => {
      const event = simulateLearning(skill)
      const levelGain = Math.floor(Math.random() * 3) + 1

      setSkills(prev => prev.map(s =>
        s.id === skill.id
          ? {
              ...s,
              level: Math.min(100, s.level + levelGain),
              experience: s.experience + event.xpGained,
              lastUsed: Date.now(),
              improvements: [...s.improvements, event.description.slice(0, 60)],
            }
          : s
      ))

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

  return (
    <div>
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
          <span style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Categories</span>
          <span style={{ fontSize: '14px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--text)' }}>{CATEGORY_ORDER.length}</span>
        </div>
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
