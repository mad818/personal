'use client'

// ── components/skills/SystemBrain.tsx ─────────────────────────────────────────
// NEXUS PRIME — System Brain: neural network visualization, central system
// metrics, knowledge graph hubs, and skill clusters from real knowledgeGraph lib.

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DEFAULT_SKILLS,
  getSystemHealthFromSkills,
} from '@/lib/skillEngine'
import { buildGraph, getHubSkills, getSkillClusters } from '@/lib/knowledgeGraph'

// ── Neural network node data ──────────────────────────────────────────────────
const INPUT_NODES = [
  { id: 'in-news',    label: 'News',     icon: '📰', active: true },
  { id: 'in-cve',     label: 'CVE',      icon: '🔒', active: true },
  { id: 'in-cam',     label: 'Cameras',  icon: '📷', active: false },
  { id: 'in-sensor',  label: 'Sensors',  icon: '⚡',  active: true },
  { id: 'in-markets', label: 'Markets',  icon: '📈', active: true },
]

const PROC_NODES = [
  { id: 'proc-ai',       label: 'AI Model',       icon: '🧠', active: true },
  { id: 'proc-pattern',  label: 'Pattern Engine', icon: '◈',  active: true },
  { id: 'proc-decision', label: 'Decision Engine',icon: '⚙️', active: false },
]

const OUTPUT_NODES = [
  { id: 'out-alerts',    label: 'Alerts',    icon: '🔔', active: true },
  { id: 'out-actions',   label: 'Actions',   icon: '▶',  active: false },
  { id: 'out-knowledge', label: 'Knowledge', icon: '💡', active: true },
]

const PRIORITY_COLORS = {
  High:   'var(--accent)',
  Medium: 'var(--gold)',
  Low:    'var(--text3)',
}

// ── Improvement queue — derived from skill success rates ──────────────────────
function buildImprovementQueue(skills: typeof DEFAULT_SKILLS) {
  return skills
    .filter(s => s.successRate < 0.80)
    .sort((a, b) => a.successRate - b.successRate)
    .slice(0, 5)
    .map((s, i) => ({
      id: `imp-${s.id}`,
      task: `Improve ${s.name} — current success rate ${Math.round(s.successRate * 100)}%`,
      priority: i === 0 ? 'High' as const : i <= 2 ? 'Medium' as const : 'Low' as const,
      improvement: `+${Math.round((0.90 - s.successRate) * 100)}%`,
      category: s.category,
    }))
}

