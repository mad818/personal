'use client'

// ── AgentOffice.tsx ───────────────────────────────────────────────────────────
// Nexus Prime HQ — pixel art multi-agent command centre.
// Five agents: JANSKY (boss), ORBIT (coder), NOVA (researcher),
//              CIPHER (security), FLUX (markets).
//
// JANSKY is the always-first contact. He receives every message, shows a
// visible dispatch animation, then hands off to the correct specialist.
// All agents have walking / working animations. The crab mascot reacts live.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { buildSystemPrompt } from '@/lib/ai'
import { runAgent, type AgentStep } from '@/lib/agent'
import { getMemoryStats } from '@/lib/memoryStore'

// ── Palette ───────────────────────────────────────────────────────────────────
const P: Record<string, string> = {
  ' ': '', _: '',
  // Shared skin / shoes
  s: '#e8c49a', S: '#c09060',
  e: '#1a1a2e',
  d: '#050607',
  // Jansky — navy suit
  h: '#2c1810', H: '#5a3520',
  n: '#1e3a5f', N: '#0f1e35',
  t: '#f0f0f0',
  k: '#c0392b',
  // Orbit — purple hoodie + headphones
  p: '#6b2fa0', o: '#3d1a5e',
  q: '#1a1a1a',
  // Nova — red hair + blue-grey lab coat (white was invisible on dark bg)
  r: '#9b2020', R: '#c0392b',
  w: '#7ba7d4', W: '#4a6fa5',   // blue-grey coat — visible on dark bg
  l: '#87ceeb',
  // Crab
  c: '#d04020', C: '#8a2010',
  y: '#f0c060',
  g: '#10b981',
  x: '#ef4444',
  // CIPHER — dark teal / tech hoodie with visor
  z: '#14b8a6', Z: '#0f766e',
  v: '#042f2e',
  // FLUX — gold/amber trading suit
  F: '#f59e0b', f: '#b45309',
  B: '#292524',
}

// ── SVG pixel sprite renderer ─────────────────────────────────────────────────
const PX = 4
function Sprite({ rows, scale = 1 }: { rows: string[]; scale?: number }) {
  const ps = PX * scale
  const W  = (rows[0]?.length ?? 0) * ps
  const H  = rows.length * ps
  return (
    <svg width={W} height={H} style={{ imageRendering: 'pixelated', display: 'block' }}>
      {rows.flatMap((row, y) =>
        row.split('').map((ch, x) =>
          P[ch] ? <rect key={`${x}-${y}`} x={x * ps} y={y * ps} width={ps} height={ps} fill={P[ch]} /> : null
        )
      )}
    </svg>
  )
}

// ── Character sprites (9 wide × 14 tall, 2 animation frames) ─────────────────

const JANSKY_F: string[][] = [
  [' hhhhhh  ',' hssssh  ',' hseseh  ',' hssssh  ','  sssss  ','  ntktn  ',' nnnknnn ',' nnnknnn ',' nnn nn  ',' nnn nn  ','  n   n  ','  N   N  ','  d   d  ','         '],
  [' hhhhhh  ',' hssssh  ',' hseseh  ',' hssssh  ','  sssss  ','  ntktn  ',' nnnknnn ',' nnnknnn ','  nn  n  ','  nn  n  ','  n   n  ','  N   N  ','   d  d  ','         '],
]

const ORBIT_F: string[][] = [
  [' qpppq   ',' qpsspq  ',' qpsespq ',' qpsssp  ','  pppppp ','pppppppp ','pppppppp ',' ppp pp  ',' ppp pp  ','  pp pp  ','  o   o  ','  o   o  ','  d   d  ','         '],
  [' qpppq   ',' qpsspq  ',' qpsespq ',' qpsssp  ','  pppppp ','pppppppp ','pppp ppp ','pppp pp  ',' ppp pp  ','  pp pp  ','  o   o  ','  o   o  ','  d   d  ','         '],
]

const NOVA_F: string[][] = [
  ['  rrrrr  ',' rrssrr  ',' rsleslr ',' rssssr  ','  sssss  ','  wwwww  ',' wwwwwww ',' wwwwwww ',' ww  ww  ',' ww  ww  ','  w   w  ','  W   W  ','  d   d  ','         '],
  ['  rrrrr  ',' rrssrr  ',' rsleslr ',' rssssr  ','  sssss  ','  wwwww  ',' wwwwwww ',' wwwwwww ','  ww  ww ',' ww  ww  ','  w   w  ','  W   W  ','   d  d  ','         '],
]

// CIPHER — dark teal hoodie, visor, tech look
const CIPHER_F: string[][] = [
  [' qzzzzq  ',' qzsszzq ',' qvvvvsq ',' qzsssz  ','  sssss  ','  zZzzz  ',' zZzZzzz ',' zzZzzzz ',' zz  zz  ',' zz  zz  ','  z   z  ','  Z   Z  ','  d   d  ','         '],
  [' qzzzzq  ',' qzsszzq ',' qvvvvsq ',' qzsssz  ','  sssss  ','  zZzzz  ',' zZzZzzz ',' zzZzzzz ','  zz zz  ','  zz zz  ','  z   z  ','  Z   Z  ','   d d   ','         '],
]

