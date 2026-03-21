'use client'

// ── AgentOffice.tsx ──────────────────────────────────────────────────────────
// Nexus Prime HQ — pixel art multi-agent command centre.
// Three agents: JANSKY (boss), ORBIT (coder), NOVA (researcher).
// Each has its own voice, system prompt, and routing path.
// Animated crab mascot reacts to the current chat state.
// Real-time system monitor sidebar reads live data from the store.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { buildSystemPrompt } from '@/lib/ai'
import { runAgent, type AgentStep } from '@/lib/agent'
import { getMemoryStats } from '@/lib/memoryStore'

// ── Palette ───────────────────────────────────────────────────────────────────
const P: Record<string, string> = {
  ' ': '', _: '',
  // Shared
  s: '#e8c49a', S: '#c09060',  // skin
  e: '#1a1a2e',                 // eyes
  d: '#050607',                 // shoes
  // Jansky (navy suit)
  h: '#2c1810', H: '#5a3520',   // hair
  n: '#1e3a5f', N: '#0f1e35',   // navy
  t: '#f0f0f0',                 // shirt
  k: '#c0392b',                 // tie
  // Orbit (purple hoodie + headphones)
  p: '#6b2fa0', o: '#3d1a5e',   // purple
  q: '#1a1a1a',                 // headphone
  // Nova (red hair + white coat)
  r: '#9b2020', R: '#c0392b',   // red hair
  w: '#f5f5f5', W: '#c8c8c8',   // white coat
  l: '#87ceeb',                 // glasses lens
  // Crab
  c: '#d04020', C: '#8a2010',   // crab body
  y: '#f0c060',                 // crab eye
  g: '#10b981',                 // green (success)
  x: '#ef4444',                 // red (error)
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

// ── Character sprites ─────────────────────────────────────────────────────────
// 9 wide × 14 tall. F[0] = neutral, F[1] = bob up 1px.

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

// ── Crab sprites (7 emotions) ─────────────────────────────────────────────────
// 12 wide × 8 tall
const CRAB: Record<string, string[]> = {
  idle: [
    '   cccccc   ',
    '  cccccccc  ',
    ' cccyeyccc  ',
    'cccccccccccc',
    'ccCccccccCcc',
    ' cccccccccc ',
    '  cc  cc  c ',
    '  c   cc   c',
  ],
  thinking: [
    'c  cccccc   ',
    'cc cccccccc ',
    ' cccyeyccc  ',
    'cccccccccccc',
    'ccCccccccCcc',
    ' cccccccccc ',
    '  cc  cc    ',
    '   c  cc    ',
  ],
  happy: [
    'c   cccccc c',
    ' c cccccc c ',
    '  ccyeyccc  ',
    ' cccccccccc ',
    'ccCcgggcgCcc',
    ' cccccccccc ',
    '  cc  cc  c ',
    ' c c  cc c  ',
  ],
  working: [
    '   cccccc   ',
    '  cccccccc  ',
    'cccyeyccccc ',
    'cccccccccccc',
    'cCccccccccCc',
    ' cccccccccc ',
    'cc  cc  cc  ',
    'cc  cc  cc  ',
  ],
  excited: [
    'c  cccccc  c',
    ' c cccccc c ',
    '  ccyRyccc  ',
    ' cccccccccc ',
    'ccCccgcccCcc',
    ' gccccccccg ',
    '  cc  cc    ',
    ' c c  cc c  ',
  ],
  error: [
    '   xxxxxx   ',
    '  cccccccc  ',
    ' cccxexxcc  ',
    'xxccccccccxx',
    'ccCccccccCcc',
    ' cccccccccc ',
    '  cc  cc  c ',
    '  c   cc   c',
  ],
  success: [
    'g  cccccc  g',
    ' g cccccc g ',
    '  ccgegccc  ',
    'ccccggggcccc',
    'ccCcggggcCcc',
    ' gccccccccg ',
    '  cc  cc  c ',
    ' g c  cc g  ',
  ],
}

type Emotion = 'idle' | 'thinking' | 'happy' | 'working' | 'excited' | 'error' | 'success'
type AgentId = 'jansky' | 'orbit' | 'nova'

// ── Agent configuration ────────────────────────────────────────────────────────
const AGENTS: Record<AgentId, {
  name: string; role: string; color: string; frames: string[][]
}> = {
  jansky: { name: 'JANSKY', role: 'Command',  color: '#4f6ef7', frames: JANSKY_F },
  orbit:  { name: 'ORBIT',  role: 'Coder',    color: '#7c3aed', frames: ORBIT_F  },
  nova:   { name: 'NOVA',   role: 'Research', color: '#10b981', frames: NOVA_F   },
}

function buildAgentPrompt(id: AgentId, base: string): string {
  const personas: Record<AgentId, string> = {
    jansky: `\n\n[AGENT: JANSKY — Command Intelligence]\nYou are JANSKY. You are the commanding intelligence of Nexus Prime. Strategic. Decisive. Brief. You orchestrate the mission and handle high-level analysis. Speak in short, punchy sentences with authority.`,
    orbit:  `\n\n[AGENT: ORBIT — Engineering Intelligence]\nYou are ORBIT. You are the coding intelligence. Precise. Technical. You specialise in the Nexus Prime codebase: Next.js 14, TypeScript, React, Zustand, Tailwind. Always read files before editing them. Always produce working code.`,
    nova:   `\n\n[AGENT: NOVA — Research Intelligence]\nYou are NOVA. You are the research intelligence. Curious. Thorough. Data-driven. You use web_search and fetch_url aggressively to find current facts. You synthesise from multiple sources and always cite them.`,
  }
  return base + personas[id]
}

function detectAgent(msg: string): AgentId {
  const lower = msg.toLowerCase()
  const code  = ['code','implement','build','fix','debug','write','create','component','function','patch','refactor','bug','error','file','edit','change'].filter(k => lower.includes(k)).length
  const srch  = ['research','find','search','what','how','why','news','latest','who','when','current','today','price','market','look up'].filter(k => lower.includes(k)).length
  if (code >= 2 && code > srch) return 'orbit'
  if (srch >= 2 && srch > code) return 'nova'
  return 'jansky'
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
    idle:'💤 Standby', thinking:'🤔 Processing', happy:'😄 Nice!',
    working:'⚡ On it', excited:'🎉 Let\'s go!', error:'❌ Uh-oh', success:'✅ Done!',
  }
  const glow: Record<Emotion, string> = {
    idle:'#4f6ef722', thinking:'#f59e0b33', happy:'#10b98133',
    working:'#7c3aed33', excited:'#f59e0b44', error:'#ef444433', success:'#10b98144',
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
      <div style={{
        padding:'6px', borderRadius:'8px',
        background: glow[emotion],
        border:`1px solid ${glow[emotion].slice(0,-2)}66`,
        animation: (emotion === 'excited' || emotion === 'working') ? 'crabBob .4s ease-in-out infinite alternate' : emotion === 'success' ? 'crabBob .3s ease-in-out 3' : 'none',
        transition:'background .3s, border .3s',
      }}>
        <Sprite rows={CRAB[blink && emotion === 'thinking' ? 'idle' : emotion]} scale={0.85} />
      </div>
      <span style={{ fontSize:'8px', color:'var(--text3)', fontWeight:700, whiteSpace:'nowrap' }}>
        {label[emotion]}
      </span>
    </div>
  )
}

