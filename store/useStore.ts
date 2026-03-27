// ── store/useStore ──────────────────────────────────────────
// Zustand store: global state management for prices, articles, signals, CVEs.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { OFFICE_OBJECT_DEFAULTS } from '@/components/home/office/constants'
import type { OfficeObjectId, OfficeObjectPos } from '@/components/home/office/types'

// ── Notification types ────────────────────────────────────────────────────────
export type NotificationType     = 'threat' | 'market' | 'seismic' | 'weather' | 'system' | 'intel'
export type NotificationSeverity = 'critical' | 'high' | 'medium' | 'low'

// ── Operational phase model ───────────────────────────────────────────────────
export type OperationalPhase =
  | 'idle'
  | 'interpreting'
  | 'planning'
  | 'executing'
  | 'validating'
  | 'responding'
  | 'done'

export interface TaskItem {
  id:     string
  label:  string
  status: 'pending' | 'running' | 'done' | 'failed'
}

export interface ScheduledJob {
  id:            string
  name:          string
  prompt:        string
  cron:          string     // 5-field cron expression (min hour dom mon dow)
  enabled:       boolean
  lastRunAt?:    number
  lastStatus?:   'ok' | 'error'
  lastSummary?:  string
}

export interface PendingEdit {
  id:         string
  path:       string
  old_string: string
  new_string: string
  reason:     string
  risk:       'low' | 'medium' | 'high'
  agentId:    string
  createdAt:  string
}

export interface ChangeEntry {
  id:           string
  timestamp:    number
  path:         string
  agent:        string
  summary:      string
  type:         'patch' | 'create' | 'approved' | 'rejected'
  linesAdded:   number
  linesRemoved: number
}

// ── Per-agent runtime stats ────────────────────────────────────────────────────
export interface AgentStats {
  totalTasks:     number
  lastTask:       string
  lastConfidence: number   // 0–100
  lastActiveAt:   number   // epoch ms
}

// ── Activity log ──────────────────────────────────────────────────────────────
export type LogEntryType = 'articles' | 'prices' | 'cves' | 'system' | 'agent' | 'world' | 'otx'

export interface LogEntry {
  id:    string
  time:  number
  type:  LogEntryType
  text:  string
  color: string
}

export interface Notification {
  id:        string
  type:      NotificationType
  severity:  NotificationSeverity
  title:     string
  message:   string
  source:    string
  timestamp: number
  read:      boolean
}

export interface ModeBriefing {
  id: string
  mode: 'normal' | 'war' | 'nightOps'
  jobId: string
  jobName: string
  status: 'ok' | 'error'
  summary: string
  relatedTab: string
  createdAt: number
}

// ── Default settings (mirrors DEFAULT_CFG from nexus-final.html) ──────────────
export const DEFAULT_SETTINGS = {
  // AI
  apiKey:            '',
  aiProvider:        'openai' as 'openai' | 'anthropic',
  localEndpoint:     'http://localhost:11434/v1/chat/completions',
  localModel:        'qwen3:8b',
  localApiKey:       '',
  useLocalReasoning: true,   // Use local deepseek-r1:14b for Think mode
  // Data APIs
  cgKey:         '',
  finnhubKey:    '',
  nvdKey:        '',
  guardianKey:   '',
  fredKey:       '',
  otxKey:        '',
  aisstreamKey:  '',
  firmsKey:      '',
  firecrawlKey:  '',
  braveKey:      '',
  // Personal profile
  userName:      'Mario',
  userGoals:     '',
  userSkills:    '',
  userLearning:  '',
  userContext:   '',
  // App state
  watchlist:     [] as string[],
  botHistory:    [] as unknown[],
  botAlerts:     [] as unknown[],
  customFeeds:   [] as unknown[],
  alertKeywords: '',
  officeSceneMode: 'auto' as 'auto' | 'morning' | 'afternoon' | 'night',
  officeMotion: 1,
  officeSplitHeightPx: 0,
  officeCameraPreset: 'cinematic' as 'cinematic' | 'closeOps' | 'wallReadability',
  officeOperationalMode: 'normal' as 'normal' | 'war' | 'nightOps',
  enableWarAutoJobs: false,
  enableNightOpsAutoJobs: false,
  autoOpsJobCooldownMin: 30,
  autoOpsLastRunAt: {} as Record<string, number>,
  // If true, ProposedEditPanel will auto-apply agent edits whose path is
  // limited to the HQ Prime office scene code (no manual APPROVE clicks).
  autoApplyOfficeEdits: true,
  scheduledJobs: [] as ScheduledJob[],
  _bbChecks:     '{}',
}

