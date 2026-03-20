'use client'

// ── components/skills/KnowledgeGraphViz.tsx ───────────────────────────────────
// Custom SVG knowledge graph with circular node arrangement and hover effects

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { CHART } from '@/lib/chartTheme'

type NodeCategory = 'Core' | 'Learned' | 'Pending'

interface KnowledgeNode {
  id:       string
  label:    string
  category: NodeCategory
  x:        number
  y:        number
}

interface Edge {
  from: string
  to:   string
}

// Node category colors
const CAT_COLORS: Record<NodeCategory, string> = {
  Core:    CHART.rose,
  Learned: CHART.gold,
  Pending: CHART.text3,
}

// Arrange nodes in a circular layout
const WIDTH  = 700
const HEIGHT = 340
const CX     = WIDTH  / 2
const CY     = HEIGHT / 2
const RADIUS = 130

function polar(deg: number, r: number = RADIUS): [number, number] {
  const rad = (deg - 90) * (Math.PI / 180)
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)]
}

const RAW_NODES: Array<{ id: string; label: string; category: NodeCategory; deg: number; r?: number }> = [
  { id: 'td',   label: 'Threat Detection',  category: 'Core',    deg: 0   },
  { id: 'ma',   label: 'Market Analysis',   category: 'Core',    deg: 30  },
  { id: 'nlp',  label: 'NLP',               category: 'Core',    deg: 60  },
  { id: 'cv',   label: 'Computer Vision',   category: 'Learned', deg: 90  },
  { id: 'ad',   label: 'Anomaly Detection', category: 'Learned', deg: 120 },
  { id: 'ra',   label: 'Risk Assessment',   category: 'Core',    deg: 150 },
  { id: 'pm',   label: 'Pattern Matching',  category: 'Core',    deg: 180 },
  { id: 'df',   label: 'Data Fusion',       category: 'Learned', deg: 210 },
  { id: 'pred', label: 'Prediction',        category: 'Learned', deg: 240 },
  { id: 'cls',  label: 'Classification',    category: 'Learned', deg: 270 },
  { id: 'clus', label: 'Clustering',        category: 'Pending', deg: 300 },
  { id: 'sp',   label: 'Signal Processing', category: 'Pending', deg: 330 },
  // Center node
  { id: 'core', label: 'NEXUS',             category: 'Core',    deg: 0, r: 0 },
]

const NODES: KnowledgeNode[] = RAW_NODES.map(n => {
  const [x, y] = polar(n.deg, n.r !== undefined ? n.r : RADIUS)
  return { id: n.id, label: n.label, category: n.category, x, y }
})

const EDGES: Edge[] = [
  // Hub connections from center
  { from: 'core', to: 'td'   },
  { from: 'core', to: 'ma'   },
  { from: 'core', to: 'nlp'  },
  { from: 'core', to: 'ra'   },
  { from: 'core', to: 'pm'   },
  // Outer ring connections
  { from: 'td',   to: 'ad'   },
  { from: 'td',   to: 'ra'   },
  { from: 'ma',   to: 'pred' },
  { from: 'ma',   to: 'cls'  },
  { from: 'nlp',  to: 'cv'   },
  { from: 'nlp',  to: 'df'   },
  { from: 'cv',   to: 'cls'  },
  { from: 'ad',   to: 'df'   },
  { from: 'pm',   to: 'sp'   },
  { from: 'pm',   to: 'clus' },
  { from: 'pred', to: 'cls'  },
  { from: 'cls',  to: 'clus' },
  { from: 'sp',   to: 'df'   },
  { from: 'ra',   to: 'pred' },
]

function getNodeById(id: string): KnowledgeNode | undefined {
  return NODES.find(n => n.id === id)
}

function getConnectedIds(nodeId: string): Set<string> {
  const connected = new Set<string>()
  EDGES.forEach(e => {
    if (e.from === nodeId) connected.add(e.to)
    if (e.to   === nodeId) connected.add(e.from)
  })
  return connected
}

