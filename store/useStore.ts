import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NexusPlugin } from '@/lib/plugins'

// ── Default settings (mirrors DEFAULT_CFG from nexus-final.html) ──────────────
export const DEFAULT_SETTINGS = {
  // AI
  apiKey:        '',
  aiProvider:    'openai' as 'openai' | 'anthropic',
  localEndpoint: 'http://localhost:11434/v1/chat/completions',
  localModel:    'qwen2.5:7b',
  localApiKey:   '',
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
  _bbChecks:     '{}',
}

export type Settings = typeof DEFAULT_SETTINGS

// ── Live data (not persisted) ─────────────────────────────────────────────────
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
  id:        string   // nanoid
  filename:  string
  content:   string
  createdAt: string   // ISO timestamp
  model:     string   // which local model wrote it
  prompt:    string   // original user request (for context)
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
  tlp:             string   // white | green | amber | red
  adversary:       string
  references:      string[]
}

// ── New domain types ───────────────────────────────────────────────────────────

export interface NexusDevice {
  id:       string
  name:     string
  type:     string
  status:   string
  lastSeen: number
  data:     Record<string, unknown>
}

export interface NexusSkill {
  id:          string
  name:        string
  category:    string
  level:       number
  lastUsed:    number
  description: string
  learned:     string
}

export interface NexusCamera {
  id:     string
  name:   string
  url:    string
  type:   string
  status: string
}

export interface SecurityAlert {
  id:           string
  type:         string
  camera:       string
  confidence:   number
  ts:           number
  acknowledged: boolean
}

export interface NexusVehicle {
  id:        string
  name:      string
  type:      string
  status:    string
  telemetry: Record<string, unknown>
}

export interface AutomationRule {
  id:        string
  name:      string
  trigger:   string
  condition: string
  action:    string
  enabled:   boolean
}

export interface SystemHealthEntry {
  status:    string
  lastCheck: number
  message:   string
}

// ── Notification types ─────────────────────────────────────────────────────────
export type NotificationType = 'threat' | 'market' | 'seismic' | 'weather' | 'system' | 'intel'
export type NotificationSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface Notification {
  id:        string
  type:      NotificationType
  title:     string
  message:   string
  severity:  NotificationSeverity
  timestamp: number
  read:      boolean
  source:    string
}

// ── Full state interface ───────────────────────────────────────────────────────
interface NexusState {
  // ── Persisted settings ─────────────────────────────────────────────────────
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void

  // ── AI mode — auto detects rate limits and falls back to local ─────────────
  aiMode:    AIMode
  setAIMode: (mode: AIMode) => void

  // ── Pending drafts written by local model, awaiting Claude finalization ────
  pendingDrafts:        PendingDraft[]
  addPendingDraft:      (draft: Omit<PendingDraft, 'id' | 'createdAt' | 'status'>) => void
  updateDraftStatus:    (id: string, status: PendingDraft['status']) => void
  clearFinalizedDrafts: () => void

  // ── Live data (session only) ───────────────────────────────────────────────
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

  // ── Live data setters ──────────────────────────────────────────────────────
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

  // ── Plugin system ──────────────────────────────────────────────────────────
  plugins:        NexusPlugin[]
  registerPlugin: (plugin: NexusPlugin) => void
  removePlugin:   (id: string) => void
  setPluginEnabled: (id: string, enabled: boolean) => void

  // ── System health map ──────────────────────────────────────────────────────
  systemHealth: Record<string, SystemHealthEntry>
  updateHealth: (component: string, status: string, message: string) => void

  // ── IoT devices ───────────────────────────────────────────────────────────
  devices:      NexusDevice[]
  addDevice:    (device: NexusDevice) => void
  updateDevice: (id: string, data: Partial<NexusDevice>) => void
  removeDevice: (id: string) => void

  // ── Skills ────────────────────────────────────────────────────────────────
  skills:      NexusSkill[]
  addSkill:    (skill: NexusSkill) => void
  updateSkill: (id: string, updates: Partial<NexusSkill>) => void
  removeSkill: (id: string) => void

  // ── Security ──────────────────────────────────────────────────────────────
  cameras:           NexusCamera[]
  securityAlerts:    SecurityAlert[]
  addCamera:         (camera: NexusCamera) => void
  removeCamera:      (id: string) => void
  addSecurityAlert:  (alert: SecurityAlert) => void
  acknowledgeAlert:  (id: string) => void
  clearAcknowledged: () => void