// ── AgentAvatar ────────────────────────────────────────────────────────────────
function AgentAvatar({ id, active, routing }: { id: AgentId; active: boolean; routing: boolean }) {
  const [frame, setFrame]     = useState(0)
  const [glowing, setGlowing] = useState(false)
  const cfg = AGENTS[id]

  // Frame toggle
  useEffect(() => {
    const ms = routing ? 200 : active ? 300 : 900
    const id_ = setInterval(() => setFrame(f => (f + 1) % 2), ms)
    return () => clearInterval(id_)
  }, [routing, active])

  // Glow pulse on routing
  useEffect(() => {
    if (routing) { setGlowing(true) } else { setGlowing(false) }
  }, [routing])

  const statusColor = routing ? '#f59e0b' : active ? cfg.color : '#353c5e'
  const statusText  = routing ? 'routing…' : active ? 'speaking' : 'standby'

  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', gap:'5px',
      padding:'10px 8px', borderRadius:'10px',
      background: routing ? `${cfg.color}14` : active ? `${cfg.color}0a` : 'transparent',
      border:`1px solid ${routing ? cfg.color + '55' : active ? cfg.color + '33' : 'var(--border)'}`,
      transition:'all .2s',
      boxShadow: glowing ? `0 0 16px ${cfg.color}44` : 'none',
      minWidth:'80px',
    }}>
      {/* Monitor behind character */}
      <div style={{ position:'relative' }}>
        <div style={{ width:'44px', height:'34px', background:'#0a0b10', border:`1px solid ${cfg.color}44`, borderRadius:'4px', marginBottom:'2px', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
          {/* Scanlines */}
          <div style={{ position:'absolute', inset:0, background:`repeating-linear-gradient(0deg, transparent, transparent 3px, ${cfg.color}08 3px, ${cfg.color}08 4px)`, pointerEvents:'none' }} />
          <div style={{ fontSize:'8px', color:`${cfg.color}88`, fontWeight:700, fontFamily:'monospace', zIndex:1 }}>
            {routing ? '▶▶▶' : active ? '●RDY' : '───'}
          </div>
        </div>
        {/* Monitor stand */}
        <div style={{ width:'6px', height:'5px', background:'#1e2233', margin:'0 auto' }} />
        <div style={{ width:'18px', height:'2px', background:'#1e2233', margin:'0 auto' }} />
        {/* Character on desk */}
        <div style={{ position:'absolute', bottom:'9px', left:'50%', transform:'translateX(-50%)' }}>
          <Sprite rows={cfg.frames[frame]} scale={0.95} />
        </div>
      </div>

      {/* Name + status */}
      <div style={{ fontSize:'9px', fontWeight:900, color: routing || active ? cfg.color : 'var(--text2)', letterSpacing:'.08em' }}>
        {cfg.name}
      </div>
      <div style={{ fontSize:'8px', color:statusColor, fontWeight:700 }}>
        {statusText}
      </div>
    </div>
  )
}

