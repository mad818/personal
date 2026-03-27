'use client'

// OfficeCommandCenter
// ---------------------
// Visual "office environment" is encapsulated in `OfficeRoom3D` (right pane).
// This component owns only:
// - agent/tool execution state (runAgent loop)
// - chat terminal UI (messages + input)
// - wiring to the office visuals via props (activeAgent/routing/dispatched + agentPos)
//
// Token usage optimization hooks:
// - We pass only the latest user message to `runAgent` (no long chat history).
// - The office includes native 3D parity indicators for context/trash/server status.

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import PageTransition from '@/components/ui/PageTransition'
import PhaseStrip from '@/components/ui/PhaseStrip'
import TaskPlanPanel from '@/components/ui/TaskPlanPanel'
import TelemetryHUD from '@/components/ui/TelemetryHUD'
import MemoryPanel from '@/components/ui/MemoryPanel'
import CronSchedulerPanel from '@/components/ui/CronSchedulerPanel'
import { runAgent, type AgentStep } from '@/lib/agent'
import { buildSystemPrompt } from '@/lib/ai'
import { useStore } from '@/store/useStore'
import { buildCapabilitiesBlock, buildLiveContext } from '@/lib/liveContext'
import { detectRouteFromPrompt, detectRouteFromTool } from '@/lib/chatCapabilityRouting'

import { CrabMascot } from './CrabMascot'
import { WelcomeHUD } from './WelcomeHUD'
import { ToolCallBadge } from './ToolCallBadge'
import { ModeBriefingPanel } from './ModeBriefingPanel'
import { detectAgent, buildAgentPrompt } from './prompts'

import {
  AGENTS,
  AGENT_BREAK,
  AGENT_HOME,
  AGENT_MEETING,
  AGENT_PEEK,
  DISPATCH_LINES,
  OFFICE_LAYOUT_PRESETS,
  OFFICE_OPERATIONAL_PROFILES,
} from './constants'
import type { AgentId, ChatMessage, Emotion } from './types'

type DispatchBar = { from: AgentId; to: AgentId }
type OfficeCameraPreset = 'cinematic' | 'closeOps' | 'wallReadability'

const OFFICE_HEIGHT_MIN_PX = 300
const OFFICE_HEIGHT_MAX_PX = 700
const OFFICE_HEIGHT_DEFAULT_VH = 52
const OFFICE_HEIGHT_STEP_PX = 20
const SPLIT_LOCK_STORAGE_KEY = 'nexus_hq_split_drag_locked'
const CAMERA_PRESET_OPTIONS: Array<{ id: OfficeCameraPreset; label: string; title: string }> = [
  { id: 'cinematic', label: 'CAM: CINEMATIC', title: 'Balanced HQ framing' },
  { id: 'closeOps', label: 'CAM: CLOSE OPS', title: 'Tighter operations framing' },
  { id: 'wallReadability', label: 'CAM: WALL READ', title: 'Optimize readability for wall boards' },
]

const OfficeRoom3D = dynamic(() => import('./OfficeRoom3D').then((m) => m.OfficeRoom3D), {
  ssr: false,
  loading: () => null,
})

function computeAgentPos(args: {
  activeAgent: AgentId | null
  routingAgent: AgentId | null
  dispatchedTo: AgentId | null
  idleRoamPos: Record<AgentId, { x: number; y: number }> | null
}): Record<AgentId, { x: number; y: number }> {
  const { activeAgent, routingAgent, dispatchedTo, idleRoamPos } = args

  const base: Record<AgentId, { x: number; y: number }> = { ...AGENT_HOME } as any

  // Priority: active execution > dispatch ring > routing flash > idle.
  if (activeAgent) {
    return {
      ...base,
      jansky: { ...AGENT_MEETING.jansky },
      [activeAgent]: { ...AGENT_MEETING[activeAgent] },
    }
  }

  if (dispatchedTo) {
    return {
      ...base,
      jansky: { ...AGENT_MEETING.jansky },
      [dispatchedTo]: { ...AGENT_MEETING[dispatchedTo] },
    }
  }

  if (routingAgent) {
    // When we are in "routing", only MAX (JANSKY) is moving/acting visually.
    // Specialists remain at/near their peek positions.
    return {
      ...base,
      jansky: { ...AGENT_PEEK.jansky },
      ...(routingAgent !== 'jansky' ? { [routingAgent]: { ...AGENT_PEEK[routingAgent] } } : {}),
    }
  }

  if (idleRoamPos) return idleRoamPos

  return base
}