export type Settings = typeof DEFAULT_SETTINGS

// ── Live data types ───────────────────────────────────────────────────────────
export interface PriceData {
  price: number
  chg:   number
  sym:   string
  mcap:  number
  vol:   number
}

export interface Article {
  id:    string
  title: string
  desc:  string
  link:  string
  date:  string
  bias?: string
  src?:  string
  cat?:  string  // crypto | markets | cyber | tech | world
}

export interface PendingDraft {
  id:        string
  filename:  string
  content:   string
  createdAt: string
  model:     string
  prompt:    string
  status:    'pending' | 'finalized' | 'dismissed'
}

export type AIMode = 'claude' | 'local' | 'auto'

export interface OTXPulse {
  id:              string
  name:            string
  description:     string
  author:          string
  tags:            string[]
  indicator_count: number
  created:         string
  modified:        string
  tlp:             string
  adversary:       string
  references:      string[]
}

export type GeoRecord = Record<string, unknown>

export interface ThreatIntel {
  threatfox: GeoRecord[]
  shodan:    GeoRecord | null
}

export interface FearGreedData {
  current: {
    value:                 number | string
    value_classification?: string
  }
  history: GeoRecord[]
}

export interface DefiData {
  protocols:   GeoRecord[]
  stablecoins: GeoRecord[]
  yields:      GeoRecord[]
}

export interface WeatherData {
  main?:        { temp?: number; temperature?: number; humidity?: number; pressure?: number }
  temperature?: number
  humidity?:    number
  pressure?:    number
  alerts?:      GeoRecord[]
  [key: string]: unknown
}

export interface SecurityAlert {
  id:           string
  title:        string
  severity:     NotificationSeverity
  source:       string
  timestamp:    number
  acknowledged: boolean
  [key: string]: unknown
}

// ── Office chat message (persisted in-session) ────────────────────────────────
export interface OfficeChatMessage {
  role:   'user' | 'agent'
  agent?: string   // AgentId
  text:   string
  // steps are NOT persisted (too large) — only shown live
}

// ── Store interface ───────────────────────────────────────────────────────────
interface NexusState {
  // Persisted settings
  settings:       Settings
  updateSettings: (patch: Partial<Settings>) => void

  // AI mode
  aiMode:    AIMode
  setAIMode: (mode: AIMode) => void

  // Pending drafts
  pendingDrafts:        PendingDraft[]
  addPendingDraft:      (draft: Omit<PendingDraft, 'id' | 'createdAt' | 'status'>) => void
  updateDraftStatus:    (id: string, status: PendingDraft['status']) => void
  clearFinalizedDrafts: () => void

  // Core live data
  tab:           string
  prices:        Record<string, PriceData>
  sparklines:    Record<string, number[]>
  articles:      Article[]
  savedArticles: Article[]
  signals:       { fg: { value: number; label: string } | null }
  cves:          unknown[]
  cvesLoaded:    boolean
  otxPulses:     OTXPulse[]
  worldRisk:     number
  chatHistory:   { role: string; content: string }[]