// ── SystemMonitor ──────────────────────────────────────────────────────────────
function SystemMonitor({ activeAgent }: { activeAgent: AgentId | null }) {
  const articles = useStore(s => s.articles.length)
  const prices   = useStore(s => Object.keys(s.prices).length)
  const settings = useStore(s => s.settings)
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
    ['📡 Articles',  articles,  articles > 0 ? '#10b981' : '#ef4444'],
    ['💱 Tickers',   prices,    prices > 0   ? '#10b981' : '#6875a0'],
    ['🧠 Memory',    memCount,  memCount > 0 ? '#4f6ef7' : '#6875a0'],
    ['🤖 Model',     modelLabel,'#f59e0b'],
    ['🎯 Routing',   activeAgent ? AGENTS[activeAgent].name : '—', activeAgent ? AGENTS[activeAgent].color : '#6875a0'],
  ]

  return (
    <div style={{
      display:'flex', flexDirection:'column', gap:'6px',
      padding:'10px 12px', borderRadius:'10px',
      background:'var(--surf2)', border:'1px solid var(--border)',
      minWidth:'130px', flexShrink:0,
    }}>
      <div style={{ fontSize:'9px', fontWeight:900, color:'var(--text3)', letterSpacing:'.1em', marginBottom:'2px' }}>
        SYS MONITOR
      </div>
      {rows.map(([label, val, color]) => (
        <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'9px', color:'var(--text3)' }}>{label}</span>
          <span style={{ fontSize:'9px', fontWeight:700, color: color as string, fontFamily:'monospace' }}>
            {String(val)}
          </span>
        </div>
      ))}
      {/* Live pulse */}
      <div style={{ display:'flex', alignItems:'center', gap:'4px', marginTop:'2px' }}>
        <div style={{ width:'4px', height:'4px', borderRadius:'50%', background:'#10b981', animation:'pulse 1.5s infinite' }} />
        <span style={{ fontSize:'8px', color:'#10b981', fontWeight:700 }}>LIVE</span>
      </div>
    </div>
  )
}