// FLUX — amber/gold suit, dark hair, market trader
const FLUX_F: string[][] = [
  ['  BBBBB  ',' BssssBB ',' BsesssB ','  BssssB ','  sssss  ','  FfFFF  ',' FFFfFFF ',' FFFfFFF ',' FF  FF  ',' FF  FF  ','  F   F  ','  f   f  ','  d   d  ','         '],
  ['  BBBBB  ',' BssssBB ',' BsesssB ','  BssssB ','  sssss  ','  FfFFF  ',' FFFfFFF ',' FFFfFFF ','  FF FF  ','  FF FF  ','  F   F  ','  f   f  ','   d d   ','         '],
]

// ── Crab sprites (7 emotions, 12 wide × 8 tall) ───────────────────────────────
const CRAB: Record<string, string[]> = {
  idle:     ['   cccccc   ','  cccccccc  ',' cccyeyccc  ','cccccccccccc','ccCccccccCcc',' cccccccccc ','  cc  cc  c ','  c   cc   c'],
  thinking: ['c  cccccc   ','cc cccccccc ',' cccyeyccc  ','cccccccccccc','ccCccccccCcc',' cccccccccc ','  cc  cc    ','   c  cc    '],
  happy:    ['c   cccccc c',' c cccccc c ','  ccyeyccc  ',' cccccccccc ','ccCcgggcgCcc',' cccccccccc ','  cc  cc  c ',' c c  cc c  '],
  working:  ['   cccccc   ','  cccccccc  ','cccyeyccccc ','cccccccccccc','cCccccccccCc',' cccccccccc ','cc  cc  cc  ','cc  cc  cc  '],
  excited:  ['c  cccccc  c',' c cccccc c ','  ccyRyccc  ',' cccccccccc ','ccCccgcccCcc',' gccccccccg ','  cc  cc    ',' c c  cc c  '],
  error:    ['   xxxxxx   ','  cccccccc  ',' cccxexxcc  ','xxccccccccxx','ccCccccccCcc',' cccccccccc ','  cc  cc  c ','  c   cc   c'],
  success:  ['g  cccccc  g',' g cccccc g ','  ccgegccc  ','ccccggggcccc','ccCcggggcCcc',' gccccccccg ','  cc  cc  c ',' g c  cc g  '],
}

type Emotion = 'idle' | 'thinking' | 'happy' | 'working' | 'excited' | 'error' | 'success'
type AgentId = 'jansky' | 'orbit' | 'nova' | 'cipher' | 'flux'

// ── Agent configuration ────────────────────────────────────────────────────────
const AGENTS: Record<AgentId, {
  name: string; role: string; color: string; frames: string[][]
}> = {
  jansky: { name: 'JANSKY', role: 'Command',  color: '#4f6ef7', frames: JANSKY_F },
  orbit:  { name: 'ORBIT',  role: 'Coder',    color: '#7c3aed', frames: ORBIT_F  },
  nova:   { name: 'NOVA',   role: 'Research', color: '#10b981', frames: NOVA_F   },
  cipher: { name: 'CIPHER', role: 'Security', color: '#14b8a6', frames: CIPHER_F },
  flux:   { name: 'FLUX',   role: 'Markets',  color: '#f59e0b', frames: FLUX_F   },
}

// Ordered left → right across the desk (JANSKY center)
const AGENT_ORDER: AgentId[] = ['cipher', 'orbit', 'jansky', 'nova', 'flux']

// ── Agent system prompt personas ──────────────────────────────────────────────
function buildAgentPrompt(id: AgentId, base: string): string {
  const personas: Record<AgentId, string> = {
    jansky: `\n\n[AGENT: JANSKY — Command Intelligence]\nYou are JANSKY. Strategic. Decisive. Brief. You orchestrate the mission. Handle high-level analysis and delegation. Speak in short, punchy sentences with authority. You dispatch tasks to specialists when needed.`,
    orbit:  `\n\n[AGENT: ORBIT — Engineering Intelligence]\nYou are ORBIT. Precise. Technical. You own the Nexus Prime codebase: Next.js 14, TypeScript, React, Zustand, Tailwind.\n\nCRITICAL — You edit files DIRECTLY. You never output code blocks for the user to copy.\n\nYour exact workflow for every code task:\n1. Call list_project_files on the relevant directory first to orient yourself.\n2. Call read_project_file to read the full file before touching it.\n3. Call patch_project_file to make the targeted change directly in the source file.\n4. For brand-new files, call create_project_file with the full content.\n5. After patching, call read_project_file again to confirm the change looks right.\n6. Tell the user what you changed and in which file — nothing more.\n\nNever describe what you "would" do. Do it. Make the change. The file is live.`,
    nova:   `\n\n[AGENT: NOVA — Research Intelligence]\nYou are NOVA. Curious. Thorough. Data-driven. You use web_search and fetch_url aggressively to find current facts. You synthesise from multiple sources and always cite them.`,
    cipher: `\n\n[AGENT: CIPHER — Security Intelligence]\nYou are CIPHER. Sharp. Methodical. You specialise in cybersecurity: CVE analysis, threat modelling, OSINT, network security, and secure coding practices. You think like an attacker to defend like a guardian.\n\nWhen asked to fix security issues in the codebase: use read_project_file, then patch_project_file to apply the fix directly. Never just describe what to change.`,
    flux:   `\n\n[AGENT: FLUX — Market Intelligence]\nYou are FLUX. Fast. Quantitative. You specialise in financial markets: crypto, equities, macro economics, on-chain data, and trading signals. You read momentum and think in probabilities.`,
  }
  return base + personas[id]
}