  // Extended live data (loaded by useGlobalData hook)
  earthquakes:    GeoRecord[]
  gdeltEvents:    GeoRecord[]
  threatIntel:    ThreatIntel
  weather:        WeatherData | null
  fearGreed:      FearGreedData | null
  defiData:       DefiData
  hackerNews:     GeoRecord[]
  secFilings:     GeoRecord[]
  flights:        GeoRecord[]
  securityAlerts: SecurityAlert[]

  // Operational phase
  currentPhase:      OperationalPhase
  phaseStartedAt:    number
  setCurrentPhase:   (phase: OperationalPhase) => void

  // Task plan
  taskPlan:        TaskItem[]
  setTaskPlan:     (plan: TaskItem[]) => void
  updateTaskItem:  (id: string, status: TaskItem['status']) => void

  // Pending proposed edits (await user approval)
  pendingEdits:       PendingEdit[]
  addPendingEdit:     (edit: Omit<PendingEdit, 'id' | 'createdAt'>) => void
  removePendingEdit:  (id: string) => void

  // Change log (audit trail of applied edits)
  changeLog:      ChangeEntry[]
  addChangeEntry: (entry: Omit<ChangeEntry, 'id' | 'timestamp'>) => void

  // Per-agent runtime stats
  agentStats:       Record<string, AgentStats>
  updateAgentStats: (agentId: string, patch: Partial<AgentStats>) => void

  // Office chat history (in-session, survives tab switches)
  officeMessages:      OfficeChatMessage[]
  addOfficeMessage:    (msg: OfficeChatMessage) => void
  clearOfficeMessages: () => void

  // HQ Prime layout editor (Drawbridge-style)
  officeEditMode:      boolean
  setOfficeEditMode:   (v: boolean) => void
  officeLayout:        Record<OfficeObjectId, OfficeObjectPos>
  setOfficeLayout:     (layout: Record<OfficeObjectId, OfficeObjectPos>) => void
  setOfficeObjectPos:  (id: OfficeObjectId, pos: OfficeObjectPos) => void
  resetOfficeLayout:   () => void

  // Activity log
  activityLog: LogEntry[]
  addLog:      (entry: Omit<LogEntry, 'id' | 'time'>) => void

  // Operational mode briefings
  modeBriefings: ModeBriefing[]
  addModeBriefing: (b: Omit<ModeBriefing, 'id' | 'createdAt'>) => void
  clearModeBriefings: () => void