// ── Quick chips ────────────────────────────────────────────────────────────────
const CHIPS = [
  { label: '📊 Market Pulse',    prompt: 'Search for the latest crypto and macro market news right now and give me a sharp pulse.' },
  { label: '⚡ Top Priority',    prompt: 'Based on my goals, what is my single highest-leverage action today? Be specific.' },
  { label: '🔍 Alpha Hunt',      prompt: 'Search for a market or business opportunity most people are missing right now.' },
  { label: '🛠 Build Something', prompt: 'List the top 3 improvements we could build into this Nexus Prime dashboard right now. Be specific.' },
  { label: '🌐 Intel Brief',     prompt: 'Run a full intelligence briefing — search markets, world events, and key risks. Save to intel-brief.md.' },
]

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserMsg { type:'user'; text:string }
interface AiMsg   { type:'ai';  text:string; agent:AgentId; steps?:AgentStep[] }
type ChatMsg = UserMsg | AiMsg

// ── Main component ─────────────────────────────────────────────────────────────
export default function AgentOffice() {
  const settings      = useStore(s => s.settings)
  const chatHistory   = useStore(s => s.chatHistory)
  const addMsg        = useStore(s => s.addChatMessage)
  const aiMode        = useStore(s => s.aiMode)
  const setAIMode     = useStore(s => s.setAIMode)
  const pendingDrafts = useStore(s => s.pendingDrafts)

  const [messages,     setMessages]     = useState<ChatMsg[]>([])
  const [liveSteps,    setLiveSteps]    = useState<AgentStep[]>([])
  const [input,        setInput]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [activeAgent,  setActiveAgent]  = useState<AgentId | null>(null)
  const [routingAgent, setRoutingAgent] = useState<AgentId | null>(null)
  const [emotion,      setEmotion]      = useState<Emotion>('idle')
  const msgsRef  = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const hasDrafts = pendingDrafts.some(d => d.status === 'pending')

  useEffect(() => {
    msgsRef.current?.scrollTo({ top:msgsRef.current.scrollHeight, behavior:'smooth' })
  }, [messages, liveSteps])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    setInput('')
    setLiveSteps([])

    const agent = detectAgent(text)
    setRoutingAgent(agent)
    setActiveAgent(null)
    setEmotion('thinking')

    const userMsg: UserMsg = { type:'user', text }
    setMessages(m => [...m, userMsg])
    addMsg({ role:'user', content:text })
    setLoading(true)
    setMessages(m => [...m, { type:'ai', text:'', agent, steps:[] }])

    // Brief routing delay for visual effect
    await new Promise(r => setTimeout(r, 400))
    setRoutingAgent(null)
    setActiveAgent(agent)
    setEmotion('working')

    const steps: AgentStep[] = []

    try {
      const history = [
        ...chatHistory.map(m => ({ role:m.role, content:m.content })),
        { role:'user', content:text },
      ]

      const answer = await runAgent({
        settings,
        systemPrompt: buildAgentPrompt(agent, buildSystemPrompt(settings)),
        messages:     history,
        onStep: (step) => {
          steps.push(step)
          setLiveSteps([...steps])
          setMessages(m => {
            const upd = [...m]
            const last = upd[upd.length - 1] as AiMsg
            if (last?.type === 'ai') {
              upd[upd.length - 1] = {
                ...last,
                text:  step.type === 'answer' ? step.content : last.text,
                steps: [...steps],
              }
            }
            return upd
          })
        },
      })

      setMessages(m => {
        const upd = [...m]
        const last = upd[upd.length - 1] as AiMsg
        if (last?.type === 'ai') upd[upd.length - 1] = { type:'ai', text:answer, agent, steps:[...steps] }
        return upd
      })
      addMsg({ role:'assistant', content:answer })
      setEmotion('success')
      setTimeout(() => setEmotion('idle'), 2500)
    } catch {
      setMessages(m => {
        const upd = [...m]
        const last = upd[upd.length - 1] as AiMsg
        if (last?.type === 'ai') upd[upd.length - 1] = { type:'ai', text:'Something went wrong. Check your API key in Settings or make sure Ollama is running (`ollama serve`).', agent, steps }
        return upd
      })
      setEmotion('error')
      setTimeout(() => setEmotion('idle'), 3000)
    } finally {
      setLoading(false)
      setLiveSteps([])
      setActiveAgent(null)
    }
  }, [loading, settings, chatHistory, addMsg])

  const hour  = new Date().getHours()
  const greet = hour < 12 ? 'MORNING' : hour < 17 ? 'AFTERNOON' : 'EVENING'
  const name  = settings.userName || 'ADMIN'

  return (
    <div style={{
      display:'flex', flexDirection:'column',
      height:'calc(100vh - 48px)', maxWidth:'960px', margin:'0 auto', padding:'0 16px',
    }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'14px 0 10px', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:'14px', fontWeight:900, letterSpacing:'.06em', color:'var(--text)' }}>
            🤖 NEXUS HQ — GOOD {greet}, {name}
          </div>
          <div style={{ fontSize:'10.5px', color:'var(--text3)', marginTop:'2px' }}>
            Three-agent command centre · auto-routes to JANSKY · ORBIT · NOVA
          </div>
        </div>
        {aiMode === 'local' && (
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'6px', padding:'4px 10px', borderRadius:'8px', background:'#f59e0b14', border:'1px solid #f59e0b44', fontSize:'10px', color:'#f59e0b', fontWeight:700 }}>
            ⚠️ DRAFT MODE
            <button onClick={() => setAIMode('auto')} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#f59e0b', fontSize:'10px', fontWeight:700 }}>↺</button>
          </div>
        )}
      </div>

      {/* ── Office scene ────────────────────────────────────────────────── */}
      <div style={{
        display:'flex', gap:'10px', flexShrink:0, marginBottom:'10px',
        background:'linear-gradient(180deg, #05060e 55%, #0a0b12 55%, #0f1018 100%)',
        border:'1px solid var(--border)', borderRadius:'12px', padding:'14px 16px',
        position:'relative', overflow:'hidden',
        minHeight:'130px',
      }}>
        {/* Stars bg */}
        {[...Array(18)].map((_, i) => (
          <div key={i} style={{
            position:'absolute', borderRadius:'50%',
            width: i % 3 === 0 ? '2px' : '1px',
            height: i % 3 === 0 ? '2px' : '1px',
            background: '#ffffff',
            opacity: 0.15 + (i % 5) * 0.08,
            top:`${8 + (i * 17) % 45}%`,
            left:`${(i * 31 + 7) % 88}%`,
          }} />
        ))}

        {/* Three agent slots */}
        <div style={{ display:'flex', gap:'8px', alignItems:'flex-end', flex:1 }}>
          {(['jansky','orbit','nova'] as AgentId[]).map(id => (
            <AgentAvatar
              key={id}
              id={id}
              active={activeAgent === id}
              routing={routingAgent === id}
            />
          ))}
        </div>

        {/* Crab mascot (right side) */}
        <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:'2px' }}>
          <CrabMascot emotion={emotion} />
        </div>

        {/* System monitor (far right) */}
        <SystemMonitor activeAgent={activeAgent} />
      </div>

      {/* ── Quick chips ─────────────────────────────────────────────────── */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginBottom:'8px', flexShrink:0 }}>
        {CHIPS.map(c => (
          <button key={c.label} onClick={() => send(c.prompt)} disabled={loading} style={{
            padding:'4px 10px', borderRadius:'99px', fontSize:'11px', fontWeight:600,
            border:'1px solid var(--border2)', background:'transparent', color:'var(--text2)',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
          }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* ── Terminal output ──────────────────────────────────────────────── */}
      <div ref={msgsRef} style={{
        flex:1, overflowY:'auto', display:'flex', flexDirection:'column',
        gap:'10px', padding:'4px 0 10px',
      }}>
        {messages.length === 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'8px', color:'var(--text3)', fontSize:'12px' }}>
            <div style={{ fontSize:'28px' }}>🤖</div>
            <div style={{ fontWeight:700, color:'var(--text2)' }}>HQ ready. Three agents standing by.</div>
            <div style={{ fontSize:'11px', textAlign:'center', maxWidth:'360px', lineHeight:1.6 }}>
              Code question → <span style={{ color:'#7c3aed', fontWeight:700 }}>ORBIT</span> handles it.{' '}
              Research → <span style={{ color:'#10b981', fontWeight:700 }}>NOVA</span>.{' '}
              Everything else → <span style={{ color:'#4f6ef7', fontWeight:700 }}>JANSKY</span>.
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          if (m.type === 'user') return (
            <div key={i} style={{ display:'flex', justifyContent:'flex-end' }}>
              <div style={{ maxWidth:'78%', padding:'9px 13px', borderRadius:'12px', background:'var(--accent)', color:'#fff', fontSize:'13px', lineHeight:1.6 }}>
                {m.text}
              </div>
            </div>
          )

          const cfg = AGENTS[m.agent]
          return (
            <div key={i} style={{ display:'flex', flexDirection:'column', gap:'5px', maxWidth:'90%' }}>
              {/* Agent label */}
              <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                <span style={{ fontSize:'9px', fontWeight:900, color:cfg.color, letterSpacing:'.08em' }}>
                  [{cfg.name}]
                </span>
                <span style={{ fontSize:'9px', color:'var(--text3)' }}>{cfg.role}</span>
              </div>

              {/* Tool steps */}
              {(m.steps ?? []).filter(s => s.type !== 'answer').map((step, si) => (
                <ToolCallBadge key={si} step={step} />
              ))}

              {/* Answer */}
              {(m.text || (loading && i === messages.length - 1)) && (
                <div style={{
                  padding:'10px 14px', borderRadius:'12px',
                  background:'var(--surf2)',
                  border:`1px solid ${cfg.color}33`,
                  fontSize:'13px', lineHeight:1.65, color:'var(--text)',
                  whiteSpace:'pre-wrap',
                  boxShadow:`inset 0 0 0 1px transparent`,
                }}>
                  {m.text || <span style={{ opacity:.4 }}>●●●</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Input ────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink:0, padding:'8px 0 18px', borderTop:'1px solid var(--border)' }}>
        {hasDrafts && (
          <div style={{ fontSize:'10px', color:'#f59e0b', marginBottom:'6px' }}>
            📝 {pendingDrafts.filter(d => d.status === 'pending').length} draft(s) queued · Go to Settings to finalize
          </div>
        )}
        <div style={{ display:'flex', gap:'8px', alignItems:'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
            placeholder="Issue a command… JANSKY coordinates, ORBIT codes, NOVA researches"
            rows={2}
            style={{
              flex:1, minHeight:'44px', maxHeight:'130px', padding:'11px 14px',
              borderRadius:'12px', border:'1px solid var(--border2)',
              background:'var(--surf2)', color:'var(--text)', fontSize:'13px',
              resize:'none', outline:'none', lineHeight:1.5,
            }}
          />
          <button onClick={() => send(input)} disabled={loading} style={{
            width:'44px', height:'44px', borderRadius:'12px', border:'none',
            background: loading ? 'var(--surf3)' : 'linear-gradient(135deg, #4f6ef7, #7c3aed)',
            color:'#fff', fontSize:'16px', cursor: loading ? 'not-allowed' : 'pointer', flexShrink:0,
          }}>
            {loading ? '⏳' : '➤'}
          </button>
        </div>
        <div style={{ fontSize:'10px', color:'var(--text3)', textAlign:'center', marginTop:'5px' }}>
          Auto-routes · web search · file ops · project editing · memory
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes crabBob { from{transform:translateY(0)} to{transform:translateY(-3px)} }
      `}</style>
    </div>
  )
}
