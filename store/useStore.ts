// ── store/useStore ──────────────────────────────────────────
// Zustand store: global state management for prices, articles, signals, CVEs.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { OFFICE_OBJECT_DEFAULTS } from '@/components/home/office/constants'
import type { OfficeObjectId, OfficeObjectPos, PersonaMode, CouncilResult, SwitchOperatorStatus, VaultArchiveLink, VaultGraphData, VaultSynthesis, VaultLintResult } from '@/components/home/office/types'
import { DEFAULT_LOCAL_MODEL } from '@/lib/aiModelRouting'
import { normalizePreferredAIProvider, type PreferredAIProvider } from '@/lib/aiProviderPreference'
import {
  type UnfinishedSessionCompletionState,
  type UnfinishedSessionMemory,
  rememberUnfinishedSession,
  pruneUnfinishedSessions,
  touchUnfinishedSession,
} from '@/lib/assistantSessionMemory'
import { normalizePreparedWorkspaceTarget } from '@/lib/assistantSessionRegistry'
import { sanitizeClientSettingsForPersistence } from '@/lib/clientSettingsBoundary'
import {
  DEFAULT_VEHICLE_CONNECTOR_PROFILE,
  normalizeVehicleChecklistState,
  normalizeVehicleConnectorProfile,
  VEHICLE_FIRST_HARDWARE_DAY_CHECKLIST,
} from '@/lib/vehicle/hardwareReadiness'
import { VEHICLE_BENCH_CHECKLIST } from '@/lib/vehicle/readiness'
import type { HQAssistantIntent, PreparedWorkspaceTarget } from '@/components/home/office/types'
import type { ContextLoadReport } from '@/lib/contextPolicy'
import type { ArticleReasoningIndex } from '@/lib/articleReasoning'
import type { VoiceProfile, VoiceProject } from '@/lib/voiceLab'

// ── Lessons engine types ──────────────────────────────────────────────────────
export interface Lesson {
  id:               number
  rule:             string
  /** How many times this lesson has been injected into agent prompts. */
  reinforcedCount:  number
}

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

export interface ScheduledJobEfficiencySnapshot {
  recordedAt:        number
  systemPromptChars: number
  stablePrefixChars: number
  volatilePromptChars: number
  promptChars:       number
  outputChars:       number
  toolCatalogChars:  number
  cacheability:      'high' | 'medium' | 'low'
  cacheStrategy:     'system_only' | 'system_plus_user_prefix'
  singleFlightScope: 'job' | 'shared_window'
  batchedRun:        boolean
  batchMode:         'single' | 'internal' | 'provider_native'
  batchSize:         number
  cacheObserved:     boolean
  cacheReadTokens:   number
  cacheWriteTokens:  number
  cacheHit:          boolean
}

export interface ScheduledJobRecentExecution {
  recordedAt:      number
  status:          'ok' | 'error'
  executionOrigin: 'single_run' | 'internal_batch' | 'provider_native_batch'
  summary:         string
  wroteArtifact:   boolean
  artifactTarget?: 'vault' | 'notify' | 'none' | 'telegram' | 'download' | 'review'
  cacheStrategy:   ScheduledJobEfficiencySnapshot['cacheStrategy']
  batchMode:       ScheduledJobEfficiencySnapshot['batchMode']
  cacheHit:        boolean
}