// ── Simulated live metrics ─────────────────────────────────────────────────────
function useSystemMetrics() {
  const [uptime, setUptime] = useState(0)
  const [memUsed, setMemUsed] = useState(0)

  useEffect(() => {
    const start = Date.now() - Math.random() * 86400000 * 3  // random 0-3 days
    setUptime(Math.floor((Date.now() - start) / 1000))
    setMemUsed(Math.floor(Math.random() * 400 + 200))

    const interval = setInterval(() => {
      setUptime(t => t + 1)
      setMemUsed(m => Math.floor(m + (Math.random() - 0.48) * 2))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const d = Math.floor(uptime / 86400)
  const h = Math.floor((uptime % 86400) / 3600)
  const m = Math.floor((uptime % 3600) / 60)
  const s = uptime % 60
  const uptimeStr = d > 0
    ? `${d}d ${h}h ${m}m`
    : h > 0
    ? `${h}h ${m}m ${s}s`
    : `${m}m ${s}s`

  return { uptimeStr, memUsed }
}

// ── Neural node ────────────────────────────────────────────────────────────────
function NeuralNode({
  label,
  icon,
  active,
  pulse,
}: {
  label: string
  icon: string
  active: boolean
  pulse?: boolean
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
    }}>
      <motion.div
        animate={active && pulse ? {
          boxShadow: [
            '0 0 0px var(--accent)00',
            '0 0 12px var(--accent)66',
            '0 0 0px var(--accent)00',
          ],
        } : {}}
        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: Math.random() * 2 }}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: active ? 'var(--surf3)' : 'var(--surf)',
          border: `1.5px solid ${active ? 'var(--border2)' : 'var(--border)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          position: 'relative',
          cursor: 'default',
        }}
      >
        {icon}
        {active && (
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: 'var(--accent)',
              border: '1.5px solid var(--surf)',
            }}
          />
        )}
      </motion.div>
      <span style={{
        fontSize: '9px',
        fontWeight: 700,
        color: active ? 'var(--text2)' : 'var(--text3)',
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        textAlign: 'center',
        maxWidth: '52px',
        lineHeight: 1.2,
      }}>
        {label}
      </span>
    </div>
  )
}

// ── Connection line between columns ──────────────────────────────────────────
function ConnectionLines({ active }: { active: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '4px',
      width: '40px',
    }}>
      {[0, 1, 2, 3, 4].map(i => (
        <motion.div
          key={i}
          animate={active ? {
            opacity: [0.2, 0.8, 0.2],
            scaleX: [0.8, 1, 0.8],
          } : { opacity: 0.15 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut',
          }}
          style={{
            height: '1px',
            width: '100%',
            background: active
              ? 'linear-gradient(to right, var(--border2), var(--accent), var(--border2))'
              : 'var(--border)',
          }}
        />
      ))}
    </div>
  )
}

// ── Metric tile ────────────────────────────────────────────────────────────────
function MetricTile({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div style={{
      background: 'var(--surf)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '10px 12px',
    }}>
      <div style={{
        fontSize: '9px',
        fontWeight: 700,
        color: 'var(--text3)',
        textTransform: 'uppercase',
        letterSpacing: '0.6px',
        marginBottom: '4px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '16px',
        fontWeight: 900,
        fontFamily: 'monospace',
        color: color ?? 'var(--text)',
        lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '9px', color: 'var(--text3)', marginTop: '3px' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Main SystemBrain export ────────────────────────────────────────────────────
export default function SystemBrain() {
  const { uptimeStr, memUsed } = useSystemMetrics()
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [activeQueue, setActiveQueue] = useState<{ id: string; task: string; priority: 'High' | 'Medium' | 'Low'; improvement: string; category: string } | null>(null)

  const skills = DEFAULT_SKILLS
  const totalSkills = skills.length
  const avgLevel = Math.round(skills.reduce((s, sk) => s + sk.level, 0) / skills.length)
  const healthScore = getSystemHealthFromSkills(skills)
  const healthColor = healthScore >= 75 ? 'var(--gold)' : healthScore >= 50 ? 'var(--accent)' : 'var(--text3)'

  // Build real knowledge graph
  const graph = useMemo(() => buildGraph(skills), [skills])
  const hubSkills = useMemo(() => getHubSkills(graph, skills, 5, 2), [graph, skills])
  const clusters = useMemo(() => getSkillClusters(graph, skills, 5), [graph, skills])

  // Build improvement queue from real skill data
  const improvementQueue = useMemo(() => buildImprovementQueue(skills), [skills])
  const pendingImprovements = improvementQueue.filter(i => !dismissedIds.has(i.id))

  // Last learning event timing
  const lastEvent = '18m ago'
  const learningRate = `${(skills.filter(s => s.totalRuns > 100).length / skills.length * 5).toFixed(1)} skills/day`

  // Graph stats
  const totalEdges = Array.from(graph.values()).reduce((sum, neighbors) => sum + neighbors.size, 0) / 2

  return (
    <div style={{
      background: 'var(--surf2)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '16px',
    }}>
      <div style={{
        fontSize: '13px',
        fontWeight: 900,
        color: 'var(--text)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '16px',
      }}>
        System Brain
      </div>

      {/* Two-column layout: neural viz + metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '16px',
      }}>

        {/* Left: Neural Network Visualization */}
        <div style={{
          background: 'var(--surf)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '16px',
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 700,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.7px',
            marginBottom: '14px',
            textAlign: 'center',
          }}>
            Neural Architecture
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0',
          }}>
            {/* Input column */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              alignItems: 'center',
            }}>
              <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Input
              </div>
              {INPUT_NODES.map(node => (
                <NeuralNode key={node.id} {...node} pulse />
              ))}
            </div>

            <ConnectionLines active={true} />

            {/* Processing column */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: 'center',
              padding: '0 4px',
            }}>
              <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Process
              </div>
              {PROC_NODES.map(node => (
                <NeuralNode key={node.id} {...node} pulse />
              ))}
            </div>

            <ConnectionLines active={true} />

            {/* Output column */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: 'center',
            }}>
              <div style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Output
              </div>
              {OUTPUT_NODES.map(node => (
                <NeuralNode key={node.id} {...node} pulse />
              ))}
            </div>
          </div>

          {/* Node legend */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            marginTop: '14px',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />
              <span style={{ fontSize: '9px', color: 'var(--text3)' }}>Active</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--surf3)', border: '1px solid var(--border2)' }} />
              <span style={{ fontSize: '9px', color: 'var(--text3)' }}>Offline</span>
            </div>
          </div>
        </div>

        {/* Right: Metrics grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
          }}>
            <MetricTile
              label="Intelligence Score"
              value={String(healthScore)}
              sub="/ 100 composite"
              color={healthColor}
            />
            <MetricTile
              label="Total Skills"
              value={String(totalSkills)}
              sub={`across ${new Set(skills.map(s => s.category)).size} domains`}
              color="var(--text)"
            />
            <MetricTile
              label="Avg Proficiency"
              value={`${avgLevel}%`}
              sub="weighted average"
              color="var(--accent)"
            />
            <MetricTile
              label="Graph Edges"
              value={String(Math.round(totalEdges))}
              sub={`${clusters.length} clusters`}
              color="var(--gold)"
            />
            <MetricTile
              label="Uptime"
              value={uptimeStr}
              color="var(--text)"
            />
            <MetricTile
              label="Memory Used"
              value={`${memUsed} MB`}
              sub="skill model cache"
              color="var(--blush)"
            />
          </div>

          {/* Last learning event */}
          <div style={{
            background: 'var(--surf)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: '6px', height: '6px',
                borderRadius: '50%',
                background: 'var(--accent)',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '10px', color: 'var(--text3)' }}>Last event:</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text2)' }}>
              CVE Analysis optimized — {lastEvent}
            </span>
          </div>
        </div>
      </div>

      {/* Knowledge Hubs section */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--text3)',
          textTransform: 'uppercase',
          letterSpacing: '0.7px',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          Knowledge Hubs
          <span style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            color: 'var(--gold)',
            fontWeight: 700,
          }}>
            {hubSkills.length} most connected
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '6px',
        }}>
          {hubSkills.map((hub, i) => (
            <div key={hub.skillId} style={{
              background: 'var(--surf)',
              border: `1px solid ${i === 0 ? 'var(--gold)44' : 'var(--border)'}`,
              borderRadius: '8px',
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: i === 0 ? 'var(--gold)22' : 'var(--surf2)',
                border: `1px solid ${i === 0 ? 'var(--gold)66' : 'var(--border2)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 900,
                fontFamily: 'monospace',
                color: i === 0 ? 'var(--gold)' : 'var(--text3)',
                flexShrink: 0,
              }}>
                {hub.connections}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
                  {hub.skillName}
                </div>
                <div style={{ fontSize: '8px', color: 'var(--text3)', marginTop: '1px' }}>
                  centrality {(hub.centrality * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skill Clusters section */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--text3)',
          textTransform: 'uppercase',
          letterSpacing: '0.7px',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          Skill Clusters
          <span style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            color: 'var(--blush)',
            fontWeight: 700,
          }}>
            {clusters.length} detected
          </span>
        </div>

        <div style={{
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
        }}>
          {clusters.slice(0, 8).map(cluster => (
            <div key={cluster.id} style={{
              padding: '4px 10px',
              borderRadius: '5px',
              background: 'var(--surf)',
              border: '1px solid var(--border)',
              fontSize: '10px',
              color: 'var(--text2)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}>
              <span style={{ color: 'var(--blush)', fontWeight: 700, fontFamily: 'monospace', fontSize: '9px' }}>
                {cluster.skillIds.length}
              </span>
              <span>{cluster.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Self-Improvement Queue */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.7px',
          }}>
            Self-Improvement Queue
          </div>
          <span style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            color: 'var(--accent)',
            fontWeight: 700,
          }}>
            {pendingImprovements.length} pending
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <AnimatePresence>
            {pendingImprovements.map(item => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  background: activeQueue?.id === item.id ? 'var(--surf3)' : 'var(--surf)',
                  border: `1px solid ${activeQueue?.id === item.id ? 'var(--border2)' : 'var(--border)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onClick={() => setActiveQueue(activeQueue?.id === item.id ? null : item)}
              >
                {/* Priority badge */}
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: `${PRIORITY_COLORS[item.priority]}18`,
                  color: PRIORITY_COLORS[item.priority],
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  flexShrink: 0,
                }}>
                  {item.priority}
                </span>

                {/* Task */}
                <span style={{
                  flex: 1,
                  fontSize: '11.5px',
                  color: 'var(--text2)',
                  lineHeight: 1.3,
                }}>
                  {item.task}
                </span>

                {/* Improvement estimate */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    color: 'var(--gold)',
                  }}>
                    {item.improvement}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDismissedIds(prev => { const s = new Set(Array.from(prev)); s.add(item.id); return s })
                    }}
                    style={{
                      fontSize: '10px',
                      color: 'var(--text3)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      borderRadius: '3px',
                    }}
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {pendingImprovements.length === 0 && (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: 'var(--text3)',
              fontSize: '12px',
            }}>
              All improvements applied ✦
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