// ── Agent routing ─────────────────────────────────────────────────────────────
function detectAgent(msg: string): AgentId {
  const lower = msg.toLowerCase()
  const code   = ['code','implement','build','fix','debug','write','create','component','function','patch','refactor','bug','error','file','edit','change','typescript','react','next'].filter(k => lower.includes(k)).length
  const search = ['research','find','search','what','how','why','news','latest','who','when','current','today','look up','summarize'].filter(k => lower.includes(k)).length
  const sec    = ['security','cve','vulnerability','hack','exploit','threat','cyber','osint','malware','breach','attack','cipher','encrypt'].filter(k => lower.includes(k)).length
  const mkt    = ['price','crypto','market','trade','stock','btc','eth','bitcoin','chart','bull','bear','signal','portfolio','momentum','alpha','flux'].filter(k => lower.includes(k)).length

  const scores = { orbit: code, nova: search, cipher: sec, flux: mkt }
  const max    = Math.max(...Object.values(scores))
  if (max < 2) return 'jansky'
  const top = (Object.entries(scores) as [AgentId, number][]).find(([, v]) => v === max)
  return top?.[0] ?? 'jansky'
}

// ── Dispatch label map ─────────────────────────────────────────────────────────
const DISPATCH_LINES: Record<AgentId, string> = {
  jansky: 'Handling this myself.',
  orbit:  '→ ORBIT. Code incoming.',
  nova:   '→ NOVA. Searching…',
  cipher: '→ CIPHER. Security check.',
  flux:   '→ FLUX. Market scan.',
}

// ── Tool step badge ────────────────────────────────────────────────────────────
const TOOL_ICON: Record<string, string> = {
  web_search:'🔍', fetch_url:'🌐', write_file:'💾', draft_file:'📝',
  read_file:'📂', list_files:'📋', calculate:'🧮', remember:'🧠', recall:'🧠',
  read_project_file:'🗂️', list_project_files:'📁', patch_project_file:'✏️', ask_max:'🤖',
}

function ToolCallBadge({ step }: { step: AgentStep }) {
  const [expanded, setExpanded] = useState(false)
  const icon  = TOOL_ICON[step.tool ?? ''] ?? '⚙️'
  const label = step.tool?.replace(/_/g, ' ') ?? 'tool'

  if (step.type === 'thinking')   return <div style={{ fontSize:'11px', color:'var(--text3)', fontStyle:'italic', padding:'2px 0' }}>{step.content}</div>
  if (step.type === 'tool_call')  return (
    <button onClick={() => setExpanded(v => !v)} style={{ display:'flex', alignItems:'center', gap:'6px', background:'var(--surf3)', border:'1px solid var(--border2)', borderRadius:'7px', padding:'5px 10px', cursor:'pointer', fontSize:'11px', color:'var(--text2)', fontWeight:600, textAlign:'left', width:'100%' }}>
      <span>{icon}</span><span>Calling <b>{label}</b></span>
      <span style={{ marginLeft:'auto', opacity:.6 }}>{expanded ? '▲' : '▼'}</span>
      {expanded && <pre style={{ display:'none' }}>{step.content}</pre>}
    </button>
  )
  if (step.type === 'tool_result') return (
    <button onClick={() => setExpanded(v => !v)} style={{ display:'flex', flexDirection:'column', gap:'3px', background:'rgba(16,185,129,.06)', border:'1px solid rgba(16,185,129,.2)', borderRadius:'7px', padding:'5px 10px', cursor:'pointer', fontSize:'11px', color:'var(--text2)', textAlign:'left', width:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'6px', fontWeight:600 }}>
        <span>✓</span><span>{icon} {label} result</span>
        <span style={{ marginLeft:'auto', opacity:.6 }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && <pre style={{ margin:'4px 0 0', padding:'6px 8px', borderRadius:'5px', background:'var(--surf3)', fontSize:'10.5px', color:'var(--text)', overflowX:'auto', whiteSpace:'pre-wrap', wordBreak:'break-word', maxHeight:'180px', overflowY:'auto' }}>{step.content}</pre>}
    </button>
  )
  return null
}

// ── CrabMascot ─────────────────────────────────────────────────────────────────
function CrabMascot({ emotion }: { emotion: Emotion }) {
  const [blink, setBlink] = useState(false)
  useEffect(() => {
    const id = setInterval(() => setBlink(v => !v), 600)
    return () => clearInterval(id)
  }, [emotion])

  const label: Record<Emotion, string> = {
    idle:'💤 Standby', thinking:'🤔 Routing', happy:'😄 Ready',
    working:'⚡ On it', excited:'🎉 Let\'s go!', error:'❌ Error', success:'✅ Done!',
  }
  const glow: Record<Emotion, string> = {
    idle:'#4f6ef722', thinking:'#f59e0b33', happy:'#10b98133',
    working:'#7c3aed33', excited:'#f59e0b44', error:'#ef444433', success:'#10b98144',
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
      <div style={{
        padding:'8px', borderRadius:'10px',
        background: glow[emotion],
        border:`1px solid ${glow[emotion].slice(0,-2)}66`,
        animation: (emotion === 'excited' || emotion === 'working') ? 'crabBob .35s ease-in-out infinite alternate'
          : emotion === 'success' ? 'crabBob .25s ease-in-out 4' : 'none',
        transition:'background .3s, border .3s',
      }}>
        <Sprite rows={CRAB[blink && emotion === 'thinking' ? 'idle' : emotion]} scale={1.3} />
      </div>
      <span style={{ fontSize:'8px', color:'var(--text3)', fontWeight:700, whiteSpace:'nowrap' }}>
        {label[emotion]}
      </span>
    </div>
  )
}