export interface ScheduledJob {
  id:            string
  name:          string
  prompt:        string
  cron:          string     // 5-field cron expression (min hour dom mon dow)
  enabled:       boolean
  lastRunAt?:    number
  lastStatus?:   'ok' | 'error' | 'queued'
  lastSummary?:  string
  pendingBatchId?: string
  pendingBatchProvider?: 'anthropic'
  pendingBatchSubmittedAt?: number
  pendingBatchSize?: number
  pendingBatchPollFailures?: number
  pendingBatchSystemPromptChars?: number
  pendingBatchStablePrefixChars?: number
  pendingBatchVolatilePromptChars?: number
  pendingBatchCacheStrategy?: ScheduledJobEfficiencySnapshot['cacheStrategy']
  // Mission-type jobs: agent runs a structured objective + saves output to Vault
  type?:         'prompt' | 'mission'
  outputTarget?: 'vault' | 'notify' | 'none' | 'telegram' | 'download' | 'review'
  missionAgent?: string                         // override agent selection
  approvalPolicy?: 'human_gate' | 'approve_on_write' | 'observe'
  templateId?:   string
  lastEfficiency?: ScheduledJobEfficiencySnapshot
  lastExecutionOrigin?: 'single_run' | 'internal_batch' | 'provider_native_batch'
  lastExecutionAt?: number
  recentExecutions?: ScheduledJobRecentExecution[]
  lastArtifactOrigin?: 'single_run' | 'internal_batch' | 'provider_native_batch'
  lastArtifactTarget?: NonNullable<ScheduledJob['outputTarget']>
  lastArtifactAt?: number
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

export type AgentRuntimeStatus = 'idle' | 'running' | 'verified' | 'degraded' | 'failed'

export interface AgentRuntimeVerification {
  required:  boolean
  attempted: boolean
  passed:    boolean
  adapters:  string[]
  details:   string[]
}

export interface AgentRuntime {
  runId:          string
  status:         AgentRuntimeStatus
  currentPhase:   OperationalPhase
  startedAt:      number
  phaseStartedAt: number
  finishedAt?:    number
  phaseDurations: Partial<Record<OperationalPhase, number>>
  failureCause?:  string
  verification:   AgentRuntimeVerification
  contextChars:   number
  contextCompacted: boolean
}

export interface AgentToolTrace {
  tool: string
  risk: 'tier0' | 'tier1' | 'tier2'
  input: string
  output?: string
}

export interface AgentEfficiencyMetrics {
  contextScope: 'full' | 'agent_scoped' | 'minimal' | 'unknown'
  systemPromptChars: number
  liveContextChars: number
  liveContextCompacted: boolean
  memoryDiffChars: number
  memoryContextChars: number
  ragChars: number
  lessonsChars: number
  toolCatalogCount: number
  toolCatalogChars: number
  toolPackId: string
  readCacheHits: number
  duplicateReadCount: number
}

export interface AgentRunArtifact {
  runId: string
  runtimeEngine: 'nexus' | 'claudeCode'
  startedAt: number
  finishedAt: number
  userMessage: string
  finalAnswer: string
  verificationSummary: string
  providerUsed?: string
  contextChars: number
  contextCompacted: boolean
  toolTraces: AgentToolTrace[]
  efficiency: AgentEfficiencyMetrics
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

export type FeedStatusKey =
  | 'prices'
  | 'articles'
  | 'cves'
  | 'threatIntel'
  | 'conflict'
  | 'polymarket'
  | 'marketRates'
  | 'cisaKev'
  | 'weather'
  | 'flights'
  | 'secFilings'

export interface FeedStatus {
  lastAttemptAt: number | null
  lastSuccessAt: number | null
  lastFailureAt: number | null
  lastError: string | null
}

export const DEFAULT_FEED_STATUS: Record<FeedStatusKey, FeedStatus> = {
  prices:       { lastAttemptAt: null, lastSuccessAt: null, lastFailureAt: null, lastError: null },
  articles:     { lastAttemptAt: null, lastSuccessAt: null, lastFailureAt: null, lastError: null },
  cves:         { lastAttemptAt: null, lastSuccessAt: null, lastFailureAt: null, lastError: null },
  threatIntel:  { lastAttemptAt: null, lastSuccessAt: null, lastFailureAt: null, lastError: null },
  conflict:     { lastAttemptAt: null, lastSuccessAt: null, lastFailureAt: null, lastError: null },
  polymarket:   { lastAttemptAt: null, lastSuccessAt: null, lastFailureAt: null, lastError: null },
  marketRates:  { lastAttemptAt: null, lastSuccessAt: null, lastFailureAt: null, lastError: null },
  cisaKev:      { lastAttemptAt: null, lastSuccessAt: null, lastFailureAt: null, lastError: null },
  weather:      { lastAttemptAt: null, lastSuccessAt: null, lastFailureAt: null, lastError: null },
  flights:      { lastAttemptAt: null, lastSuccessAt: null, lastFailureAt: null, lastError: null },
  secFilings:   { lastAttemptAt: null, lastSuccessAt: null, lastFailureAt: null, lastError: null },
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
  minimaxKey:        '',
  aiProvider:        'ollama' as PreferredAIProvider,
  localEndpoint:     'http://localhost:11434/v1/chat/completions',
  localModel:        DEFAULT_LOCAL_MODEL as string,
  localApiKey:       '',
  useLocalReasoning: true,   // Use local deepseek-r1:14b for Think mode
  deploymentLanePreference: 'dualTrack' as 'webFirst' | 'dualTrack' | 'desktopFirst',
  surfaceVisibilityPreference: 'gaOnly' as 'gaOnly' | 'includeBeta',
  // Runtime engine rollout flag: "nexus" (current) | "claudeCode" (assimilation path)
  agentRuntimeEngine: 'nexus' as 'nexus' | 'claudeCode',
  agentHighRiskWritesRequireApproval: true,
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
  // RECON / OSINT keys (BYOK — optional, free lookups work without them)
  hibpKey:       '',   // Have I Been Pwned v3
  vtKey:         '',   // VirusTotal v3
  shodanKey:     '',   // Shodan
  // Personal profile
  userName:      'Mario',
  userGoals:     '',
  userSkills:    '',
  userLearning:  '',
  userContext:   '',
  // Session memory (charliejhills background memory pattern)
  lastSessionSummary: '',   // one-line summary of last session's outcome; injected into next session's context
  // App state
  watchlist:     [] as string[],
  botHistory:    [] as unknown[],
  botAlerts:     [] as unknown[],
  customFeeds:   [] as unknown[],
  alertKeywords: '',
  doNotDisturb:  false,
  agentDebugMode: false,
  officeSceneMode: 'auto' as 'auto' | 'morning' | 'afternoon' | 'night',
  surfaceMotionProfile: 'flagship' as 'reduced' | 'standard' | 'flagship',
  officeMotion: 1,
  officeSplitHeightPx: 0,
  officeCameraPreset: 'cinematic' as 'cinematic' | 'closeOps' | 'wallReadability',
  officeOperationalMode: 'normal' as 'normal' | 'war' | 'nightOps',
  officeVfxQuality: 'low' as 'off' | 'low' | 'high',
  vehicleBenchChecklist: {} as Record<string, boolean>,
  vehicleFirstHardwareChecklist: {} as Record<string, boolean>,
  vehicleConnectorProfile: DEFAULT_VEHICLE_CONNECTOR_PROFILE,
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

function normalizeSettingsPatch(patch: Partial<Settings>): Partial<Settings> {
  const nextPatch: Partial<Settings> = { ...patch }
  if (Object.prototype.hasOwnProperty.call(nextPatch, 'aiProvider')) {
    nextPatch.aiProvider = normalizePreferredAIProvider(nextPatch.aiProvider)
  }
  if (Object.prototype.hasOwnProperty.call(nextPatch, 'vehicleBenchChecklist')) {
    nextPatch.vehicleBenchChecklist = normalizeVehicleChecklistState(
      nextPatch.vehicleBenchChecklist,
      VEHICLE_BENCH_CHECKLIST.map((item) => item.id),
    )
  }
  if (Object.prototype.hasOwnProperty.call(nextPatch, 'vehicleFirstHardwareChecklist')) {
    nextPatch.vehicleFirstHardwareChecklist = normalizeVehicleChecklistState(
      nextPatch.vehicleFirstHardwareChecklist,
      VEHICLE_FIRST_HARDWARE_DAY_CHECKLIST.map((item) => item.id),
    )
  }
  if (Object.prototype.hasOwnProperty.call(nextPatch, 'vehicleConnectorProfile')) {
    nextPatch.vehicleConnectorProfile = normalizeVehicleConnectorProfile(
      nextPatch.vehicleConnectorProfile,
    )
  }
  return nextPatch
}

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
  cat?:  string    // crypto | markets | cyber | tech | world
  tags?: string[]  // user-defined tags for vault filtering (Siftly pattern)
  index?: ArticleReasoningIndex
  archiveLinks?: VaultArchiveLink[]
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

export interface PrivacyShieldStatus {
  active: boolean
  provider?: string
  protectedKinds: string[]
  protectedCount: number
  summary: string
  updatedAt: number
}

// ── Office chat message (persisted in-session) ────────────────────────────────
export interface OfficeChatMessage {
  role:   'user' | 'agent'
  agent?: string   // AgentId
  text:   string
  // steps are NOT persisted (too large) — only shown live
}

export interface PreparedWorkspaceSession {
  href: string
  label: string
  detail: string
  intent: HQAssistantIntent
  sourceQuery: string
  preparedAt: number
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
  // Per-tab sub-tab selections (persisted)
  intelView:     'news' | 'world' | 'markets' | 'sweeps'
  marketsView:   'watchlist' | 'signals' | 'scanner' | 'sizer' | 'prices' | 'charts'
  cyberView:     'triage' | 'matrix' | 'cves' | 'otx' | 'cisa' | 'drone' | 'vuln-review'
  skillsWorkbenchView: 'forge' | 'blacksite' | 'brain' | 'library'
  resourcesWorkbenchView: 'finder' | 'manual' | 'study' | 'surfaces' | 'playbooks' | 'specs' | 'system' | 'impact' | 'registry' | 'kits' | 'voice-lab'
  securityWorkbenchView: 'doctrine' | 'physical' | 'ai'
  prices:        Record<string, PriceData>
  sparklines:    Record<string, number[]>
  articles:      Article[]
  articlesLoaded: boolean
  savedArticles: Article[]
  signals:       { fg: { value: number; label: string } | null }
  cves:          unknown[]
  cvesLoaded:    boolean
  pricesLoaded:  boolean
  otxPulses:     OTXPulse[]
  worldRisk:     number
  chatHistory:   { role: string; content: string }[]

  // Extended live data (loaded by useGlobalData hook)
  earthquakes:    GeoRecord[]
  gdeltEvents:    GeoRecord[]
  threatIntel:    ThreatIntel
  threatIntelLoaded: boolean
  weather:        WeatherData | null
  fearGreed:      FearGreedData | null
  defiData:       DefiData
  hackerNews:     GeoRecord[]
  secFilings:     GeoRecord[]
  flights:        GeoRecord[]
  securityAlerts: SecurityAlert[]
  voiceProfiles: VoiceProfile[]
  voiceProjects: VoiceProject[]
  activeVoiceProjectId: string | null
  privacyShieldStatus: PrivacyShieldStatus | null

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

  // Agent learnings — display cache (server is source of truth)
  agentLearnings: Record<string, import("@/lib/agentLearnings").LearningEntry[]>
  setAgentLearnings: (agent: string, entries: import("@/lib/agentLearnings").LearningEntry[]) => void

  // Agent runtime diagnostics (run id, phase durations, verification status)
  agentRuntime:      AgentRuntime
  beginAgentRun:     (runId: string) => void
  markAgentPhase:    (phase: OperationalPhase) => void
  finishAgentRun:    (patch: Partial<Pick<AgentRuntime, 'status' | 'failureCause' | 'verification' | 'contextChars' | 'contextCompacted'>>) => void
  agentRunHistory:    AgentRunArtifact[]
  addAgentRunArtifact:(artifact: AgentRunArtifact) => void
  contextLoadReport:  ContextLoadReport | null
  setContextLoadReport: (report: ContextLoadReport | null) => void
  switchOperatorStatus: SwitchOperatorStatus | null
  setSwitchOperatorStatus: (status: SwitchOperatorStatus | null) => void
  patchSwitchOperatorStatus: (patch: Partial<SwitchOperatorStatus>) => void

  // Office chat history (in-session, survives tab switches)
  officeMessages:      OfficeChatMessage[]
  addOfficeMessage:    (msg: OfficeChatMessage) => void
  clearOfficeMessages: () => void
  preparedWorkspace:   PreparedWorkspaceSession | null
  unfinishedSessions:  UnfinishedSessionMemory[]
  setPreparedWorkspace: (
    target: PreparedWorkspaceTarget | null,
    meta?: {
      intent: HQAssistantIntent
      sourceQuery: string
    }
  ) => void
  clearPreparedWorkspace: () => void
  rememberUnfinishedSession: (
    target: PreparedWorkspaceTarget | null,
    meta: {
      intent: HQAssistantIntent
      sourceQuery: string
      confidence?: number
      capability?: import("@/lib/assistantCapabilityRegistry").AssistantCapabilityId | null
      artifactClass?: import("@/lib/assistantSessionMemory").UnfinishedSessionArtifactClass
      continuationValue?: number
      completionState?: UnfinishedSessionCompletionState
    }
  ) => void
  touchUnfinishedSession: (
    href: string,
    completionState?: UnfinishedSessionCompletionState
  ) => void

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
  // Lessons engine
  lessons:        Lesson[]
  setLessons:     (lessons: Lesson[]) => void
  reinforceLesson:(id: number) => void

  notifications:       Notification[]
  unreadCount:         number
  addNotification:     (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markRead:            (id: string) => void
  markAllRead:         () => void
  dismissNotification: (id: string) => void
  feedStatus:          Record<FeedStatusKey, FeedStatus>
  updateFeedStatus:    (feed: FeedStatusKey, patch: Partial<FeedStatus>) => void

  // Core setters
  setTab:            (tab: string) => void
  setIntelView:      (view: NexusState['intelView']) => void
  setMarketsView:    (view: NexusState['marketsView']) => void
  setCyberView:      (view: NexusState['cyberView']) => void
  setSkillsWorkbenchView: (view: NexusState['skillsWorkbenchView']) => void
  setResourcesWorkbenchView: (view: NexusState['resourcesWorkbenchView']) => void
  setSecurityWorkbenchView: (view: NexusState['securityWorkbenchView']) => void
  setWorldRisk:      (n: number) => void
  setPrices:         (prices: Record<string, PriceData>) => void
  setSparklines:     (sparklines: Record<string, number[]>) => void
  setArticles:       (articles: Article[]) => void
  setArticlesLoaded: (loaded: boolean) => void
  setSignals:        (signals: NexusState['signals']) => void
  setCves:           (cves: unknown[]) => void
  setCvesLoaded:     (loaded: boolean) => void
  setPricesLoaded:   (loaded: boolean) => void
  setOtxPulses:      (pulses: OTXPulse[]) => void
  addChatMessage:    (msg: { role: string; content: string }) => void
  clearChat:         () => void
  toggleSaveArticle:  (article: Article) => void
  updateArticleTags:  (articleId: string, tags: string[]) => void
  updateArticleReasoningIndex: (articleId: string, index: ArticleReasoningIndex) => void
  updateArticleArchiveLinks: (articleId: string, links: VaultArchiveLink[]) => void
  confirmArticleArchiveLink: (articleId: string, targetId: string) => void

  // Extended setters
  setEarthquakes:    (data: GeoRecord[]) => void
  setGdeltEvents:    (data: GeoRecord[]) => void
  setThreatIntel:    (data: ThreatIntel) => void
  setThreatIntelLoaded: (loaded: boolean) => void
  setWeather:        (data: WeatherData | null) => void
  setFearGreed:      (data: FearGreedData) => void
  setDefiData:       (data: DefiData) => void
  setHackerNews:     (data: GeoRecord[]) => void
  setSecFilings:     (data: GeoRecord[]) => void
  setFlights:        (data: GeoRecord[]) => void
  setSecurityAlerts: (data: SecurityAlert[]) => void
  setVoiceProfiles: (profiles: VoiceProfile[]) => void
  upsertVoiceProfile: (profile: VoiceProfile) => void
  deleteVoiceProfile: (profileId: string) => void
  setVoiceProjects: (projects: VoiceProject[]) => void
  upsertVoiceProject: (project: VoiceProject) => void
  deleteVoiceProject: (projectId: string) => void
  setActiveVoiceProjectId: (projectId: string | null) => void
  setPrivacyShieldStatus: (status: PrivacyShieldStatus | null) => void

  // PM Cockpit checklist (Phase B)
  pmChecklist:           PMChecklistItem[]
  togglePMChecklistItem: (id: string) => void
  resetPMChecklist:      () => void
  toggleVehicleBenchChecklistItem: (id: string) => void
  resetVehicleBenchChecklist: () => void
  toggleVehicleFirstHardwareChecklistItem: (id: string) => void
  resetVehicleFirstHardwareChecklist: () => void

  // ── Dynamic UI rules ────────────────────────────────────────────────────────
  activeUIRuleIds:  string[]
  dismissedUIRuleKeys: string[]
  setActiveUIRuleIds: (ids: string[]) => void
  dismissUIRule:    (activationKey: string) => void
  clearDismissedRules: () => void

  // Persona engine (Block N)
  activePersona:    PersonaMode
  setPersona:       (mode: PersonaMode) => void
  councilMode:      boolean
  toggleCouncilMode: () => void
  councilResults:   CouncilResult[]
  setCouncilResults: (results: CouncilResult[]) => void
  clearCouncilResults: () => void

  // VAULT knowledge graph (Block Q)
  vaultGraph:     VaultGraphData | null
  setVaultGraph:  (g: VaultGraphData | null) => void
  vaultSynthesis: VaultSynthesis | null
  setVaultSynthesis: (s: VaultSynthesis | null) => void
  // VAULT lint (Rule 7)
  vaultLint:     VaultLintResult | null
  setVaultLint:  (r: VaultLintResult | null) => void
}

// ── PM Checklist types + defaults ─────────────────────────────────────────────
export interface PMChecklistItem {
  id:       string
  label:    string
  checked:  boolean
  category: 'daily' | 'pre-push' | 'post-incident'
}

const DEFAULT_PM_CHECKLIST: PMChecklistItem[] = [
  // Daily
  { id: 'daily-todo',     label: 'Review docs/SYSTEM_STATE.md — no stale queue drift', category: 'daily',         checked: false },
  { id: 'daily-verify',   label: 'npm run verify passes (tsc + lint)',             category: 'daily',         checked: false },
  { id: 'daily-handoff',  label: 'Handoff current (run handoff:write if needed)',  category: 'daily',         checked: false },
  // Pre-push
  { id: 'push-tsc',       label: 'npx tsc --noEmit clean',                        category: 'pre-push',      checked: false },
  { id: 'push-browser',   label: 'Tested in browser (no console errors)',          category: 'pre-push',      checked: false },
  { id: 'push-msg',       label: 'Commit message describes why, not just what',   category: 'pre-push',      checked: false },
  // Post-incident
  { id: 'post-lesson',    label: 'Rule added to docs/STANDARDS.md',               category: 'post-incident', checked: false },
  { id: 'post-repro',     label: 'Root cause confirmed (not just symptom fixed)', category: 'post-incident', checked: false },
  { id: 'post-retest',    label: 'Regression path manually retested',             category: 'post-incident', checked: false },
]

// ── Store ─────────────────────────────────────────────────────────────────────
export const useStore = create<NexusState>()(
  persist(
    (set) => ({
      // Settings
      settings:       DEFAULT_SETTINGS,
      updateSettings: (patch) =>
        set((s) => ({
          settings: {
            ...s.settings,
            ...normalizeSettingsPatch(patch),
          },
        })),

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
      tab:           'hq',
      intelView:     'news',
      marketsView:   'watchlist',
      cyberView:     'triage',
      skillsWorkbenchView: 'forge',
      resourcesWorkbenchView: 'manual',
      securityWorkbenchView: 'doctrine',
      prices:        {},
      sparklines:    {},
      articles:      [],
      articlesLoaded: false,
      savedArticles: [],
      signals:       { fg: null },
      cves:          [],
      cvesLoaded:    false,
      pricesLoaded:  false,
      otxPulses:     [],
      worldRisk:     0,
      chatHistory:   [],

      // Extended live data defaults
      earthquakes:    [],
      gdeltEvents:    [],
      threatIntel:    { threatfox: [], shodan: null },
      threatIntelLoaded: false,
      weather:        null,
      fearGreed:      null,
      defiData:       { protocols: [], stablecoins: [], yields: [] },
      hackerNews:     [],
      secFilings:     [],
      flights:        [],
      securityAlerts: [],
      voiceProfiles: [],
      voiceProjects: [],
      activeVoiceProjectId: null,
      privacyShieldStatus: null,

      // VAULT knowledge graph (Block Q) — rebuilt from savedArticles, not persisted
      vaultGraph:     null,
      vaultSynthesis: null,
      vaultLint:      null,

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

      // Agent learnings — display cache
      agentLearnings: {},
      setAgentLearnings: (agent, entries) =>
        set(s => ({ agentLearnings: { ...s.agentLearnings, [agent]: entries } })),

      // Agent runtime diagnostics
      agentRuntime: {
        runId: '',
        status: 'idle',
        currentPhase: 'idle',
        startedAt: 0,
        phaseStartedAt: 0,
        phaseDurations: {},
        verification: {
          required: false,
          attempted: false,
          passed: true,
          adapters: [],
          details: [],
        },
        contextChars: 0,
        contextCompacted: false,
      },
      beginAgentRun: (runId) =>
        set({
          agentRuntime: {
            runId,
            status: 'running',
            currentPhase: 'interpreting',
            startedAt: Date.now(),
            phaseStartedAt: Date.now(),
            phaseDurations: {},
            verification: {
              required: false,
              attempted: false,
              passed: true,
              adapters: [],
              details: [],
            },
            contextChars: 0,
            contextCompacted: false,
          },
        }),
      markAgentPhase: (phase) =>
        set((s) => {
          const rt = s.agentRuntime
          if (rt.status === 'idle' || !rt.startedAt) return { agentRuntime: { ...rt, currentPhase: phase } }
          const now = Date.now()
          const prevPhase = rt.currentPhase
          const elapsed = Math.max(0, now - (rt.phaseStartedAt || now))
          const phaseDurations = { ...rt.phaseDurations }
          if (prevPhase) {
            phaseDurations[prevPhase] = (phaseDurations[prevPhase] ?? 0) + elapsed
          }
          return {
            agentRuntime: {
              ...rt,
              currentPhase: phase,
              phaseStartedAt: now,
              phaseDurations,
            },
          }
        }),
      finishAgentRun: (patch) =>
        set((s) => ({
          agentRuntime: {
            ...s.agentRuntime,
            status: patch.status ?? s.agentRuntime.status,
            failureCause: patch.failureCause ?? s.agentRuntime.failureCause,
            verification: patch.verification ?? s.agentRuntime.verification,
            contextChars: patch.contextChars ?? s.agentRuntime.contextChars,
            contextCompacted: patch.contextCompacted ?? s.agentRuntime.contextCompacted,
            finishedAt: Date.now(),
            currentPhase: 'done',
          },
        })),
      agentRunHistory: [],
      addAgentRunArtifact: (artifact) =>
        set((s) => ({
          agentRunHistory: [artifact, ...s.agentRunHistory].slice(0, 40),
        })),
      contextLoadReport: null,
      setContextLoadReport: (contextLoadReport) => set({ contextLoadReport }),
      switchOperatorStatus: null,
      setSwitchOperatorStatus: (switchOperatorStatus) => set({ switchOperatorStatus }),
      patchSwitchOperatorStatus: (patch) =>
        set((s) => ({
          switchOperatorStatus: s.switchOperatorStatus
            ? {
                ...s.switchOperatorStatus,
                ...patch,
                updatedAt: Date.now(),
              }
            : patch.mode
              ? {
                  mode: patch.mode,
                  requestedAt:
                    typeof patch.requestedAt === 'number'
                      ? patch.requestedAt
                      : Date.now(),
                  updatedAt: Date.now(),
                  readinessSummary: patch.readinessSummary ?? '',
                  taskLabel: patch.taskLabel,
                  taskId: patch.taskId,
                  selectedLane: patch.selectedLane,
                  selectedHref: patch.selectedHref,
                  selectedAgent: patch.selectedAgent,
                  providerUsed: patch.providerUsed,
                  nextStep: patch.nextStep,
                  detail: patch.detail,
                }
              : null,
        })),

      // Office chat history
      officeMessages:      [],
      addOfficeMessage:    (msg) =>
        set((s) => ({
          officeMessages: [...s.officeMessages, msg].slice(-100),
        })),
      clearOfficeMessages: () => set({ officeMessages: [] }),
      preparedWorkspace: null,
      unfinishedSessions: [],
      setPreparedWorkspace: (target, meta) =>
        set(() => {
          const normalized = normalizePreparedWorkspaceTarget(target)
          if (!normalized || !meta?.sourceQuery) {
            return { preparedWorkspace: null }
          }
          return {
            preparedWorkspace: {
              ...normalized,
              intent: meta.intent,
              sourceQuery: meta.sourceQuery,
              preparedAt: Date.now(),
            },
          }
        }),
      clearPreparedWorkspace: () => set({ preparedWorkspace: null }),
      rememberUnfinishedSession: (target, meta) =>
        set((s) => ({
          unfinishedSessions: rememberUnfinishedSession(
            s.unfinishedSessions,
            target,
            meta,
          ),
        })),
      touchUnfinishedSession: (href, completionState = 'active') =>
        set((s) => ({
          unfinishedSessions: touchUnfinishedSession(
            s.unfinishedSessions,
            href,
            completionState,
          ),
        })),

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

      // Lessons engine defaults
      lessons: [],
      setLessons: (lessons) => set({ lessons }),
      reinforceLesson: (id) =>
        set((s) => ({
          lessons: s.lessons.map((l) =>
            l.id === id ? { ...l, reinforcedCount: l.reinforcedCount + 1 } : l
          ),
        })),

      // Notifications defaults
      notifications: [],
      unreadCount:   0,
      feedStatus:    { ...DEFAULT_FEED_STATUS },

      // Core setters
      setTab:        (tab)        => set({ tab }),
      setIntelView:   (intelView) => set({ intelView }),
      setMarketsView: (marketsView) => set({ marketsView }),
      setCyberView:   (cyberView) => set({ cyberView }),
      setSkillsWorkbenchView: (skillsWorkbenchView) => set({ skillsWorkbenchView }),
      setResourcesWorkbenchView: (resourcesWorkbenchView) => set({ resourcesWorkbenchView }),
      setSecurityWorkbenchView: (securityWorkbenchView) => set({ securityWorkbenchView }),
      setWorldRisk:  (worldRisk)  => set({ worldRisk }),
      setPrices:     (prices)     => set({ prices }),
      setPricesLoaded: (pricesLoaded) => set({ pricesLoaded }),
      setSparklines: (sparklines) => set({ sparklines }),
      setArticles:   (articles)   => set({ articles }),
      setArticlesLoaded: (articlesLoaded) => set({ articlesLoaded }),
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
      updateArticleTags: (articleId, tags) =>
        set((s) => ({
          savedArticles: s.savedArticles.map((a) =>
            a.id === articleId ? { ...a, tags } : a,
          ),
        })),
      updateArticleReasoningIndex: (articleId, index) =>
        set((s) => ({
          savedArticles: s.savedArticles.map((a) =>
            a.id === articleId ? { ...a, index } : a,
          ),
        })),
      updateArticleArchiveLinks: (articleId, links) =>
        set((s) => ({
          savedArticles: s.savedArticles.map((a) =>
            a.id === articleId ? { ...a, archiveLinks: links } : a,
          ),
        })),
      confirmArticleArchiveLink: (articleId, targetId) =>
        set((s) => ({
          savedArticles: s.savedArticles.map((article) =>
            article.id !== articleId
              ? article
              : {
                  ...article,
                  archiveLinks: (article.archiveLinks ?? []).map((link) =>
                    link.targetId === targetId
                      ? { ...link, state: "confirmed" }
                      : link,
                  ),
                },
          ),
        })),

      // Extended setters
      setEarthquakes:    (earthquakes)    => set({ earthquakes }),
      setGdeltEvents:    (gdeltEvents)    => set({ gdeltEvents }),
      setThreatIntel:    (threatIntel)    => set({ threatIntel }),
      setThreatIntelLoaded: (threatIntelLoaded) => set({ threatIntelLoaded }),
      setWeather:        (weather)        => set({ weather }),
      setFearGreed:      (fearGreed)      => set({ fearGreed }),
      setDefiData:       (defiData)       => set({ defiData }),
      setHackerNews:     (hackerNews)     => set({ hackerNews }),
      setSecFilings:     (secFilings)     => set({ secFilings }),
      setFlights:        (flights)        => set({ flights }),
      setSecurityAlerts: (securityAlerts) => set({ securityAlerts }),
      setVoiceProfiles: (voiceProfiles) => set({ voiceProfiles }),
      upsertVoiceProfile: (profile) =>
        set((s) => ({
          voiceProfiles: [
            profile,
            ...s.voiceProfiles.filter((entry) => entry.id !== profile.id),
          ].slice(0, 32),
        })),
      deleteVoiceProfile: (profileId) =>
        set((s) => ({
          voiceProfiles: s.voiceProfiles.filter((entry) => entry.id !== profileId),
        })),
      setVoiceProjects: (voiceProjects) => set({ voiceProjects }),
      upsertVoiceProject: (project) =>
        set((s) => ({
          voiceProjects: [
            project,
            ...s.voiceProjects.filter((entry) => entry.id !== project.id),
          ]
            .sort((left, right) => right.updatedAt - left.updatedAt)
            .slice(0, 64),
          activeVoiceProjectId: project.id,
        })),
      deleteVoiceProject: (projectId) =>
        set((s) => ({
          voiceProjects: s.voiceProjects.filter((entry) => entry.id !== projectId),
          activeVoiceProjectId:
            s.activeVoiceProjectId === projectId ? null : s.activeVoiceProjectId,
        })),
      setActiveVoiceProjectId: (activeVoiceProjectId) => set({ activeVoiceProjectId }),
      setPrivacyShieldStatus: (privacyShieldStatus) => set({ privacyShieldStatus }),

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
      updateFeedStatus: (feed, patch) =>
        set((s) => ({
          feedStatus: {
            ...s.feedStatus,
            [feed]: {
              ...s.feedStatus[feed],
              ...patch,
            },
          },
        })),

      // PM Checklist
      pmChecklist: DEFAULT_PM_CHECKLIST,
      togglePMChecklistItem: (id) =>
        set((s) => ({
          pmChecklist: s.pmChecklist.map((item) =>
            item.id === id ? { ...item, checked: !item.checked } : item
          ),
        })),
      resetPMChecklist: () =>
        set((s) => ({
          pmChecklist: s.pmChecklist.map((item) => ({ ...item, checked: false })),
        })),
      toggleVehicleBenchChecklistItem: (id) =>
        set((s) => ({
          settings: {
            ...s.settings,
            vehicleBenchChecklist: {
              ...(s.settings.vehicleBenchChecklist ?? {}),
              [id]: !(s.settings.vehicleBenchChecklist?.[id] ?? false),
            },
          },
        })),
      resetVehicleBenchChecklist: () =>
        set((s) => ({
          settings: {
            ...s.settings,
            vehicleBenchChecklist: {},
          },
        })),
      toggleVehicleFirstHardwareChecklistItem: (id) =>
        set((s) => ({
          settings: {
            ...s.settings,
            vehicleFirstHardwareChecklist: {
              ...(s.settings.vehicleFirstHardwareChecklist ?? {}),
              [id]: !(s.settings.vehicleFirstHardwareChecklist?.[id] ?? false),
            },
          },
        })),
      resetVehicleFirstHardwareChecklist: () =>
        set((s) => ({
          settings: {
            ...s.settings,
            vehicleFirstHardwareChecklist: {},
          },
        })),

      // Dynamic UI rules
      activeUIRuleIds:  [],
      dismissedUIRuleKeys: [],
      setActiveUIRuleIds: (ids) => set({ activeUIRuleIds: ids }),
      dismissUIRule: (activationKey) => set((s) => ({
        dismissedUIRuleKeys: Array.from(
          new Set([...s.dismissedUIRuleKeys, activationKey]),
        ).slice(-40),
      })),
      clearDismissedRules: () => set({ dismissedUIRuleKeys: [] }),

      // Persona engine (Block N)
      activePersona:   'formal',
      setPersona:      (mode) => set({ activePersona: mode }),
      councilMode:     false,
      toggleCouncilMode: () =>
        set((s) => ({
          councilMode: !s.councilMode,
          councilResults: s.councilMode ? [] : s.councilResults,
        })),
      councilResults:  [],
      setCouncilResults: (results) => set({ councilResults: results }),
      clearCouncilResults: () => set({ councilResults: [] }),

      // VAULT knowledge graph (Block Q)
      setVaultGraph:     (g) => set({ vaultGraph: g }),
      setVaultSynthesis: (s) => set({ vaultSynthesis: s }),
      setVaultLint:      (r) => set({ vaultLint: r }),
    }),
    {
      name:       'nexus-settings',
      version:    1,
      partialize: (s) => ({
        settings:      sanitizeClientSettingsForPersistence(s.settings),
        savedArticles: s.savedArticles,
        pendingDrafts: s.pendingDrafts,
        aiMode:        s.aiMode,
        officeLayout:  s.officeLayout,
        intelView:     s.intelView,
        marketsView:   s.marketsView,
        cyberView:     s.cyberView,
        skillsWorkbenchView: s.skillsWorkbenchView,
        resourcesWorkbenchView: s.resourcesWorkbenchView,
        securityWorkbenchView: s.securityWorkbenchView,
        voiceProfiles: s.voiceProfiles,
        voiceProjects: s.voiceProjects,
        activeVoiceProjectId: s.activeVoiceProjectId,
        preparedWorkspace: s.preparedWorkspace,
        unfinishedSessions: s.unfinishedSessions,
        dismissedUIRuleKeys: s.dismissedUIRuleKeys,
        activePersona:   s.activePersona,
      }),
      migrate: (persisted: any) => {
        // Ensure new persisted keys have safe defaults.
        const next = { ...(persisted ?? {}) }
        next.settings = sanitizeClientSettingsForPersistence({
          ...DEFAULT_SETTINGS,
          ...(next.settings ?? {}),
        })
        next.settings.aiProvider = normalizePreferredAIProvider(
          next.settings.aiProvider,
        )
        if (!next.intelView) next.intelView = 'news'
        if (!next.marketsView) next.marketsView = 'watchlist'
        if (!next.cyberView) next.cyberView = 'triage'
        if (!next.skillsWorkbenchView) next.skillsWorkbenchView = 'forge'
        if (!next.resourcesWorkbenchView) next.resourcesWorkbenchView = 'manual'
        if (!next.securityWorkbenchView) next.securityWorkbenchView = 'doctrine'
        if (!Array.isArray(next.voiceProfiles)) next.voiceProfiles = []
        if (!Array.isArray(next.voiceProjects)) next.voiceProjects = []
        if (!next.activeVoiceProjectId) next.activeVoiceProjectId = null
        if (next.preparedWorkspace) {
          const normalizedPrepared = normalizePreparedWorkspaceTarget(next.preparedWorkspace)
          next.preparedWorkspace = normalizedPrepared
            ? {
                ...next.preparedWorkspace,
                ...normalizedPrepared,
                preparedAt:
                  typeof next.preparedWorkspace.preparedAt === 'number'
                    ? next.preparedWorkspace.preparedAt
                    : Date.now(),
                intent: next.preparedWorkspace.intent ?? 'conversation',
                sourceQuery: next.preparedWorkspace.sourceQuery ?? '',
              }
            : null
        }
        next.unfinishedSessions = pruneUnfinishedSessions(next.unfinishedSessions)
        next.dismissedUIRuleKeys = Array.isArray(next.dismissedUIRuleKeys)
          ? next.dismissedUIRuleKeys
          : Array.isArray(next.dismissedRuleIds)
            ? next.dismissedRuleIds
            : []
        return next
      },
    }
  )
)
