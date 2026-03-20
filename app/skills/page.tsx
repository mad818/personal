'use client'

// ── app/skills/page.tsx ───────────────────────────────────────────────────────
// NEXUS PRIME — Skills & Self-Learning page
// Autonomous learning, skill acquisition, and system evolution dashboard.

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import SkillLibrary        from '@/components/skills/SkillLibrary'
import LearningLog         from '@/components/skills/LearningLog'
import SystemBrain         from '@/components/skills/SystemBrain'
import KnowledgeBase       from '@/components/skills/KnowledgeBase'
import SkillRadarChart     from '@/components/skills/SkillRadarChart'
import LearningProgressRing from '@/components/skills/LearningProgressRing'
import KnowledgeGraphViz   from '@/components/skills/KnowledgeGraphViz'
import PageTransition      from '@/components/ui/PageTransition'
import type { LearningEvent } from '@/lib/skillEngine'

// ── Animated section title ─────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: '11px',
      fontWeight: 700,
      color: 'var(--text3)',
      textTransform: 'uppercase',
      letterSpacing: '0.8px',
      marginBottom: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      <div style={{
        width: '16px',
        height: '1px',
        background: 'var(--border2)',
      }} />
      {children}
      <div style={{
        flex: 1,
        height: '1px',
        background: 'var(--border)',
      }} />
    </div>
  )
}

export default function SkillsPage() {
  const [latestEvent, setLatestEvent] = useState<LearningEvent | null>(null)

  const handleNewEvent = useCallback((evt: LearningEvent) => {
    setLatestEvent(evt)
  }, [])

  return (
    <PageTransition>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '18px 16px 48px',
      }}>
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: '22px' }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '1.5px' }}>
                🧠 NEXUS INTELLIGENCE ENGINE
              </div>
              <div style={{
                fontSize: '12px',
                color: 'var(--text2)',
                marginTop: '3px',
              }}>
                Autonomous learning, skill acquisition, and system evolution
              </div>
            </div>

            {/* Status badges */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--accent)44',
                  background: 'var(--accent)0e',
                }}
              >
                <span style={{ fontSize: '7px' }}>●</span>
                ACTIVE LEARNING
              </motion.div>
              <div style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--text3)',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--surf)',
                fontFamily: 'monospace',
              }}>
                24 SKILLS
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{
            height: '1px',
            background: 'linear-gradient(to right, var(--border2), var(--border), transparent)',
            marginTop: '14px',
          }} />
        </motion.div>

        {/* ── NEW: Radar Chart + Progress Rings (2-column grid) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          style={{ marginBottom: '28px' }}
        >
          <SectionLabel>Intelligence Metrics — Proficiency & Learning</SectionLabel>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px',
          }}>
            <SkillRadarChart />
            <LearningProgressRing />
          </div>
        </motion.div>

        {/* ── NEW: Knowledge Graph (full width) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{ marginBottom: '28px' }}
        >
          <SectionLabel>Knowledge Graph — Domain Connections</SectionLabel>
          <KnowledgeGraphViz />
        </motion.div>

        {/* ── Section 1: Skill Library ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          style={{ marginBottom: '28px' }}
        >
          <SectionLabel>Skill Library — All Capabilities</SectionLabel>
          <SkillLibrary onNewEvent={handleNewEvent} />
        </motion.div>

        {/* ── Section 2: Learning Log + System Brain ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={{ marginBottom: '28px' }}
        >
          <SectionLabel>Learning Activity</SectionLabel>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px',
          }}>
            <LearningLog newEvent={latestEvent} />
            <SystemBrain />
          </div>
        </motion.div>

        {/* ── Section 3: Knowledge Base ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <SectionLabel>Knowledge Base — Acquired Intelligence</SectionLabel>
          <KnowledgeBase />
        </motion.div>
      </div>
    </PageTransition>
  )
}