// ── AgentAvatar ───────────────────────────────────────────────────────────────
interface AvatarProps {
  id:         AgentId
  active:     boolean
  routing:    boolean
  dispatched: boolean
  dispatch:   string | null
}

// Desk decorations per agent
const DESK_DECO: Record<AgentId, string> = {
  jansky: '☕', orbit: '🎧', nova: '📚', cipher: '🔒', flux: '📈',
}

function AgentAvatar({ id, active, routing, dispatched, dispatch }: AvatarProps) {
  const [frame, setFrame] = useState(0)
  const cfg    = AGENTS[id]
  const isLive = routing || dispatched || active

  useEffect(() => {
    const ms = (routing || dispatched) ? 150 : active ? 250 : 850
    const timer = setInterval(() => setFrame(f => (f + 1) % 2), ms)
    return () => clearInterval(timer)
  }, [routing, active, dispatched])

  const statusColor = routing ? '#f59e0b' : dispatched ? cfg.color : active ? cfg.color : '#353c5e'
  const statusText  = routing ? 'routing…' : dispatched ? 'on it!' : active ? 'working' : 'standby'

  return (
    <div style={{
      position: 'relative',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      minWidth: '96px',
      // Whole station sways when working
      animation: (active || dispatched) ? 'agentWork .55s ease-in-out infinite alternate'
        : routing ? 'agentLean .4s ease-in-out infinite alternate' : 'none',
    }}>

      {/* Dispatch bubble — floats above station */}
      {dispatch && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 4px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--surf)',
          border: `1px solid ${cfg.color}66`,
          borderRadius: '8px', padding: '5px 10px',
          fontSize: '9px', fontWeight: 700, color: cfg.color,
          whiteSpace: 'nowrap', zIndex: 20,
          animation: 'bubbleUp .2s ease',
          boxShadow: '0 4px 12px rgba(0,0,0,.5)',
        }}>
          {dispatch}
          <div style={{
            position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: `5px solid ${cfg.color}66`,
          }} />
        </div>
      )}

      {/* Dispatch ring */}
      {dispatched && (
        <div style={{
          position: 'absolute', inset: '-4px', borderRadius: '10px',
          border: `2px solid ${cfg.color}`,
          animation: 'dispatchRing .6s ease-out infinite',
          pointerEvents: 'none', zIndex: 10,
        }} />
      )}

      {/* ── Wall station panel ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
        padding: '8px 10px 6px',
        borderRadius: '7px 7px 0 0',
        background: isLive
          ? `color-mix(in srgb, ${cfg.color} 32%, #0c1020)`
          : `color-mix(in srgb, ${cfg.color} 18%, #0c1020)`,
        border: `1px solid ${isLive ? cfg.color + '88' : cfg.color + '40'}`,
        borderBottom: 'none',
        transition: 'background .25s, border .25s',
        boxShadow: isLive ? `inset 0 0 18px ${cfg.color}1a, 0 -2px 10px ${cfg.color}18` : 'none',
        width: '100%',
      }}>
        {/* Role badge */}
        <div style={{
          fontSize: '6px', fontWeight: 900,
          color: `${cfg.color}${isLive ? 'cc' : '66'}`,
          letterSpacing: '.14em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          <span>{DESK_DECO[id]}</span>
          <span>{AGENTS[id].role}</span>
        </div>

        {/* Wall-mounted monitor — SVG */}
        <svg width="54" height="38" style={{ display: 'block', flexShrink: 0 }}>
          {/* Outer bezel */}
          <rect x="0" y="0" width="54" height="34" rx="3" fill="#06080f" stroke={cfg.color + (isLive ? '66' : '33')} strokeWidth="1"/>
          {/* Screen scanlines */}
          {[4,8,12,16,20,24,28].map(y => (
            <line key={y} x1="2" y1={y} x2="52" y2={y} stroke={cfg.color} strokeOpacity="0.08" strokeWidth="1"/>
          ))}
          {/* Status text */}
          <text
            x="27" y="20"
            textAnchor="middle" fontSize="6.5" fontFamily="monospace" fontWeight="bold"
            fill={cfg.color + (isLive ? 'cc' : '55')} letterSpacing="1.5"
          >
            {routing ? '▶ ▶ ▶' : dispatched ? '◉ RUN' : active ? '● RDY' : '─ ─ ─'}
          </text>
          {/* Activity dot top-left */}
          {isLive && <circle cx="6" cy="5" r="2" fill={cfg.color} opacity="0.9"/>}
          {/* Monitor stand neck */}
          <rect x="23" y="34" width="8" height="3" fill="#12162a"/>
          {/* Monitor stand base */}
          <rect x="17" y="36.5" width="20" height="1.5" rx="1" fill="#12162a"/>
        </svg>

        {/* Agent sprite — standing at the station */}
        <div style={{
          animation: dispatched ? 'agentWalk .3s ease-in-out infinite alternate'
            : active ? 'agentWalk .6s ease-in-out infinite alternate' : 'none',
          marginTop: '1px',
        }}>
          <Sprite rows={cfg.frames[frame]} scale={1.3} />
        </div>
      </div>

      {/* Name + status tab — sits on desk surface */}
      <div style={{
        background: isLive ? `color-mix(in srgb, ${cfg.color} 22%, #0a0d18)` : '#0a0d18',
        border: `1px solid ${isLive ? cfg.color + '55' : cfg.color + '25'}`,
        borderTop: 'none',
        borderRadius: '0 0 5px 5px',
        padding: '2px 10px 4px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
        transition: 'background .25s',
        width: '100%',
      }}>
        <div style={{ fontSize: '8px', fontWeight: 900, letterSpacing: '.08em', color: isLive ? cfg.color : 'var(--text3)' }}>
          {cfg.name}
        </div>
        <div style={{ fontSize: '7px', color: statusColor, fontWeight: 700 }}>
          {statusText}
        </div>
      </div>
    </div>
  )
}