  // Notifications
  notifications:       Notification[]
  unreadCount:         number
  addNotification:     (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markRead:            (id: string) => void
  markAllRead:         () => void
  dismissNotification: (id: string) => void

  // Core setters
  setTab:            (tab: string) => void
  setWorldRisk:      (n: number) => void
  setPrices:         (prices: Record<string, PriceData>) => void
  setSparklines:     (sparklines: Record<string, number[]>) => void
  setArticles:       (articles: Article[]) => void
  setSignals:        (signals: NexusState['signals']) => void
  setCves:           (cves: unknown[]) => void
  setCvesLoaded:     (loaded: boolean) => void
  setOtxPulses:      (pulses: OTXPulse[]) => void
  addChatMessage:    (msg: { role: string; content: string }) => void
  clearChat:         () => void
  toggleSaveArticle: (article: Article) => void

  // Extended setters
  setEarthquakes:    (data: GeoRecord[]) => void
  setGdeltEvents:    (data: GeoRecord[]) => void
  setThreatIntel:    (data: ThreatIntel) => void
  setWeather:        (data: WeatherData | null) => void
  setFearGreed:      (data: FearGreedData) => void
  setDefiData:       (data: DefiData) => void
  setHackerNews:     (data: GeoRecord[]) => void
  setSecFilings:     (data: GeoRecord[]) => void
  setFlights:        (data: GeoRecord[]) => void
  setSecurityAlerts: (data: SecurityAlert[]) => void
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useStore = create<NexusState>()(
  persist(
    (set) => ({
      // Settings
      settings:       DEFAULT_SETTINGS,
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      // AI mode
      aiMode:    'local',
      setAIMode: (mode) => set({ aiMode: mode }),

      // Pending drafts
      pendingDrafts: [],
      addPendingDraft: (draft) =>
        set((s) => ({
          pendingDrafts: [
            {
              ...draft,
              id:        Math.random().toString(36).slice(2, 10),
              createdAt: new Date().toISOString(),
              status:    'pending',
            },
            ...s.pendingDrafts,
          ],
        })),
      updateDraftStatus: (id, status) =>
        set((s) => ({
          pendingDrafts: s.pendingDrafts.map((d) =>
            d.id === id ? { ...d, status } : d
          ),
        })),
      clearFinalizedDrafts: () =>
        set((s) => ({
          pendingDrafts: s.pendingDrafts.filter((d) => d.status === 'pending'),
        })),

      // Core live data defaults
      tab:           'home',
      prices:        {},
      sparklines:    {},
      articles:      [],
      savedArticles: [],
      signals:       { fg: null },
      cves:          [],
      cvesLoaded:    false,
      otxPulses:     [],
      worldRisk:     0,
      chatHistory:   [],

      // Extended live data defaults
      earthquakes:    [],
      gdeltEvents:    [],
      threatIntel:    { threatfox: [], shodan: null },
      weather:        null,
      fearGreed:      null,
      defiData:       { protocols: [], stablecoins: [], yields: [] },
      hackerNews:     [],
      secFilings:     [],
      flights:        [],
      securityAlerts: [],

      // Operational phase
      currentPhase:    'idle',
      phaseStartedAt:  Date.now(),
      setCurrentPhase: (currentPhase) => set({ currentPhase, phaseStartedAt: Date.now() }),

      // Task plan
      taskPlan:       [],
      setTaskPlan:    (taskPlan) => set({ taskPlan }),
      updateTaskItem: (id, status) =>
        set((s) => ({
          taskPlan: s.taskPlan.map((t) => t.id === id ? { ...t, status } : t),
        })),

      // Pending edits
      pendingEdits: [],
      addPendingEdit: (edit) =>
        set((s) => ({
          pendingEdits: [
            { ...edit, id: Math.random().toString(36).slice(2, 10), createdAt: new Date().toISOString() },
            ...s.pendingEdits,
          ],
        })),
      removePendingEdit: (id) =>
        set((s) => ({ pendingEdits: s.pendingEdits.filter((e) => e.id !== id) })),

      // Change log
      changeLog: [],
      addChangeEntry: (entry) =>
        set((s) => ({
          changeLog: [
            { ...entry, id: Math.random().toString(36).slice(2, 10), timestamp: Date.now() },
            ...s.changeLog,
          ].slice(0, 200),
        })),

      // Per-agent stats
      agentStats: {},
      updateAgentStats: (agentId, patch) =>
        set((s) => ({
          agentStats: {
            ...s.agentStats,
            [agentId]: {
              totalTasks:     (s.agentStats[agentId]?.totalTasks ?? 0) + (patch.totalTasks !== undefined ? 1 : 0),
              lastTask:       patch.lastTask       ?? s.agentStats[agentId]?.lastTask       ?? '',
              lastConfidence: patch.lastConfidence ?? s.agentStats[agentId]?.lastConfidence ?? 0,
              lastActiveAt:   patch.lastActiveAt   ?? s.agentStats[agentId]?.lastActiveAt   ?? 0,
            },
          },
        })),

      // Office chat history
      officeMessages:      [],
      addOfficeMessage:    (msg) =>
        set((s) => ({
          officeMessages: [...s.officeMessages, msg].slice(-100),
        })),
      clearOfficeMessages: () => set({ officeMessages: [] }),

      // HQ Prime layout editor
      officeEditMode:    false,
      setOfficeEditMode: (officeEditMode) => set({ officeEditMode }),
      officeLayout:      { ...OFFICE_OBJECT_DEFAULTS },
      setOfficeLayout:   (officeLayout) => set({ officeLayout }),
      setOfficeObjectPos: (id, pos) =>
        set((s) => ({
          officeLayout: { ...s.officeLayout, [id]: { x: pos.x, y: pos.y, ax: pos.ax, ay: pos.ay } },
        })),
      resetOfficeLayout: () => set({ officeLayout: { ...OFFICE_OBJECT_DEFAULTS } }),

      // Activity log defaults
      activityLog: [],
      addLog: (entry) =>
        set((s) => ({
          activityLog: [
            { ...entry, id: Math.random().toString(36).slice(2, 10), time: Date.now() },
            ...s.activityLog,
          ].slice(0, 200),
        })),

      // Mode briefings
      modeBriefings: [],
      addModeBriefing: (b) =>
        set((s) => ({
          modeBriefings: [
            {
              ...b,
              id: Math.random().toString(36).slice(2, 10),
              createdAt: Date.now(),
            },
            ...s.modeBriefings,
          ].slice(0, 40),
        })),
      clearModeBriefings: () => set({ modeBriefings: [] }),

      // Notifications defaults
      notifications: [],
      unreadCount:   0,

      // Core setters
      setTab:        (tab)        => set({ tab }),
      setWorldRisk:  (worldRisk)  => set({ worldRisk }),
      setPrices:     (prices)     => set({ prices }),
      setSparklines: (sparklines) => set({ sparklines }),
      setArticles:   (articles)   => set({ articles }),
      setSignals:    (signals)    => set({ signals }),
      setCves:       (cves)       => set({ cves }),
      setCvesLoaded: (cvesLoaded) => set({ cvesLoaded }),
      setOtxPulses:  (otxPulses)  => set({ otxPulses }),
      addChatMessage: (msg) =>
        set((s) => ({ chatHistory: [...s.chatHistory, msg] })),
      clearChat: () => set({ chatHistory: [] }),
      toggleSaveArticle: (article) =>
        set((s) => {
          const already = s.savedArticles.some((a) => a.id === article.id)
          return {
            savedArticles: already
              ? s.savedArticles.filter((a) => a.id !== article.id)
              : [article, ...s.savedArticles],
          }
        }),

      // Extended setters
      setEarthquakes:    (earthquakes)    => set({ earthquakes }),
      setGdeltEvents:    (gdeltEvents)    => set({ gdeltEvents }),
      setThreatIntel:    (threatIntel)    => set({ threatIntel }),
      setWeather:        (weather)        => set({ weather }),
      setFearGreed:      (fearGreed)      => set({ fearGreed }),
      setDefiData:       (defiData)       => set({ defiData }),
      setHackerNews:     (hackerNews)     => set({ hackerNews }),
      setSecFilings:     (secFilings)     => set({ secFilings }),
      setFlights:        (flights)        => set({ flights }),
      setSecurityAlerts: (securityAlerts) => set({ securityAlerts }),

      // Notification actions
      addNotification: (n) =>
        set((s) => {
          const notification: Notification = {
            ...n,
            id:        Math.random().toString(36).slice(2, 10),
            timestamp: Date.now(),
            read:      false,
          }
          const notifications = [notification, ...s.notifications].slice(0, 100)
          return { notifications, unreadCount: notifications.filter((x) => !x.read).length }
        }),
      markRead: (id) =>
        set((s) => {
          const notifications = s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          )
          return { notifications, unreadCount: notifications.filter((n) => !n.read).length }
        }),
      markAllRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
          unreadCount:   0,
        })),
      dismissNotification: (id) =>
        set((s) => {
          const notifications = s.notifications.filter((n) => n.id !== id)
          return { notifications, unreadCount: notifications.filter((n) => !n.read).length }
        }),
    }),
    {
      name:       'nexus-settings',
      partialize: (s) => ({
        settings:      s.settings,
        savedArticles: s.savedArticles,
        pendingDrafts: s.pendingDrafts,
        aiMode:        s.aiMode,
        officeLayout:  s.officeLayout,
      }),
    }
  )
)