export default function KnowledgeGraphViz() {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const connected = hoveredId ? getConnectedIds(hoveredId) : new Set<string>()

  const isEdgeHighlighted = useCallback((e: Edge): boolean => {
    if (!hoveredId) return false
    return e.from === hoveredId || e.to === hoveredId
  }, [hoveredId])

  const isNodeDimmed = useCallback((id: string): boolean => {
    if (!hoveredId) return false
    return id !== hoveredId && !connected.has(id)
  }, [hoveredId, connected])

  const NODE_R = 20
  const CENTER_R = 28

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      style={{
        background: CHART.surf2,
        border: `1px solid ${CHART.border}`,
        borderRadius: '12px',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background grid lines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(${CHART.border}30 1px, transparent 1px),
          linear-gradient(90deg, ${CHART.border}30 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      <div style={{ marginBottom: '16px', position: 'relative' }}>
        <div style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px',
          textTransform: 'uppercase', color: CHART.text3,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ color: CHART.violet, fontSize: '9px' }}>◆</span>
          Knowledge Graph
        </div>
        <div style={{ fontSize: '10px', color: CHART.text3, marginTop: '3px' }}>
          Hover nodes to explore connections · {NODES.length - 1} domains · {EDGES.length} edges
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: '16px', marginBottom: '12px',
        position: 'relative', flexWrap: 'wrap',
      }}>
        {(Object.entries(CAT_COLORS) as Array<[NodeCategory, string]>).map(([cat, color]) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: color, boxShadow: `0 0 4px ${color}66`,
            }} />
            <span style={{ fontSize: '9px', color: CHART.text2, fontFamily: 'monospace', fontWeight: 600 }}>
              {cat}
            </span>
          </div>
        ))}
      </div>

      {/* SVG Graph */}
      <div style={{ position: 'relative', width: '100%' }}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        >
          <defs>
            <filter id="kg-glow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <radialGradient id="center-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor={CHART.rose}    stopOpacity="0.3" />
              <stop offset="100%" stopColor={CHART.burgundy} stopOpacity="0.1" />
            </radialGradient>
          </defs>

          {/* Edges */}
          {EDGES.map((edge, i) => {
            const from = getNodeById(edge.from)
            const to   = getNodeById(edge.to)
            if (!from || !to) return null
            const highlighted = isEdgeHighlighted(edge)
            return (
              <line
                key={i}
                x1={from.x} y1={from.y}
                x2={to.x}   y2={to.y}
                stroke={highlighted ? CHART.rose : CHART.border2}
                strokeWidth={highlighted ? 1.5 : 0.8}
                strokeOpacity={hoveredId ? (highlighted ? 1 : 0.2) : 0.6}
                strokeDasharray={highlighted ? 'none' : '4 4'}
                style={{ transition: 'all 0.2s' }}
              />
            )
          })}

          {/* Nodes */}
          {NODES.map((node, i) => {
            const isCenter  = node.id === 'core'
            const r         = isCenter ? CENTER_R : NODE_R
            const color     = CAT_COLORS[node.category]
            const isHovered = node.id === hoveredId
            const dimmed    = isNodeDimmed(node.id)
            const floatDelay = i * 0.3

            return (
              <g
                key={node.id}
                style={{
                  cursor: 'pointer',
                  opacity: dimmed ? 0.25 : 1,
                  transition: 'opacity 0.2s',
                  animation: `nex-float ${3 + (i % 3)}s ease-in-out ${floatDelay}s infinite`,
                }}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Outer glow ring on hover */}
                {isHovered && (
                  <circle
                    cx={node.x} cy={node.y}
                    r={r + 8}
                    fill="none"
                    stroke={color}
                    strokeWidth={1}
                    strokeOpacity={0.4}
                    filter="url(#kg-glow)"
                  />
                )}

                {/* Node background */}
                <circle
                  cx={node.x} cy={node.y}
                  r={r}
                  fill={isCenter ? 'url(#center-grad)' : `${color}22`}
                  stroke={color}
                  strokeWidth={isHovered ? 2 : 1}
                  style={{ transition: 'all 0.15s' }}
                />

                {/* Center dot */}
                <circle
                  cx={node.x} cy={node.y}
                  r={isCenter ? 4 : 2.5}
                  fill={color}
                  filter={isHovered ? 'url(#kg-glow)' : 'none'}
                />

                {/* Label */}
                <text
                  x={node.x}
                  y={isCenter ? node.y + r + 14 : node.y + r + 12}
                  textAnchor="middle"
                  fontSize={isCenter ? 9 : 8}
                  fontFamily="monospace"
                  fontWeight={isHovered ? 800 : 600}
                  fill={isHovered ? color : CHART.text2}
                  style={{ transition: 'fill 0.15s', userSelect: 'none' }}
                >
                  {node.label}
                </text>

                {/* Category badge (center only) */}
                {isCenter && (
                  <text
                    x={node.x} y={node.y + 4}
                    textAnchor="middle"
                    fontSize={8}
                    fontFamily="monospace"
                    fontWeight={700}
                    fill={CHART.rose}
                    style={{ userSelect: 'none' }}
                  >
                    CORE
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </motion.div>
  )
}