export default function OfficeCommandCenter() {
  const router = useRouter()
  const pathname = usePathname()
  const settings = useStore((s) => s.settings)
  const addOfficeMessage = useStore((s) => s.addOfficeMessage)
  const clearOfficeMessages = useStore((s) => s.clearOfficeMessages)
  const officeMessages = useStore((s) => s.officeMessages)
  const officeEditMode = useStore((s) => s.officeEditMode)
  const setOfficeEditMode = useStore((s) => s.setOfficeEditMode)
  const resetOfficeLayout = useStore((s) => s.resetOfficeLayout)
  const officeLayout = useStore((s) => s.officeLayout)
  const updateSettings = useStore((s) => s.updateSettings)
  const officeSceneMode = useStore((s) => s.settings.officeSceneMode ?? 'auto')
  const officeMotion = useStore((s) => s.settings.officeMotion ?? 1)
  const officeCameraPreset = useStore((s) => (s.settings.officeCameraPreset ?? 'cinematic') as OfficeCameraPreset)
  const officeSplitHeightPx = useStore((s) => s.settings.officeSplitHeightPx ?? 0)
  const officeOperationalMode = useStore((s) => s.settings.officeOperationalMode ?? 'normal')
  const setOfficeLayout = useStore((s) => s.setOfficeLayout)
  const setTab = useStore((s) => s.setTab)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')

  const [activeAgent, setActiveAgent] = useState<AgentId | null>(null)
  const [routingAgent, setRoutingAgent] = useState<AgentId | null>(null)
  const [dispatchedTo, setDispatchedTo] = useState<AgentId | null>(null)

  const [dispatchBubble, setDispatchBubble] = useState<string | null>(null)
  const [dispatchBar, setDispatchBar] = useState<DispatchBar | null>(null)

  const [emotion, setEmotion] = useState<Emotion>('idle')
  const [liveSteps, setLiveSteps] = useState<AgentStep[]>([])
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [schedulerOpen, setSchedulerOpen] = useState(false)
  const [idleRoamPos, setIdleRoamPos] = useState<Record<AgentId, { x: number; y: number }> | null>(null)
  const [officeHeightPx, setOfficeHeightPx] = useState<number | null>(null)
  const [splitNotice, setSplitNotice] = useState<string | null>(null)
  const [splitDragLocked, setSplitDragLocked] = useState(false)
  const [compactSplitControls, setCompactSplitControls] = useState(false)
  const [showSplitMore, setShowSplitMore] = useState(false)

  // Local scroll management for the terminal chat area.
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastRoutedRef = useRef<string>('')

  // Keep emotion in sync when we transition from thinking -> working -> done.
  useEffect(() => {
    if (!activeAgent) return
    if (emotion !== 'working' && emotion !== 'excited' && emotion !== 'thinking') setEmotion('working')
  }, [activeAgent]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, liveSteps, emotion])

  useEffect(() => {
    if (officeHeightPx !== null) return
    const fromSettings = Number(officeSplitHeightPx || 0)
    const fallback = Math.round((window.innerHeight * OFFICE_HEIGHT_DEFAULT_VH) / 100)
    const initial = fromSettings > 0 ? fromSettings : fallback
    setOfficeHeightPx(Math.max(OFFICE_HEIGHT_MIN_PX, Math.min(OFFICE_HEIGHT_MAX_PX, initial)))
  }, [officeHeightPx, officeSplitHeightPx])

  useEffect(() => {
    if (!splitNotice) return
    const t = window.setTimeout(() => setSplitNotice(null), 950)
    return () => window.clearTimeout(t)
  }, [splitNotice])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SPLIT_LOCK_STORAGE_KEY)
      setSplitDragLocked(raw === '1')
    } catch {
      // silent fail
    }
  }, [])

  useEffect(() => {
    const onResize = () => {
      const compact = window.innerWidth < 980
      setCompactSplitControls(compact)
      if (!compact) setShowSplitMore(false)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const agentPos = useMemo(() => {
    return computeAgentPos({ activeAgent, routingAgent, dispatchedTo, idleRoamPos })
  }, [activeAgent, routingAgent, dispatchedTo, idleRoamPos])

  // Ambient roaming to make HQ feel like a live workplace when idle.
  useEffect(() => {
    if (activeAgent || routingAgent || dispatchedTo) {
      setIdleRoamPos(null)
      return
    }

    let mounted = true
    const ids = Object.keys(AGENTS) as AgentId[]
    const makeRoam = () => {
      const next = {} as Record<AgentId, { x: number; y: number }>
      ids.forEach((id) => {
        const spots = [AGENT_HOME[id], ...AGENT_BREAK[id]]
        const shouldRoam = Math.random() < 0.62
        const target = shouldRoam ? spots[Math.floor(Math.random() * spots.length)] : AGENT_HOME[id]
        next[id] = { x: target.x, y: target.y }
      })
      return next
    }

    setIdleRoamPos(makeRoam())
    const timer = window.setInterval(() => {
      if (!mounted) return
      setIdleRoamPos(makeRoam())
    }, 5200)

    return () => {
      mounted = false
      window.clearInterval(timer)
    }
  }, [activeAgent, routingAgent, dispatchedTo])

  const isThinking = useMemo(() => {
    return liveSteps.some((s) => s.type === 'thinking')
  }, [liveSteps])

  const dutyAgent = useMemo<AgentId>(() => {
    // Match existing behavior: default to JANSKY when idle.
    return activeAgent ?? 'jansky'
  }, [activeAgent])

  const handleClear = useCallback(() => {
    setMessages([])
    setLiveSteps([])
    setActiveAgent(null)
    setRoutingAgent(null)
    setDispatchedTo(null)
    setDispatchBubble(null)
    setDispatchBar(null)
    setEmotion('idle')
    clearOfficeMessages()
  }, [clearOfficeMessages])

  const send = useCallback(async () => {
    const value = input.trim()
    if (!value) return
    if (activeAgent) return

    const routeFromPrompt = detectRouteFromPrompt(value)
    if (routeFromPrompt && routeFromPrompt !== pathname && lastRoutedRef.current !== routeFromPrompt) {
      lastRoutedRef.current = routeFromPrompt
      setTab(routeFromPrompt.slice(1) || 'home')
      router.push(routeFromPrompt)
    }

    setInput('')
    setLiveSteps([])
    setDispatchBubble(null)
    setDispatchBar(null)

    // Persist messages for the "LLM fuel" and trash-can environment props.
    addOfficeMessage({ role: 'user', text: value })

    // Display in terminal UI (local, includes steps).
    setMessages((prev) => [...prev, { role: 'user', text: value }])

    // Phase 1: JANSKY routing + animation.
    setRoutingAgent('jansky')
    setEmotion('thinking')

    // Give the office time to show a routing flash.
    await new Promise((r) => setTimeout(r, 450))

    const target = detectAgent(value)

    // Phase 2: dispatch ring + travel bar (only when specialist != JANSKY).
    if (target !== 'jansky') {
      setDispatchBubble(DISPATCH_LINES[target] ?? `→ ${target}`)
      setDispatchBar({ from: 'jansky', to: target })
      setDispatchedTo(target)
      setEmotion('excited')

      await new Promise((r) => setTimeout(r, 700))

      setActiveAgent(target)
      setRoutingAgent(null)
      setDispatchedTo(null)
      setDispatchBubble(null)
      setDispatchBar(null)
    } else {
      setActiveAgent('jansky')
      setRoutingAgent(null)
      setDispatchedTo(null)
      setEmotion('working')
    }

    // Phase 3: run the agent (ground it in live dashboard state).
    const liveContext = buildLiveContext(useStore.getState())
    const systemBase = buildSystemPrompt(settings, liveContext)
    const enrichedPrompt = buildAgentPrompt(target, systemBase) + buildCapabilitiesBlock(target)

    const steps: AgentStep[] = []

    try {
      const result = await runAgent({
        settings,
        systemPrompt: enrichedPrompt,
        messages: [{ role: 'user', content: value }],
        onStep: (step) => {
          if (step.type === 'tool_call') {
            const routeFromTool = detectRouteFromTool(step.tool)
            if (routeFromTool && routeFromTool !== pathname && lastRoutedRef.current !== routeFromTool) {
              lastRoutedRef.current = routeFromTool
              setTab(routeFromTool.slice(1) || 'home')
              router.push(routeFromTool)
            }
          }
          if (step.type === 'phase' || step.type === 'task_plan') return
          steps.push(step)
          setLiveSteps([...steps])
        },
      })

      // Finalize UI: agent reply + tool trace.
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          agent: target,
          text: result,
          steps: steps.length ? steps : undefined,
        },
      ])

      addOfficeMessage({ role: 'agent', agent: target, text: result })

      setEmotion('success')
      setTimeout(() => setEmotion('happy'), 550)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          agent: target,
          text: `Error: ${msg}`,
          steps: steps.length ? steps : undefined,
        },
      ])
      addOfficeMessage({ role: 'agent', agent: target, text: `Error: ${msg}` })
      setEmotion('error')
    } finally {
      // Release active agent lock.
      setTimeout(() => {
        setActiveAgent(null)
        setEmotion('idle')
        setLiveSteps([])
      }, 1200)
    }
  }, [input, activeAgent, addOfficeMessage, settings, pathname, router, setTab])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void send()
      }
    },
    [send],
  )

  const activeColor = activeAgent ? AGENTS[activeAgent].color : AGENTS[dutyAgent].color
  const openBriefingTab = useCallback((tab: string) => {
    setTab(tab)
    router.push(`/${tab}`)
  }, [setTab, router])

  const applySplitHeight = useCallback(
    (next: number, announce?: string) => {
      const clamped = Math.max(OFFICE_HEIGHT_MIN_PX, Math.min(OFFICE_HEIGHT_MAX_PX, Math.round(next)))
      setOfficeHeightPx(clamped)
      updateSettings({ officeSplitHeightPx: clamped })
      if (announce) setSplitNotice(announce)
    },
    [updateSettings],
  )

  const startResize = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (splitDragLocked) return
    e.preventDefault()
    const onMove = (ev: MouseEvent) => {
      applySplitHeight(ev.clientY)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setSplitNotice('Layout resized')
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [applySplitHeight, splitDragLocked])

  const resetSplit = useCallback(() => {
    const baseline = Math.round((window.innerHeight * OFFICE_HEIGHT_DEFAULT_VH) / 100)
    applySplitHeight(baseline, 'Layout reset')
  }, [applySplitHeight])

  const handleSplitterKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const current = officeHeightPx ?? Math.round((window.innerHeight * OFFICE_HEIGHT_DEFAULT_VH) / 100)
      const step = e.shiftKey ? OFFICE_HEIGHT_STEP_PX * 2 : OFFICE_HEIGHT_STEP_PX
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        applySplitHeight(current - step, 'Layout resized')
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        applySplitHeight(current + step, 'Layout resized')
      } else if (e.key === 'Home') {
        e.preventDefault()
        applySplitHeight(OFFICE_HEIGHT_MIN_PX, 'Layout minimized')
      } else if (e.key === 'End') {
        e.preventDefault()
        applySplitHeight(OFFICE_HEIGHT_MAX_PX, 'Layout maximized')
      }
    },
    [officeHeightPx, applySplitHeight],
  )

  const toggleSplitLock = useCallback(() => {
    setSplitDragLocked((v) => {
      const next = !v
      try {
        localStorage.setItem(SPLIT_LOCK_STORAGE_KEY, next ? '1' : '0')
      } catch {
        // silent fail
      }
      setSplitNotice(next ? 'Drag lock enabled' : 'Drag lock disabled')
      return next
    })
  }, [])

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
        {/* ── Header ── */}
        <div
          style={{
            padding: '6px 16px',
            background: '#0D1220',
            borderBottom: '1px solid #1A2040',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: activeAgent ? '#00DDFF' : '#00FF66',
              boxShadow: activeAgent ? '0 0 8px #00DDFF' : '0 0 8px #00FF66',
              display: 'inline-block',
              animation: activeAgent ? 'pulse-dot 2s ease-in-out infinite' : 'none',
            }}
          />
          <span
            style={{
              fontSize: '12px',
              fontFamily: "'VT323', monospace",
              color: activeAgent ? '#00DDFF' : '#00FF66',
              letterSpacing: '2px',
            }}
          >
            NEXUS PRIME HQ
          </span>
          <span style={{ fontSize: '11px', fontFamily: "'VT323', monospace", color: '#1A2040', marginLeft: '4px' }}>
            {'//'}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontFamily: "'VT323', monospace",
              color: '#00DDFF',
              marginLeft: 'auto',
              opacity: 0.9,
            }}
          >
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* ── Operational UI ── */}
        <TelemetryHUD />
        <PhaseStrip />
        <TaskPlanPanel />

        {/* ── Office environment (visual scene) ── */}
        <div
          style={{
            position: 'relative',
            flex: `0 0 ${officeHeightPx ?? OFFICE_HEIGHT_MIN_PX}px`,
            background: '#0D1220',
            border: '1px solid #1A2040',
            borderTop: 'none',
            overflow: 'hidden',
            minHeight: OFFICE_HEIGHT_MIN_PX,
          }}
        >
          {/* Ensure required keyframes exist for all office subcomponents. */}
          <style>{`
            /* Office animations (inline so we don't depend on Next CSS-import rules). */

            /* ── CRAB MASCOT ──────────────────────────────────────────────────────────── */
            /* Up/down float — used while the crab is happy, working, or excited */
            @keyframes crabBob    { from{transform:translateY(0)} to{transform:translateY(-4px)} }

            /* ── AGENT IDLE PERSONALITIES ─────────────────────────────────────────────── */
            /* Each agent has a distinct idle so the office looks alive when nothing runs. */

            /* JANSKY — slow authoritative nod */
            @keyframes idleNod      { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-3px)} 45%{transform:translateY(-1px)} }
            /* ORBIT — rapid keyboard micro-movement */
            @keyframes idleTyping   { 0%,100%{transform:translate(0,0)} 15%{transform:translate(-1px,1px)} 30%{transform:translate(1px,0px)} 50%{transform:translate(-1px,1px)} 70%{transform:translate(1px,-1px)} 85%{transform:translate(0,1px)} }
            /* NOVA — side-to-side intelligence scan */
            @keyframes idleScan     { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-3px)} 50%{transform:translateX(0)} 80%{transform:translateX(3px)} }
            /* CIPHER — vigilant micro-rotation, always watching */
            @keyframes idleVigilant { 0%,100%{transform:translateX(0) rotate(0deg)} 25%{transform:translateX(-2px) rotate(-1deg)} 75%{transform:translateX(2px) rotate(1deg)} }
            /* FLUX — chart-watching rhythmic bob */
            @keyframes idleCharts   { 0%,100%{transform:translateY(0) rotate(0deg)} 33%{transform:translateY(-2px) rotate(0deg)} 66%{transform:translateY(-1px) rotate(1deg)} }
            /* Generic float — used for ambient props (sofa emoji on afternoon shift) */
            @keyframes idleFloat    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }

            /* ── ACTIVE / WORK STATES ─────────────────────────────────────────────────── */
            /* workFury — outer wrapper shake while actively responding */
            @keyframes workFury   { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-2px,1px)} 40%{transform:translate(2px,-1px)} 60%{transform:translate(-1px,2px)} 80%{transform:translate(1px,-2px)} }
            /* workFocus — slower, more controlled focus pulse */
            @keyframes workFocus  { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-3px) rotate(-2deg)} }
            /* routePulse — JANSKY deciding where to dispatch */
            @keyframes routePulse { 0%,100%{transform:translateX(0) rotate(0deg)} 25%{transform:translateX(-3px) rotate(-2deg)} 75%{transform:translateX(3px) rotate(2deg)} }
            /* taskGet — agent receives a task (jumps up then lands) */
            @keyframes taskGet    { 0%{transform:scale(1) translateY(0)} 25%{transform:scale(1.12) translateY(-6px)} 55%{transform:scale(1.05) translateY(-3px)} 100%{transform:scale(1) translateY(0)} }
            /* taskDone — celebrate completion (double-bounce) */
            @keyframes taskDone   { 0%,100%{transform:translateY(0)} 18%{transform:translateY(-9px)} 36%{transform:translateY(-4px)} 54%{transform:translateY(-11px)} 72%{transform:translateY(-2px)} 90%{transform:translateY(-5px)} }

            /* ── SPRITE INNER MOTION ──────────────────────────────────────────────────── */
            /* agentWalk — side-to-side sway for the walking animation */
            @keyframes agentWalk  { from{transform:translateX(-2px)} to{transform:translateX(2px)} }
            /* spriteBob — gentle up/down breathing */
            @keyframes spriteBob  { from{transform:translateY(0)} to{transform:translateY(-2px)} }
            /* spriteType — keyboard typing micro-movement */
            @keyframes spriteType { 0%,100%{transform:translate(0,0)} 25%{transform:translate(-1px,1px)} 75%{transform:translate(1px,-1px)} }

            /* ── UI / DISPATCH ELEMENTS ───────────────────────────────────────────────── */
            /* dotPulse — the three waiting dots while an agent is thinking */
            @keyframes dotPulse     { 0%,80%,100%{transform:scale(.8);opacity:.5} 40%{transform:scale(1.1);opacity:1} }
            /* pulse-dot — the green "online" dot in the header bar */
            @keyframes pulse-dot    { 0%,100%{opacity:.5;transform:scale(.85)} 50%{opacity:1;transform:scale(1.15)} }
            /* bubbleUp — speech bubble fade-in from slightly below */
            @keyframes bubbleUp     { from{opacity:0;transform:translateX(-50%) translateY(4px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
            /* dispatchRing — expanding ring around an agent that just received a task */
            @keyframes dispatchRing { 0%{transform:scale(1);opacity:.9} 100%{transform:scale(1.18);opacity:0} }
            /* dispatchFill — the colour line filling between agents on the dispatch bar */
            @keyframes dispatchFill { from{transform:scaleX(0)} to{transform:scaleX(1)} }
            /* dispatchDot — the travelling dot moving between agents on the dispatch bar */
            @keyframes dispatchDot  { from{left:var(--dot-start,0%)} to{left:var(--dot-end,100%)} }
            /* fadeIn — simple opacity fade used for new activity log entries and bubbles */
            @keyframes fadeIn       { from{opacity:0} to{opacity:1} }

            /* ── ENVIRONMENT EFFECTS ──────────────────────────────────────────────────── */
            /* monitorPulse — the screen flicker on idle monitors */
            @keyframes monitorPulse { 0%,100%{opacity:.75} 50%{opacity:1} }
            /* screenScroll — scrolling text on active screens */
            @keyframes screenScroll { from{transform:translateY(0)} to{transform:translateY(-50%)} }
            /* lightFlicker — fluorescent ceiling light occasional flutter */
            @keyframes lightFlicker { 0%,100%{opacity:1} 94%{opacity:.82} 97%{opacity:1} 99%{opacity:.9} }
            /* ambientGlow — radial glow behind active agents breathes slowly */
            @keyframes ambientGlow  { 0%,100%{opacity:.3} 50%{opacity:.55} }
            /* progressBar — used in any progress fill element */
            @keyframes progressBar  { from{width:0%} to{width:100%} }
            /* deskGlow — desk border accent pulse on active agent's desk */
            @keyframes deskGlow     { 0%,100%{box-shadow:none} 50%{box-shadow:0 0 12px var(--agent-color,#4f6ef7)} }
            /* statusPip — the coloured dot that pulses next to an agent's name / in the log */
            @keyframes statusPip    { 0%,100%{opacity:.5;transform:scale(.9)} 50%{opacity:1;transform:scale(1.2)} }

            /* ── PROPS ────────────────────────────────────────────────────────────────── */
            /* stompCan — trash can squish when chat is cleared */
            @keyframes stompCan    { 0%{transform:scaleY(1)} 20%{transform:scaleY(0.6) scaleX(1.3)} 50%{transform:scaleY(1.1) scaleX(0.95)} 100%{transform:scaleY(1)} }
            /* coffeeFloat — coffee cup drifting upward on the morning shift */
            @keyframes coffeeFloat { 0%,100%{transform:translateY(0) rotate(-5deg)} 50%{transform:translateY(-6px) rotate(5deg)} }
          `}</style>

          <div style={{ position: 'absolute', inset: 0 }}>
            <OfficeRoom3D
              officeEditMode={officeEditMode}
              officeLayout={officeLayout}
              agentPos={agentPos}
              activeAgent={activeAgent}
              sceneMode={officeSceneMode}
              motionIntensity={officeMotion}
              cameraPreset={officeCameraPreset}
              dispatchBar={dispatchBar}
            />
          </div>

          {/* Layout editor controls */}
          <div style={{ position: 'absolute', left: 12, top: 12, zIndex: 60, display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setMemoryOpen(true)}
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '.08em',
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid rgba(79,110,247,0.55)',
                background: 'rgba(79,110,247,0.10)',
                color: '#4f6ef7',
                cursor: 'pointer',
              }}
              title="Open agent memory panel"
            >
              MEMORY
            </button>
            <button
              type="button"
              onClick={() => setSchedulerOpen(true)}
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '.08em',
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid rgba(16,185,129,0.55)',
                background: 'rgba(16,185,129,0.10)',
                color: '#10b981',
                cursor: 'pointer',
              }}
              title="Open recurring task scheduler"
            >
              SCHEDULER
            </button>
            <button
              type="button"
              onClick={() => setOfficeEditMode(!officeEditMode)}
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '.08em',
                padding: '6px 10px',
                borderRadius: 999,
                border: `1px solid ${officeEditMode ? '#00FF66' : '#00DDFF'}55`,
                background: officeEditMode ? 'rgba(0,255,102,0.12)' : 'rgba(0,221,255,0.10)',
                color: officeEditMode ? '#00FF66' : '#00DDFF',
                cursor: 'pointer',
              }}
              title="Toggle layout edit mode"
            >
              {officeEditMode ? 'EDIT MODE: ON' : 'EDIT MODE'}
            </button>
            {officeEditMode && (
              <button
                type="button"
                onClick={() => resetOfficeLayout()}
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: '.08em',
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid rgba(239,68,68,0.55)',
                  background: 'rgba(239,68,68,0.10)',
                  color: '#ef4444',
                  cursor: 'pointer',
                }}
                title="Reset object positions to defaults"
              >
                RESET
              </button>
            )}

            <>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: '.08em',
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid #10b98155',
                  background: 'rgba(16,185,129,0.12)',
                  color: '#10b981',
                  userSelect: 'none',
                }}
                title="3D camera movement is intentionally locked"
              >
                CAM: LOCKED
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: '.08em',
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid #f59e0b55',
                  background: 'rgba(245,158,11,0.12)',
                  color: '#f59e0b',
                  userSelect: 'none',
                }}
                title="Operational behavior profile"
              >
                MODE: {OFFICE_OPERATIONAL_PROFILES[officeOperationalMode].label}
              </span>
              <button
                type="button"
                onClick={() => {
                  const order: Array<'auto' | 'morning' | 'afternoon' | 'night'> = ['auto', 'morning', 'afternoon', 'night']
                  const idx = order.indexOf(officeSceneMode as any)
                  const next = order[(idx + 1) % order.length]
                  updateSettings({ officeSceneMode: next })
                }}
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: '.08em',
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid #7ba7d455',
                  background: 'rgba(123,167,212,0.12)',
                  color: '#7ba7d4',
                  cursor: 'pointer',
                }}
                title="Cycle scene mode"
              >
                SCENE: {String(officeSceneMode).toUpperCase()}
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ officeMotion: Math.max(0.4, Number((officeMotion - 0.2).toFixed(1))) })}
                style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '.08em',
                  padding: '6px 8px', borderRadius: 999, border: '1px solid #1A2040',
                  background: 'rgba(26,32,64,0.2)', color: '#7ba7d4', cursor: 'pointer',
                }}
                title="Decrease motion intensity"
              >MOTION -</button>
              <button
                type="button"
                onClick={() => updateSettings({ officeMotion: Math.min(2, Number((officeMotion + 0.2).toFixed(1))) })}
                style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '.08em',
                  padding: '6px 8px', borderRadius: 999, border: '1px solid #1A2040',
                  background: 'rgba(26,32,64,0.2)', color: '#7ba7d4', cursor: 'pointer',
                }}
                title="Increase motion intensity"
              >MOTION +</button>
              {CAMERA_PRESET_OPTIONS.map((preset) => {
                const active = officeCameraPreset === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => updateSettings({ officeCameraPreset: preset.id })}
                    style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '.08em',
                      padding: '6px 9px', borderRadius: 999,
                      border: `1px solid ${active ? '#00DDFF88' : '#1A2040'}`,
                      background: active ? 'rgba(0,221,255,0.12)' : 'rgba(26,32,64,0.2)',
                      color: active ? '#00DDFF' : '#7ba7d4', cursor: 'pointer',
                    }}
                    title={preset.title}
                  >
                    {preset.label}
                  </button>
                )
              })}

                {/* ── Layout presets ── */}
                <button
                  type="button"
                  onClick={() => {
                    const p = OFFICE_LAYOUT_PRESETS.focus
                    if (p.officeSceneMode) updateSettings({ officeSceneMode: p.officeSceneMode, officeOperationalMode: 'normal' })
                    if (p.officeMotion) updateSettings({ officeMotion: p.officeMotion, officeOperationalMode: 'normal' })
                    setTab('intel')
                    setOfficeLayout(p.layout)
                  }}
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '.08em',
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: '1px solid rgba(0,255,102,0.45)',
                    background: 'rgba(0,255,102,0.10)',
                    color: '#00FF66',
                    cursor: 'pointer',
                  }}
                  title="Apply Focus preset"
                >
                  FOCUS
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const p = OFFICE_LAYOUT_PRESETS.war
                    if (p.officeSceneMode) updateSettings({ officeSceneMode: p.officeSceneMode, officeOperationalMode: 'war' })
                    if (p.officeMotion) updateSettings({ officeMotion: p.officeMotion, officeOperationalMode: 'war' })
                    setTab('cyber')
                    setOfficeLayout(p.layout)
                  }}
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '.08em',
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: '1px solid rgba(239,68,68,0.45)',
                    background: 'rgba(239,68,68,0.10)',
                    color: '#ef4444',
                    cursor: 'pointer',
                  }}
                  title="Apply War Room preset"
                >
                  WAR ROOM
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const p = OFFICE_LAYOUT_PRESETS.nightOps
                    if (p.officeSceneMode) updateSettings({ officeSceneMode: p.officeSceneMode, officeOperationalMode: 'nightOps' })
                    if (p.officeMotion) updateSettings({ officeMotion: p.officeMotion, officeOperationalMode: 'nightOps' })
                    setTab('security')
                    setOfficeLayout(p.layout)
                  }}
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '.08em',
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: '1px solid rgba(167,139,250,0.55)',
                    background: 'rgba(167,139,250,0.12)',
                    color: '#a78bfa',
                    cursor: 'pointer',
                  }}
                  title="Apply Night Ops preset"
                >
                  NIGHT OPS
                </button>
            </>
          </div>

          <div style={{ position: 'absolute', right: 12, top: 52, zIndex: 55 }}>
            <ModeBriefingPanel onOpenTab={openBriefingTab} />
          </div>

          {/* Crab + wall monitor overlays */}
          <div style={{ position: 'absolute', right: '110px', bottom: '22px', zIndex: 20 }}>
            <CrabMascot emotion={emotion} />
          </div>

        </div>

        <div
          onMouseDown={startResize}
          onDoubleClick={resetSplit}
          onKeyDown={handleSplitterKey}
          title="Drag to resize office/chat. Double-click to reset."
          role="separator"
          tabIndex={0}
          aria-label="Resize office and chat panels"
          aria-orientation="horizontal"
          aria-valuemin={OFFICE_HEIGHT_MIN_PX}
          aria-valuemax={OFFICE_HEIGHT_MAX_PX}
          aria-valuenow={officeHeightPx ?? OFFICE_HEIGHT_MIN_PX}
          style={{
            flexShrink: 0,
            height: compactSplitControls ? 34 : 30,
            borderLeft: '1px solid #1A2040',
            borderRight: '1px solid #1A2040',
            borderBottom: '1px solid #1A2040',
            background: '#0B1020',
            cursor: splitDragLocked ? 'not-allowed' : 'row-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            outline: 'none',
            padding: '0 10px',
            overflow: 'visible',
          }}
        >
          <div
            style={{
              width: 74,
              height: 6,
              borderRadius: 999,
              border: '1px solid #233057',
              background: 'rgba(26,32,64,0.95)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
              flexShrink: 0,
            }}
          />
          {!!officeHeightPx && !compactSplitControls && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '.05em',
                color: '#6f86b4',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {Math.round((officeHeightPx / (window.innerHeight || 1)) * 100)}%
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              resetSplit()
            }}
            title="Reset office/chat split"
            style={{
              borderRadius: 999,
              border: '1px solid #2a3a6b',
              background: 'rgba(13,18,32,0.96)',
              color: '#7ba7d4',
              padding: '2px 8px',
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '.05em',
              cursor: 'pointer',
              lineHeight: 1.5,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            RESET LAYOUT
          </button>
          {!compactSplitControls && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggleSplitLock()
              }}
              title="Prevent accidental drag resizing"
              style={{
                borderRadius: 999,
                border: `1px solid ${splitDragLocked ? '#10b98166' : '#2a3a6b'}`,
                background: splitDragLocked ? 'rgba(16,185,129,0.14)' : 'rgba(13,18,32,0.96)',
                color: splitDragLocked ? '#10b981' : '#7ba7d4',
                padding: '2px 8px',
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '.05em',
                cursor: 'pointer',
                lineHeight: 1.5,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {splitDragLocked ? 'UNLOCK SPLIT' : 'LOCK SPLIT'}
            </button>
          )}
          {compactSplitControls && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowSplitMore((v) => !v)
                }}
                title="More layout controls"
                style={{
                  borderRadius: 999,
                  border: '1px solid #2a3a6b',
                  background: 'rgba(13,18,32,0.96)',
                  color: '#7ba7d4',
                  padding: '2px 8px',
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: '.05em',
                  cursor: 'pointer',
                  lineHeight: 1.5,
                  whiteSpace: 'nowrap',
                }}
              >
                MORE ▾
              </button>
              {showSplitMore && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 6px)',
                    minWidth: 130,
                    borderRadius: 10,
                    border: '1px solid #1f315e',
                    background: 'rgba(8,14,28,0.98)',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.35)',
                    padding: 6,
                    display: 'grid',
                    gap: 6,
                    zIndex: 120,
                    cursor: 'default',
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSplitLock()
                      setShowSplitMore(false)
                    }}
                    style={{
                      borderRadius: 8,
                      border: `1px solid ${splitDragLocked ? '#10b98166' : '#2a3a6b'}`,
                      background: splitDragLocked ? 'rgba(16,185,129,0.14)' : 'rgba(13,18,32,0.96)',
                      color: splitDragLocked ? '#10b981' : '#7ba7d4',
                      padding: '4px 8px',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '.04em',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {splitDragLocked ? 'Unlock split' : 'Lock split'}
                  </button>
                </div>
              )}
            </div>
          )}
          {splitNotice && (
            <span
              style={{
                borderRadius: 999,
                border: '1px solid #1f315e',
                background: 'rgba(8,14,28,0.96)',
                color: '#8db3e2',
                padding: '2px 8px',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '.04em',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                maxWidth: compactSplitControls ? 120 : undefined,
                overflow: compactSplitControls ? 'hidden' : undefined,
                textOverflow: compactSplitControls ? 'ellipsis' : undefined,
              }}
            >
              {splitNotice}
            </span>
          )}
        </div>

        <MemoryPanel open={memoryOpen} onClose={() => setMemoryOpen(false)} />
        <CronSchedulerPanel open={schedulerOpen} onClose={() => setSchedulerOpen(false)} />

        {/* ── Terminal / chat ── */}
        <div
          style={{
            flex: '1 1 40vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg)',
            overflowY: 'auto',
            minHeight: 220,
            maxHeight: '100%',
          }}
        >
          {messages.length === 0 ? (
            <WelcomeHUD />
          ) : (
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.map((m, i) => {
                const cfgColor = m.agent ? (AGENTS[m.agent]?.color ?? activeColor) : activeColor
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 6 }}>
                    {m.role === 'agent' && m.agent && (
                      <div style={{ fontSize: 9, fontWeight: 900, color: cfgColor, letterSpacing: '.06em' }}>
                        {AGENTS[m.agent].name} · {AGENTS[m.agent].role.toUpperCase()}
                      </div>
                    )}
                    {m.steps && m.steps.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 640 }}>
                        {m.steps.slice(-18).map((s, si) => (
                          <ToolCallBadge key={si} step={s} />
                        ))}
                      </div>
                    )}
                    <div
                      style={{
                        maxWidth: 720,
                        padding: m.role === 'user' ? '10px 12px' : '10px 14px',
                        borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                        background: m.role === 'user' ? 'var(--accent)' : `color-mix(in srgb, ${cfgColor} 8%, var(--surf2))`,
                        border: m.role === 'agent' && m.agent ? `1px solid ${cfgColor}33` : 'none',
                        fontSize: 12.5,
                        color: 'var(--text)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                )
              })}

              {activeAgent && liveSteps.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 640, alignSelf: 'flex-start' }}>
                  {liveSteps.slice(-12).map((s, i) => (
                    <ToolCallBadge key={i} step={s} />
                  ))}
                </div>
              )}
              {activeAgent && liveSteps.length === 0 && (
                <div style={{ display: 'flex', gap: 6, paddingLeft: 2, alignItems: 'center', opacity: 0.8 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: activeColor }} />
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: activeColor, opacity: 0.7 }} />
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: activeColor, opacity: 0.5 }} />
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Input bar */}
          <div
            style={{
              padding: '10px 12px',
              borderTop: '1px solid var(--border)',
              background: 'var(--surf)',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-end',
              flexShrink: 0,
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={activeAgent ? 'Agent is busy…' : 'Talk to MAX — he routes to the right specialist…'}
              disabled={!!activeAgent}
              rows={1}
              style={{
                flex: 1,
                resize: 'none',
                background: 'var(--surf2)',
                border: `1px solid ${activeAgent ? 'var(--border2)' : 'var(--border2)'}`,
                borderRadius: '10px',
                padding: '9px 13px',
                fontSize: '12.5px',
                color: 'var(--text)',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                maxHeight: 120,
                opacity: activeAgent ? 0.5 : 1,
              }}
            />
            <button
              onClick={() => void send()}
              disabled={!input.trim() || !!activeAgent}
              style={{
                flexShrink: 0,
                width: 36,
                height: 36,
                borderRadius: 10,
                background: input.trim() && !activeAgent ? 'var(--accent)' : 'var(--surf3)',
                border: 'none',
                cursor: input.trim() && !activeAgent ? 'pointer' : 'default',
                color: '#fff',
                fontSize: 14,
              }}
              title="Send"
            >
              {activeAgent ? '…' : '▶'}
            </button>
            <button
              onClick={handleClear}
              disabled={messages.length === 0 && officeMessages.length === 0}
              style={{
                flexShrink: 0,
                height: 36,
                padding: '0 12px',
                borderRadius: 10,
                background: 'transparent',
                border: '1px solid var(--border2)',
                cursor: messages.length === 0 && officeMessages.length === 0 ? 'default' : 'pointer',
                color: 'var(--text2)',
                fontSize: 12,
                fontWeight: 700,
              }}
              title="Clear chat"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