  // ── Vehicles ──────────────────────────────────────────────────────────────
  vehicles:              NexusVehicle[]
  addVehicle:            (vehicle: NexusVehicle) => void
  removeVehicle:         (id: string) => void
  updateVehicleTelemetry: (id: string, telemetry: Record<string, unknown>) => void

  // ── Automation rules ──────────────────────────────────────────────────────
  automationRules: AutomationRule[]
  addRule:         (rule: AutomationRule) => void
  removeRule:      (id: string) => void
  updateRule:      (id: string, updates: Partial<AutomationRule>) => void
  toggleRule:      (id: string) => void

  // ── New live data ──────────────────────────────────────────────────────────
  earthquakes:    any[]
  setEarthquakes: (data: any[]) => void
  threatIntel:    { threatfox: any[]; shodan: any | null }
  setThreatIntel: (data: { threatfox: any[]; shodan: any | null }) => void
  gdeltEvents:    any[]
  setGdeltEvents: (data: any[]) => void
  weather:        any | null
  setWeather:     (data: any) => void
  fearGreed:      { current: any; history: any[] } | null
  setFearGreed:   (data: { current: any; history: any[] }) => void
  defiData:       { protocols: any[]; stablecoins: any[]; yields: any[] }
  setDefiData:    (data: { protocols: any[]; stablecoins: any[]; yields: any[] }) => void
  hackerNews:     any[]
  setHackerNews:  (data: any[]) => void
  flights:        any[]
  setFlights:     (data: any[]) => void
  secFilings:     any[]
  setSecFilings:  (data: any[]) => void

  // ── Notifications ──────────────────────────────────────────────────────────
  notifications:      Notification[]
  unreadCount:        number
  addNotification:    (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markRead:           (id: string) => void
  markAllRead:        () => void
  dismissNotification:(id: string) => void
}

// ── Store ──────────────────────────────────────────────────────────────────────
export const useStore = create<NexusState>()(
  persist(
    (set) => ({
      // ── Settings ──────────────────────────────────────────────────────────
      settings: DEFAULT_SETTINGS,
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      // ── AI mode — default to local (Ollama qwen2.5:7b) ────────────────────
      aiMode:    'local',
      setAIMode: (mode) => set({ aiMode: mode }),

      // ── Pending drafts ─────────────────────────────────────────────────────
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

      // ── Live data defaults ─────────────────────────────────────────────────
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

      // ── Live data setters ──────────────────────────────────────────────────
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

      // ── Plugin system ──────────────────────────────────────────────────────
      plugins: [],
      registerPlugin: (plugin) =>
        set((s) => {
          const exists = s.plugins.some((p) => p.id === plugin.id)
          return exists ? {} : { plugins: [...s.plugins, plugin] }
        }),
      removePlugin: (id) =>
        set((s) => ({ plugins: s.plugins.filter((p) => p.id !== id) })),
      setPluginEnabled: (id, enabled) =>
        set((s) => ({
          plugins: s.plugins.map((p) => p.id === id ? { ...p, enabled } : p),
        })),

      // ── System health ──────────────────────────────────────────────────────
      systemHealth: {},
      updateHealth: (component, status, message) =>
        set((s) => ({
          systemHealth: {
            ...s.systemHealth,
            [component]: { status, lastCheck: Date.now(), message },
          },
        })),

      // ── IoT devices ───────────────────────────────────────────────────────
      devices: [],
      addDevice: (device) =>
        set((s) => {
          const exists = s.devices.some((d) => d.id === device.id)
          return exists ? {} : { devices: [...s.devices, device] }
        }),
      updateDevice: (id, data) =>
        set((s) => ({
          devices: s.devices.map((d) => d.id === id ? { ...d, ...data } : d),
        })),
      removeDevice: (id) =>
        set((s) => ({ devices: s.devices.filter((d) => d.id !== id) })),

      // ── Skills ────────────────────────────────────────────────────────────
      skills: [],
      addSkill: (skill) =>
        set((s) => {
          const exists = s.skills.some((sk) => sk.id === skill.id)
          return exists ? {} : { skills: [...s.skills, skill] }
        }),
      updateSkill: (id, updates) =>
        set((s) => ({
          skills: s.skills.map((sk) => sk.id === id ? { ...sk, ...updates } : sk),
        })),
      removeSkill: (id) =>
        set((s) => ({ skills: s.skills.filter((sk) => sk.id !== id) })),

      // ── Security ──────────────────────────────────────────────────────────
      cameras:        [],
      securityAlerts: [],
      addCamera: (camera) =>
        set((s) => {
          const exists = s.cameras.some((c) => c.id === camera.id)
          return exists ? {} : { cameras: [...s.cameras, camera] }
        }),
      removeCamera: (id) =>
        set((s) => ({ cameras: s.cameras.filter((c) => c.id !== id) })),
      addSecurityAlert: (alert) =>
        set((s) => ({
          securityAlerts: [alert, ...s.securityAlerts].slice(0, 500), // cap at 500
        })),
      acknowledgeAlert: (id) =>
        set((s) => ({
          securityAlerts: s.securityAlerts.map((a) =>
            a.id === id ? { ...a, acknowledged: true } : a
          ),
        })),
      clearAcknowledged: () =>
        set((s) => ({
          securityAlerts: s.securityAlerts.filter((a) => !a.acknowledged),
        })),

      // ── Vehicles ──────────────────────────────────────────────────────────
      vehicles: [],
      addVehicle: (vehicle) =>
        set((s) => {
          const exists = s.vehicles.some((v) => v.id === vehicle.id)
          return exists ? {} : { vehicles: [...s.vehicles, vehicle] }
        }),
      removeVehicle: (id) =>
        set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id) })),
      updateVehicleTelemetry: (id, telemetry) =>
        set((s) => ({
          vehicles: s.vehicles.map((v) =>
            v.id === id ? { ...v, telemetry: { ...v.telemetry, ...telemetry } } : v
          ),
        })),

