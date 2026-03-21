import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Notification types ────────────────────────────────────────────────────────
export type NotificationType     = 'threat' | 'market' | 'seismic' | 'weather' | 'system' | 'intel'
export type NotificationSeverity = 'critical' | 'high' | 'medium' | 'low'

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
      }),
    }
  )
)
