import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

interface NexusState {
  // Persisted settings
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void

  // AI mode — auto detects rate limits and falls back to local
  aiMode:        AIMode
  setAIMode:     (mode: AIMode) => void

  // Pending drafts written by local model, awaiting Claude finalization
  pendingDrafts:       PendingDraft[]
  addPendingDraft:     (draft: Omit<PendingDraft, 'id' | 'createdAt' | 'status'>) => void
  updateDraftStatus:   (id: string, status: PendingDraft['status']) => void
  clearFinalizedDrafts: () => void

  // Live data (session only)
  tab:           string
  prices:        Record<string, PriceData>
  sparklines:    Record<string, number[]>
  articles:      Article[]
  savedArticles: Article[]
  signals:       { fg: { value: number; label: string } | null }
  cves:          unknown[]
  cvesLoaded:    boolean  // true once fetch completes (success or fail)
  otxPulses:     OTXPulse[]
  worldRisk:     number   // count of critical+high conflict items (0 = unknown)
  chatHistory:   { role: string; content: string }[]

  // Live data setters
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
}

export const useStore = create<NexusState>()(
  persist(
    (set) => ({
      // Settings
      settings: DEFAULT_SETTINGS,
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      // AI mode — default to local (Ollama qwen2.5:7b) to preserve Claude API credits
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

      // Live data defaults
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

      // Setters
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