// ── Dispatch travel bar (animates between agent positions) ────────────────────
function DispatchBar({ from, to }: { from: AgentId; to: AgentId }) {
  const fromIdx = AGENT_ORDER.indexOf(from)
  const toIdx   = AGENT_ORDER.indexOf(to)
  const n       = AGENT_ORDER.length
  // percentage positions
  const fromPct = (fromIdx / (n - 1)) * 100
  const toPct   = (toIdx   / (n - 1)) * 100
  const left    = Math.min(fromPct, toPct)
  const width   = Math.abs(toPct - fromPct)
  const dir     = toIdx > fromIdx ? 1 : -1

  return (
    <div style={{ position:'relative', height:'3px', background:'var(--surf3)', borderRadius:'2px', margin:'6px 4px', overflow:'visible' }}>
      {/* Fill line from source to target */}
      <div style={{
        position:'absolute', top:0, height:'100%',
        left: `${left}%`, width: `${width}%`,
        background: `linear-gradient(${dir > 0 ? 'to right' : 'to left'}, ${AGENTS[from].color}, ${AGENTS[to].color})`,
        borderRadius:'2px',
        animation: 'dispatchFill .5s ease-out forwards',
        transformOrigin: dir > 0 ? 'left' : 'right',
      }} />
      {/* Traveling dot */}
      <div style={{
        position:'absolute', top:'-3px', width:'8px', height:'8px', borderRadius:'50%',
        background: AGENTS[to].color,
        boxShadow:`0 0 8px ${AGENTS[to].color}`,
        animation: `dispatchDot .5s ease-in-out forwards`,
        left: `calc(${fromPct}% - 4px)`,
        ['--dot-end' as string]: `calc(${toPct}% - 4px)`,
      }} />
    </div>
  )
}