      // ── Automation rules ──────────────────────────────────────────────────
      automationRules: [],
      addRule: (rule) =>
        set((s) => {
          const exists = s.automationRules.some((r) => r.id === rule.id)
          return exists ? {} : { automationRules: [...s.automationRules, rule] }
        }),
      removeRule: (id) =>
        set((s) => ({ automationRules: s.automationRules.filter((r) => r.id !== id) })),
      updateRule: (id, updates) =>
        set((s) => ({
          automationRules: s.automationRules.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),
      toggleRule: (id) =>
        set((s) => ({
          automationRules: s.automationRules.map((r) =>
            r.id === id ? { ...r, enabled: !r.enabled } : r
          ),
        })),

      // ── New live data defaults & setters ───────────────────────────────
      earthquakes:    [],
      setEarthquakes: (data) => set({ earthquakes: data }),
      threatIntel:    { threatfox: [], shodan: null },
      setThreatIntel: (data) => set({ threatIntel: data }),
      gdeltEvents:    [],
      setGdeltEvents: (data) => set({ gdeltEvents: data }),
      weather:        null,
      setWeather:     (data) => set({ weather: data }),
      fearGreed:      null,
      setFearGreed:   (data) => set({ fearGreed: data }),
      defiData:       { protocols: [], stablecoins: [], yields: [] },
      setDefiData:    (data) => set({ defiData: data }),
      hackerNews:     [],
      setHackerNews:  (data) => set({ hackerNews: data }),
      flights:        [],
      setFlights:     (data) => set({ flights: data }),
      secFilings:     [],
      setSecFilings:  (data) => set({ secFilings: data }),

      // ── Notifications ──────────────────────────────────────────────────────
      notifications: [],
      unreadCount:   0,
      addNotification: (n) =>
        set((s) => {
          const newNotif: Notification = {
            ...n,
            id:        Math.random().toString(36).slice(2, 10),
            timestamp: Date.now(),
            read:      false,
          }
          const updated = [newNotif, ...s.notifications].slice(0, 50)
          return {
            notifications: updated,
            unreadCount:   updated.filter((x) => !x.read).length,
          }
        }),
      markRead: (id) =>
        set((s) => {
          const updated = s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          )
          return {
            notifications: updated,
            unreadCount:   updated.filter((x) => !x.read).length,
          }
        }),
      markAllRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
          unreadCount:   0,
        })),
      dismissNotification: (id) =>
        set((s) => {
          const updated = s.notifications.filter((n) => n.id !== id)
          return {
            notifications: updated,
            unreadCount:   updated.filter((x) => !x.read).length,
          }
        }),
    }),
    {
      name:       'nexus-settings',
      partialize: (s) => ({
        // Original persisted fields
        settings:      s.settings,
        savedArticles: s.savedArticles,
        pendingDrafts: s.pendingDrafts,
        aiMode:        s.aiMode,
        // New persisted fields
        plugins:         s.plugins,
        systemHealth:    s.systemHealth,
        devices:         s.devices,
        skills:          s.skills,
        cameras:         s.cameras,
        securityAlerts:  s.securityAlerts,
        vehicles:        s.vehicles,
        automationRules: s.automationRules,
        // Notifications persisted
        notifications:   s.notifications,
      }),
    }
  )
)