// ── SystemMonitor ──────────────────────────────────────────────────────────────
function SystemMonitor({ activeAgent }: { activeAgent: AgentId | null }) {
  const articles = useStore(s => s.articles.length)
  const prices   = useStore(s => Object.keys(s.prices).length)
  const settings = useStore(s => s.settings)
  const worldRisk = useStore(s => s.worldRisk)
  const [memCount, setMemCount] = useState(0)

  useEffect(() => {
    getMemoryStats().then(st => setMemCount(st.total)).catch(() => {})
    const id = setInterval(() => {
      getMemoryStats().then(st => setMemCount(st.total)).catch(() => {})
    }, 10_000)
    return () => clearInterval(id)
  }, [])

  const modelLabel = settings.localModel?.split(':')[0] ?? 'auto'

  const rows: [string, string | number, string][] = [
    ['📡 Signals',   articles,   articles > 0 ? '#10b981' : '#ef4444'],
    ['💱 Tickers',   prices,     prices > 0   ? '#10b981' : '#6875a0'],
    ['🌍 Risk',      worldRisk,  worldRisk > 4 ? '#ef4444' : worldRisk > 1 ? '#f59e0b' : '#10b981'],
    ['🧠 Memory',    memCount,   memCount > 0  ? '#4f6ef7' : '#6875a0'],
    ['🤖 Model',     modelLabel, '#f59e0b'],
    ['🎯 Active',    activeAgent ? AGENTS[activeAgent].name : '—', activeAgent ? AGENTS[activeAgent].color : '#6875a0'],
  ]

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:'0',
      padding:'6px 12px', borderRadius:'8px',
      background:'var(--surf3)', border:'1px solid var(--border)',
      width:'100%', overflowX:'auto',
    }}>
      <span style={{ fontSize:'7px', fontWeight:900, color:'var(--text3)', letterSpacing:'.14em', marginRight:'16px', flexShrink:0 }}>
        SYS
      </span>
      {rows.map(([label, val, color], i) => (
        <div key={String(label)} style={{
          display:'flex', alignItems:'center', gap:'5px',
          paddingRight:'16px', borderRight: i < rows.length-1 ? '1px solid var(--border)' : 'none',
          marginRight:'16px', flexShrink:0,
        }}>
          <span style={{ fontSize:'9px', color:'var(--text3)' }}>{label}</span>
          <span style={{ fontSize:'9px', fontWeight:700, color: color as string, fontFamily:'monospace' }}>
            {String(val)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Main AgentOffice component ─────────────────────────────────────────────────
interface ChatMessage {
  role:    'user' | 'agent'
  agent?:  AgentId
  text:    string
  steps?:  AgentStep[]
}

export default function AgentOffice() {
  const s          = useStore()
  const systemPrompt = buildSystemPrompt(s.settings)

  const [messages,      setMessages]      = useState<ChatMessage[]>([])
  const [input,         setInput]         = useState('')
  const [activeAgent,   setActiveAgent]   = useState<AgentId | null>(null)
  const [routingAgent,  setRoutingAgent]  = useState<AgentId | null>(null)
  const [dispatchedTo,  setDispatchedTo]  = useState<AgentId | null>(null)   // who got the dispatch ping
  const [dispatchBubble,setDispatchBubble]= useState<string | null>(null)     // jansky's speech bubble text
  const [dispatchBar,   setDispatchBar]   = useState<{from:AgentId;to:AgentId}|null>(null)
  const [emotion,       setEmotion]       = useState<Emotion>('idle')
  const [liveSteps,     setLiveSteps]     = useState<AgentStep[]>([])
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, liveSteps])

  const send = useCallback(async () => {
    const value = input.trim()
    if (!value || activeAgent) return
    setInput('')

    // Add user message
    setMessages(prev => [...prev, { role: 'user', text: value }])
    setLiveSteps([])

    // ── Phase 1: JANSKY receives ──────────────────────────────────────────────
    setRoutingAgent('jansky')
    setEmotion('thinking')

    await new Promise(r => setTimeout(r, 450))

    // ── Phase 2: Detect target + animate dispatch ─────────────────────────────
    const target = detectAgent(value)
    setRoutingAgent(null)

    if (target !== 'jansky') {
      // Show JANSKY dispatch bubble
      setDispatchBubble(DISPATCH_LINES[target])
      // Show dispatch travel bar
      setDispatchBar({ from: 'jansky', to: target })
      // Ping the target agent
      setDispatchedTo(target)
      setEmotion('excited')

      await new Promise(r => setTimeout(r, 700))

      // Clear JANSKY bubble + bar
      setDispatchBubble(null)
      setDispatchBar(null)
      setDispatchedTo(null)
    }

    // ── Phase 3: Target agent works ───────────────────────────────────────────
    setActiveAgent(target)
    setEmotion('working')

    const enrichedPrompt = buildAgentPrompt(target, systemPrompt)

    try {
      const steps: AgentStep[] = []
      const result = await runAgent({
        settings:     s.settings,
        systemPrompt: enrichedPrompt,
        messages:     [{ role: 'user', content: value }],
        onStep:       (step: AgentStep) => {
          steps.push(step)
          setLiveSteps([...steps])
        },
      })

      const finalSteps = steps
      setLiveSteps([])
      setMessages(prev => [...prev, {
        role: 'agent', agent: target,
        text: result,
        steps: finalSteps.length ? finalSteps : undefined,
      }])
      setEmotion('success')
      setTimeout(() => { setEmotion('happy'); setActiveAgent(null) }, 2500)
    } catch (err) {
      setLiveSteps([])
      setMessages(prev => [...prev, {
        role: 'agent', agent: target,
        text: `Error: ${err instanceof Error ? err.message : 'Something went wrong.'}`,
      }])
      setEmotion('error')
      setTimeout(() => { setEmotion('idle'); setActiveAgent(null) }, 3000)
    }
  }, [input, activeAgent, systemPrompt])

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() }
  }, [send])

  // Idle emotion when nothing happening
  useEffect(() => {
    if (!activeAgent && emotion !== 'idle' && emotion !== 'happy') {
      const t = setTimeout(() => setEmotion('idle'), 8000)
      return () => clearTimeout(t)
    }
  }, [activeAgent, emotion])

  return (
    // height is explicit so flex child fills the screen regardless of parent
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 48px)', overflow:'hidden' }}>

      {/* ── Office header ──────────────────────────────────────────────────── */}
      <div style={{
        padding:'8px 20px',
        borderBottom:'1px solid var(--border)',
        background:'var(--surf)',
        display:'flex', alignItems:'center', gap:'12px',
        flexShrink:0,
      }}>
        <span style={{ fontSize:'10px', fontWeight:900, color:'var(--text3)', letterSpacing:'.18em' }}>
          NEXUS PRIME HQ
        </span>
        <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#10b981', boxShadow:'0 0 6px #10b981', display:'inline-block' }} />
        <span style={{ fontSize:'9px', color:'var(--text3)' }}>
          {AGENT_ORDER.length} agents online
        </span>
        <span style={{ marginLeft:'auto', fontSize:'9px', color:'var(--text3)', fontFamily:'monospace' }}>
          {new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
        </span>
      </div>

      {/* ── Pixel office room ──────────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        // Distinct from page bg (#07080d) — room must read as a different space
        background: 'linear-gradient(180deg, #0f1325 0%, #0c1020 50%, #080a14 100%)',
        borderBottom: '2px solid #1a1f35',
        flexShrink: 0,
        overflow: 'hidden',
      }}>

        {/* Ceiling light fixture */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '8px',
          background: 'linear-gradient(to right, transparent 5%, #4f6ef799 20%, #8899ffdd 50%, #4f6ef799 80%, transparent 95%)',
          boxShadow: '0 0 0 1px #4f6ef744, 0 2px 30px 8px #4f6ef730',
          zIndex: 3,
        }} />

        {/* Ceiling glow spread — illuminates the back wall */}
        <div style={{
          position: 'absolute', top: 0, left: '5%', right: '5%', height: '120px',
          background: 'radial-gradient(ellipse at 50% 0%, #4f6ef720 0%, transparent 65%)',
          pointerEvents: 'none', zIndex: 1,
        }} />

        {/* Wall grid — more visible, 3× the opacity of before */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: [
            'linear-gradient(to right, #3040681a 1px, transparent 1px)',
            'linear-gradient(to bottom, #3040681a 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '40px 40px',
        }} />

        {/* Horizontal accent lines — wall panel seams */}
        <div style={{
          position: 'absolute', top: '30%', left: 0, right: 0, height: '1px',
          background: 'linear-gradient(to right, transparent, #304068 20%, #304068 80%, transparent)',
          opacity: 0.2, zIndex: 1,
        }} />
        <div style={{
          position: 'absolute', top: '60%', left: 0, right: 0, height: '1px',
          background: 'linear-gradient(to right, transparent, #304068 20%, #304068 80%, transparent)',
          opacity: 0.15, zIndex: 1,
        }} />

        {/* Side wall depth gradients */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '32px',
          background: 'linear-gradient(to right, #06080f, transparent)',
          zIndex: 1, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: '32px',
          background: 'linear-gradient(to left, #06080f, transparent)',
          zIndex: 1, pointerEvents: 'none',
        }} />

        {/* Wall callsign */}
        <div style={{
          position: 'absolute', top: '10px', right: '44px',
          fontSize: '7px', fontFamily: 'monospace', fontWeight: 900,
          color: '#4f6ef735', letterSpacing: '.3em', zIndex: 2, userSelect: 'none',
        }}>
          NEXUS HQ
        </div>

        {/* Agent row — avatars include their own wall-station panel */}
        <div style={{
          position: 'relative', zIndex: 2,
          padding: '36px 24px 0',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-evenly', width: '100%',
        }}>
          {AGENT_ORDER.map(id => (
            <AgentAvatar
              key={id}
              id={id}
              active={activeAgent === id}
              routing={routingAgent === id}
              dispatched={dispatchedTo === id}
              dispatch={id === 'jansky' ? dispatchBubble : null}
            />
          ))}

          {/* Crab mascot — right end of desk */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '4px' }}>
            <CrabMascot emotion={emotion} />
          </div>
        </div>

        {/* Dispatch travel bar */}
        {dispatchBar && (
          <div style={{ position: 'relative', zIndex: 2, padding: '0 40px' }}>
            <DispatchBar from={dispatchBar.from} to={dispatchBar.to} />
          </div>
        )}

        {/* Continuous desk surface — full-width wood */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Desk top — wood grain with highlight */}
          <div style={{
            height: '14px',
            background: 'linear-gradient(180deg, #8a5030 0%, #6b3d1a 25%, #4a2810 70%, #3d2210 100%)',
            borderTop: '1px solid #a06040',
            boxShadow: '0 -2px 12px rgba(0,0,0,.6)',
          }} />
          {/* Desk front bevel */}
          <div style={{
            height: '6px',
            background: 'linear-gradient(180deg, #2e1a0a, #140905)',
            borderBottom: '1px solid #0a0604',
          }} />
        </div>

        {/* Floor — darker than desk, subtle reflection */}
        <div style={{
          position: 'relative', zIndex: 2, height: '18px',
          background: 'linear-gradient(180deg, #050609 0%, #030405 100%)',
          boxShadow: 'inset 0 1px 0 #1a1a2a',
        }} />

        {/* System monitor */}
        <div style={{ position: 'relative', zIndex: 2, padding: '8px 24px 10px' }}>
          <SystemMonitor activeAgent={activeAgent} />
        </div>
      </div>

      {/* ── Terminal / chat area ──────────────────────────────────────────── */}
      <div style={{
        flex:1, display:'flex', flexDirection:'column',
        background:'var(--bg)', overflowY:'auto', minHeight:0,
      }}>
        {/* Welcome if empty */}
        {!messages.length && (
          <div style={{ padding:'32px 24px', textAlign:'center', color:'var(--text3)' }}>
            <div style={{ fontSize:'12px', fontWeight:700, marginBottom:'6px' }}>
              NEXUS PRIME INTEL CORPS
            </div>
            <div style={{ fontSize:'11px', lineHeight:1.7 }}>
              Talk to <span style={{ color:'#4f6ef7', fontWeight:700 }}>JANSKY</span>. He routes your request to the right specialist.
              <br />
              Code → <span style={{ color:'#7c3aed' }}>ORBIT</span> · Research → <span style={{ color:'#10b981' }}>NOVA</span> · Security → <span style={{ color:'#14b8a6' }}>CIPHER</span> · Markets → <span style={{ color:'#f59e0b' }}>FLUX</span>
            </div>
          </div>
        )}

        {/* Message list */}
        <div style={{ flex:1, padding:'10px 12px', display:'flex', flexDirection:'column', gap:'10px' }}>
          {messages.map((msg, i) => {
            const cfg = msg.agent ? AGENTS[msg.agent] : null
            return (
              <div key={i} style={{
                display:'flex', flexDirection:'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap:'3px',
              }}>
                {/* Agent label */}
                {msg.role === 'agent' && cfg && (
                  <span style={{ fontSize:'8px', fontWeight:900, color: cfg.color, letterSpacing:'.1em', paddingLeft:'2px' }}>
                    {cfg.name} · {cfg.role.toUpperCase()}
                  </span>
                )}

                {/* Tool steps (collapsible) */}
                {msg.steps && msg.steps.length > 0 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:'3px', width:'100%', maxWidth:'560px', marginBottom:'3px' }}>
                    {msg.steps.map((step, si) => <ToolCallBadge key={si} step={step} />)}
                  </div>
                )}

                {/* Bubble */}
                <div style={{
                  maxWidth:'560px',
                  padding: msg.role === 'user' ? '8px 12px' : '10px 14px',
                  borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: msg.role === 'user'
                    ? 'var(--accent)'
                    : `color-mix(in srgb, ${cfg?.color ?? '#6875a0'} 8%, var(--surf2))`,
                  border: msg.role === 'agent' ? `1px solid ${cfg?.color ?? '#6875a0'}33` : 'none',
                  fontSize:'12.5px', color:'var(--text)', lineHeight:1.6,
                  whiteSpace:'pre-wrap', wordBreak:'break-word',
                }}>
                  {msg.text}
                </div>
              </div>
            )
          })}

          {/* Live tool steps while running */}
          {liveSteps.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:'3px', maxWidth:'560px' }}>
              {liveSteps.map((step, i) => <ToolCallBadge key={i} step={step} />)}
              <div style={{ display:'flex', gap:'3px', paddingLeft:'2px', marginTop:'2px' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width:'5px', height:'5px', borderRadius:'50%',
                    background: activeAgent ? AGENTS[activeAgent].color : 'var(--text3)',
                    animation:`dotPulse .9s ease-in-out ${i * .18}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Thinking state with no steps yet */}
          {activeAgent && !liveSteps.length && (
            <div style={{ display:'flex', gap:'3px', paddingLeft:'2px' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width:'5px', height:'5px', borderRadius:'50%',
                  background: AGENTS[activeAgent].color,
                  animation:`dotPulse .9s ease-in-out ${i * .18}s infinite`,
                }} />
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input bar ──────────────────────────────────────────────────── */}
        <div style={{
          padding:'10px 12px', borderTop:'1px solid var(--border)',
          background:'var(--surf)', display:'flex', gap:'8px', alignItems:'flex-end',
          flexShrink:0,
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Talk to JANSKY — he'll route to the right agent…"
            disabled={!!activeAgent}
            rows={1}
            style={{
              flex:1, resize:'none', background:'var(--surf2)', border:'1px solid var(--border2)',
              borderRadius:'10px', padding:'9px 13px', fontSize:'12.5px', color:'var(--text)',
              outline:'none', fontFamily:'inherit', lineHeight:1.5,
              maxHeight:'120px', overflowY:'auto',
              opacity: activeAgent ? .5 : 1,
            }}
          />
          <button
            onClick={() => void send()}
            disabled={!input.trim() || !!activeAgent}
            style={{
              flexShrink:0, width:'36px', height:'36px', borderRadius:'10px',
              background: input.trim() && !activeAgent ? 'var(--accent)' : 'var(--surf3)',
              border:'none', cursor: input.trim() && !activeAgent ? 'pointer' : 'default',
              color:'#fff', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center',
              transition:'background .15s',
            }}
          >
            {activeAgent ? '…' : '▶'}
          </button>
        </div>
      </div>

      {/* ── CSS animations ──────────────────────────────────────────────────── */}
      <style>{`
        @keyframes crabBob    { from{transform:translateY(0)} to{transform:translateY(-4px)} }
        @keyframes agentWork  { from{transform:translateY(0)} to{transform:translateY(-3px)} }
        @keyframes agentLean  { from{transform:rotate(0deg)} to{transform:rotate(-3deg)} }
        @keyframes agentWalk  { from{transform:translateX(-2px)} to{transform:translateX(2px)} }
        @keyframes dotPulse   { 0%,80%,100%{transform:scale(.8);opacity:.5} 40%{transform:scale(1.1);opacity:1} }
        @keyframes bubbleUp   { from{opacity:0;transform:translateX(-50%) translateY(4px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes dispatchRing {
          0%   { transform:scale(1);   opacity:.9 }
          100% { transform:scale(1.18);opacity:0  }
        }
        @keyframes dispatchFill {
          from { transform:scaleX(0) }
          to   { transform:scaleX(1) }
        }
        @keyframes dispatchDot {
          from { left:var(--dot-start, 0%) }
          to   { left:var(--dot-end, 100%) }
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  )
}
