// ── lib/skillCycle.ts ─────────────────────────────────────────────────────────
// NEXUS PRIME — Self-Learning Skill Cycle: Observe / Inspect / Amend / Evaluate
//
// Implements the cognee-inspired self-improvement loop, adapted for browser +
// Ollama. No native modules — uses Zustand + localStorage for persistence.
//
// Usage:
//   import { observeSkill, inspectSkill, amendifySkill, evaluateAmendment,
//            annotateSkill, routeTask } from '@/lib/skillCycle'

'use client'

import type { Skill, LearningEvent, AmendmentRecord } from '@/lib/skillEngine'
import { calculateSkillLevel } from '@/lib/skillEngine'
import { generateWithFallback } from '@/lib/ollama'

// ── Storage keys ──────────────────────────────────────────────────────────────
const LS_LEARNING_LOG   = 'nexus:learningLog'
const LS_AMENDMENTS     = 'nexus:amendments'
const LS_INSPECTION_Q   = 'nexus:inspectionQueue'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Outcome = 'success' | 'failure' | 'partial'

export interface ObserveInput {
  skillId:   string
  taskInput: string
  outcome:   Outcome
  errorMsg?: string
  feedback?: -1 | 0 | 1   // user feedback: thumbs down / neutral / thumbs up
  xpGained?: number
}

export interface InspectionResult {
  root_cause:     string
  pattern:        string
  recommendation: string
  urgency:        'high' | 'medium' | 'low'
}

export interface RouteResult {
  skillId:   string
  skillName: string
  score:     number
  matchedBy: 'name' | 'tags' | 'description' | 'triggerPhrases' | 'combined'
}

export interface EvaluationResult {
  improved:    boolean
  metricDelta: number
  action:      'commit' | 'rollback'
}

// ── Skill update callback — set by the store integrator ──────────────────────
// The caller (e.g., app/page.tsx or agent.ts) provides this so skillCycle
// can mutate skills without importing the Zustand store directly (avoids
// circular deps and SSR issues).

type SkillUpdater = (skillId: string, updates: Partial<Skill>) => void
type SkillGetter  = (skillId: string) => Skill | undefined
type SkillsGetter = () => Skill[]

let _updateSkill: SkillUpdater = () => {}
let _getSkill:    SkillGetter  = () => undefined
let _getSkills:   SkillsGetter = () => []

export function configureSkillCycle(opts: {
  updateSkill: SkillUpdater
  getSkill:    SkillGetter
  getSkills:   SkillsGetter
}): void {
  _updateSkill = opts.updateSkill
  _getSkill    = opts.getSkill
  _getSkills   = opts.getSkills
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function lsSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or unavailable — degrade silently
  }
}

// ── Learning Log ──────────────────────────────────────────────────────────────

function getLearningLog(): LearningEvent[] {
  return lsGet<LearningEvent[]>(LS_LEARNING_LOG, [])
}

function appendLearningEvent(evt: LearningEvent): void {
  const log = getLearningLog()
  log.push(evt)
  // cap at 2000 events to prevent unbounded growth
  if (log.length > 2000) log.splice(0, log.length - 2000)
  lsSet(LS_LEARNING_LOG, log)
}

// ── Inspection queue ──────────────────────────────────────────────────────────

function getInspectionQueue(): string[] {
  return lsGet<string[]>(LS_INSPECTION_Q, [])
}

function queueForInspection(skillId: string): void {
  const q = getInspectionQueue()
  if (!q.includes(skillId)) {
    q.push(skillId)
    lsSet(LS_INSPECTION_Q, q)
  }
}

function dequeueInspection(skillId: string): void {
  const q = getInspectionQueue()
  const idx = q.indexOf(skillId)
  if (idx !== -1) {
    q.splice(idx, 1)
    lsSet(LS_INSPECTION_Q, q)
  }
}

// ── Amendments store ──────────────────────────────────────────────────────────

function getAllAmendments(): AmendmentRecord[] {
  return lsGet<AmendmentRecord[]>(LS_AMENDMENTS, [])
}

function saveAmendment(amendment: AmendmentRecord): void {
  const all = getAllAmendments()
  const idx = all.findIndex(a => a.id === amendment.id)
  if (idx !== -1) {
    all[idx] = amendment
  } else {
    all.push(amendment)
  }
  lsSet(LS_AMENDMENTS, all)
}

function getAmendment(amendmentId: string): AmendmentRecord | undefined {
  return getAllAmendments().find(a => a.id === amendmentId)
}

function bumpVersion(v: string): string {
  const parts = v.split('.')
  const major = parseInt(parts[0] ?? '1', 10)
  const minor = parseInt(parts[1] ?? '0', 10)
  return `${major}.${minor + 1}`
}

// ── XP calculation ────────────────────────────────────────────────────────────

function calcXpGained(outcome: Outcome, feedback: number): number {
  const base   = outcome === 'success' ? 50 : outcome === 'partial' ? 20 : 0
  const bonus  = feedback === 1 ? 20 : feedback === -1 ? -10 : 0
  return Math.max(0, base + bonus)
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK 1.1: observeSkill
// Records a learning event and updates skill metrics.
// ─────────────────────────────────────────────────────────────────────────────

export function observeSkill(input: ObserveInput): LearningEvent {
  const {
    skillId, taskInput, outcome, errorMsg, feedback = 0,
  } = input
  const xpGained  = input.xpGained ?? calcXpGained(outcome, feedback)
  const eventId   = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const skill     = _getSkill(skillId)

  const eventTypeMap: Record<Outcome, LearningEvent['type']> = {
    success: 'improved',
    failure: 'error_learned',
    partial: 'pattern_detected',
  }

  const evt: LearningEvent = {
    id:          eventId,
    skillId,
    skillName:   skill?.name ?? skillId,
    type:        eventTypeMap[outcome],
    description: `${outcome.toUpperCase()}: ${taskInput.slice(0, 120)}${errorMsg ? ` — ${errorMsg.slice(0, 80)}` : ''}`,
    timestamp:   Date.now(),
    xpGained,
  }

  // Persist event
  appendLearningEvent(evt)

  // Update skill metrics in Zustand store
  if (skill) {
    const newTotalRuns    = (skill.totalRuns ?? 0) + 1
    const newFailureCount = (skill.failureCount ?? 0) + (outcome === 'failure' ? 1 : 0)
    const successCount    = newTotalRuns - newFailureCount
    const newSuccessRate  = newTotalRuns > 0 ? successCount / newTotalRuns : 0
    const newXp           = skill.experience + xpGained
    const newLevel        = calculateSkillLevel(newXp)

    _updateSkill(skillId, {
      experience:   newXp,
      level:        newLevel,
      lastUsed:     Date.now(),
      totalRuns:    newTotalRuns,
      failureCount: newFailureCount,
      successRate:  parseFloat(newSuccessRate.toFixed(4)),
      improvements: outcome !== 'failure' && xpGained > 0
        ? [...(skill.improvements ?? []), evt.description.slice(0, 80)]
        : skill.improvements,
    })

    // Check inspection threshold: 5+ failures in last 20 runs
    const log        = getLearningLog()
    const recent20   = log
      .filter(e => e.skillId === skillId)
      .slice(-20)
    const failCount  = recent20.filter(e => e.type === 'error_learned').length
    if (failCount >= 5) {
      queueForInspection(skillId)
    }
  }

  return evt
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK 1.2: inspectSkill (async, uses Ollama)
// Analyzes failure history and returns root cause analysis.
// ─────────────────────────────────────────────────────────────────────────────

export async function inspectSkill(skillId: string): Promise<InspectionResult> {
  const skill    = _getSkill(skillId)
  const log      = getLearningLog()
  const failures = log
    .filter(e => e.skillId === skillId && e.type === 'error_learned')
    .slice(-20)

  // Rule-based heuristics (fallback and fast path)
  function heuristicAnalysis(): InspectionResult {
    const errorMessages = failures.map(f => f.description)
    const freq: Record<string, number> = {}
    for (const msg of errorMessages) {
      const words = msg.toLowerCase().split(/\W+/).filter(w => w.length > 4)
      for (const w of words) freq[w] = (freq[w] ?? 0) + 1
    }
    const topWord = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]
    const pattern = topWord ? `Recurring token: "${topWord[0]}" (${topWord[1]} occurrences)` : 'Diverse failure types'
    const urgency  = failures.length >= 10 ? 'high' : failures.length >= 5 ? 'medium' : 'low'
    return {
      root_cause:     `High failure rate detected for ${skill?.name ?? skillId} (${failures.length} recent failures)`,
      pattern,
      recommendation: `Review skill description and add more specific error handling for the "${topWord?.[0] ?? 'identified'}" pattern`,
      urgency,
    }
  }

  // Try Ollama for deeper analysis
  try {
    const prompt = `You are analyzing a failing AI agent skill. Identify the root cause pattern.

SKILL: ${skill?.name ?? skillId}
CATEGORY: ${skill?.category ?? 'Unknown'}
CURRENT DESCRIPTION: ${skill?.abstract ?? skill?.description ?? 'No description'}
CURRENT OVERVIEW: ${skill?.overview ?? 'No overview'}
SUCCESS RATE: ${((skill?.successRate ?? 0) * 100).toFixed(1)}%
TOTAL RUNS: ${skill?.totalRuns ?? 0}

RECENT FAILURES (${failures.length}):
${failures.map((f, i) => `${i + 1}. ${f.description.slice(0, 200)}`).join('\n')}

Respond with a JSON object only, no markdown:
{
  "root_cause": "Brief description of the root cause (1-2 sentences)",
  "pattern": "What recurring factor causes failure",
  "recommendation": "Specific, actionable change to make to the skill instructions",
  "urgency": "high|medium|low"
}`

    const response = await generateWithFallback(
      [{ role: 'user', content: prompt }],
      { taskType: 'analysis', maxTokens: 512 }
    )

    // Strip markdown fences if present
    const cleaned = response.replace(/```(?:json)?\n?/g, '').trim()
    const parsed  = JSON.parse(cleaned) as InspectionResult

    // Validate required fields
    if (parsed.root_cause && parsed.recommendation) {
      dequeueInspection(skillId)
      return parsed
    }
    return heuristicAnalysis()
  } catch {
    // Ollama unavailable or JSON parse failed — use heuristics
    return heuristicAnalysis()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK 1.3: amendifySkill (async, uses Ollama)
// Proposes an amendment to the skill's description/instructions.
// ─────────────────────────────────────────────────────────────────────────────

export async function amendifySkill(
  skillId:    string,
  inspection: InspectionResult
): Promise<string> {
  const skill = _getSkill(skillId)
  if (!skill) throw new Error(`Skill ${skillId} not found`)

  const amendmentId = `amend-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const newVersion  = bumpVersion(skill.version ?? '1.0')

  // Build proposed description via Ollama
  let amendedDesc = skill.description

  try {
    const amendPrompt = `You are amending an AI agent skill based on failure analysis.

SKILL: ${skill.name}
CATEGORY: ${skill.category}
ROOT CAUSE: ${inspection.root_cause}
PATTERN: ${inspection.pattern}
RECOMMENDATION: ${inspection.recommendation}

CURRENT DESCRIPTION:
${skill.description}

CURRENT OVERVIEW:
${skill.overview ?? 'No overview'}

Produce an AMENDED description (2-4 sentences) that:
1. Incorporates the recommendation: ${inspection.recommendation}
2. Preserves all existing correct behavior
3. Adds clear guidance to prevent the identified failure pattern
4. Is concise and actionable

Return ONLY the amended description text, no JSON, no markdown.`

    const response = await generateWithFallback(
      [{ role: 'user', content: amendPrompt }],
      { taskType: 'analysis', maxTokens: 256 }
    )
    if (response.trim().length > 10) {
      amendedDesc = response.trim()
    }
  } catch {
    // Ollama unavailable — create a rule-based amendment
    amendedDesc = `${skill.description} [Amended v${newVersion}]: ${inspection.recommendation}`
  }

  const amendment: AmendmentRecord = {
    id:           amendmentId,
    version:      newVersion,
    rationale:    `${inspection.root_cause}: ${inspection.recommendation}`,
    originalDesc: skill.description,
    amendedDesc,
    status:       'proposed',
    proposedAt:   Date.now(),
  }

  // Store amendment in localStorage
  saveAmendment(amendment)

  // Update the skill's amendments array in Zustand store
  _updateSkill(skillId, {
    amendments: [...(skill.amendments ?? []), amendment],
  })

  return amendmentId
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK 1.4: evaluateAmendment
// Compares success_rate before/after amendment — commits or rolls back.
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateAmendment(amendmentId: string): EvaluationResult {
  const amendment = getAmendment(amendmentId)
  if (!amendment) throw new Error(`Amendment ${amendmentId} not found`)

  // Find the skill and get its current successRate
  const skill = (() => {
    const all = _getSkills()
    return all.find(s => (s.amendments ?? []).some(a => a.id === amendmentId))
  })()

  if (!skill) throw new Error(`Skill for amendment ${amendmentId} not found`)

  // Estimate pre-amendment success rate from events before the amendment was proposed
  const log        = getLearningLog()
  const preEvents  = log.filter(
    e => e.skillId === skill.id && e.timestamp < amendment.proposedAt
  ).slice(-50)
  const preSuccess = preEvents.filter(e => e.type === 'improved' || e.type === 'pattern_detected').length
  const preRate    = preEvents.length > 0 ? preSuccess / preEvents.length : (skill.successRate ?? 0.5)
  const postRate   = skill.successRate ?? 0
  const delta      = postRate - preRate
  const improved   = delta > 0.05   // require 5%+ improvement

  const updatedAmendment: AmendmentRecord = {
    ...amendment,
    status:      improved ? 'committed' : 'rolled_back',
    evaluatedAt: Date.now(),
    metricDelta: parseFloat(delta.toFixed(4)),
  }

  saveAmendment(updatedAmendment)

  // Update amendment in skill's amendments array
  _updateSkill(skill.id, {
    amendments: (skill.amendments ?? []).map(a =>
      a.id === amendmentId ? updatedAmendment : a
    ),
    // If rolled back, restore original description
    ...(improved ? {} : { description: amendment.originalDesc }),
  })

  // Log evaluation result
  const evt: LearningEvent = {
    id:        `evt-${Date.now()}-eval`,
    skillId:   skill.id,
    skillName: skill.name,
    type:      improved ? 'improved' : 'error_learned',
    description: improved
      ? `Amendment ${amendmentId} committed — success rate +${(delta * 100).toFixed(1)}%`
      : `Amendment ${amendmentId} rolled back — delta ${(delta * 100).toFixed(1)}% below 5% threshold`,
    timestamp: Date.now(),
    xpGained:  improved ? 100 : 0,
  }
  appendLearningEvent(evt)

  return { improved, metricDelta: delta, action: improved ? 'commit' : 'rollback' }
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK 1.5: annotateSkill
// Appends an annotation to the skill's improvements array.
// ─────────────────────────────────────────────────────────────────────────────

export function annotateSkill(
  skillId:    string,
  annotation: string,
  source:     'agent' | 'user' = 'agent'
): void {
  const skill = _getSkill(skillId)
  if (!skill) return

  const timestamp     = new Date().toISOString().split('T')[0]
  const annotationStr = `[${timestamp}] ${source.toUpperCase()}: ${annotation}`

  _updateSkill(skillId, {
    improvements: [...(skill.improvements ?? []), annotationStr],
  })

  const evt: LearningEvent = {
    id:          `evt-${Date.now()}-ann`,
    skillId,
    skillName:   skill.name,
    type:        'improved',
    description: `Annotation added: ${annotation.slice(0, 100)}`,
    timestamp:   Date.now(),
    xpGained:    5,
  }
  appendLearningEvent(evt)
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK 1.6: routeTask — fast, no LLM
// Searches skills by name, category, description, tags using string matching.
// Weights by skill level, success_rate, and recency.
// ─────────────────────────────────────────────────────────────────────────────

export function routeTask(taskDescription: string, topK: number = 5): RouteResult[] {
  const skills   = _getSkills()
  const query    = taskDescription.toLowerCase()
  const tokens   = query.split(/\W+/).filter(t => t.length > 2)
  const now      = Date.now()
  const ONE_DAY  = 86400000

  const scored: RouteResult[] = skills.map(skill => {
    let score = 0
    let matchedBy: RouteResult['matchedBy'] = 'combined'

    // Name match (highest weight)
    const nameLower = skill.name.toLowerCase()
    if (nameLower.includes(query))         { score += 50; matchedBy = 'name' }
    else if (query.includes(nameLower))    { score += 40; matchedBy = 'name' }
    else if (tokens.some(t => nameLower.includes(t))) { score += 25; matchedBy = 'name' }

    // Trigger phrases (high weight)
    const triggerMatches = (skill.triggerPhrases ?? []).filter(tp => {
      const tp2 = tp.toLowerCase()
      return query.includes(tp2) || tp2.includes(query) || tokens.some(t => tp2.includes(t))
    }).length
    if (triggerMatches > 0) { score += triggerMatches * 20; matchedBy = 'triggerPhrases' }

    // Tags (medium weight)
    const tagMatches = (skill.tags ?? []).filter(tag =>
      tokens.some(t => tag.toLowerCase().includes(t) || t.includes(tag.toLowerCase()))
    ).length
    if (tagMatches > 0) { score += tagMatches * 10; matchedBy = 'tags' }

    // Category match
    const catLower = skill.category.toLowerCase()
    if (tokens.some(t => catLower.includes(t))) score += 8

    // Description / overview match
    const descLower = (skill.description + ' ' + (skill.overview ?? '') + ' ' + (skill.abstract ?? '')).toLowerCase()
    const descMatches = tokens.filter(t => descLower.includes(t)).length
    if (descMatches > 0) { score += descMatches * 3; if (score < 30) matchedBy = 'description' }

    // Recency bonus (skills used recently get a small boost)
    const hoursAgo = (now - (skill.lastUsed ?? 0)) / 3600000
    const recencyBonus = Math.max(0, 5 - hoursAgo / 24) // fades over 24h

    // Level and success_rate quality multiplier
    const qualityMultiplier = 1 + (skill.level / 200) + ((skill.successRate ?? 0.5) / 10)

    const finalScore = (score + recencyBonus) * qualityMultiplier

    return {
      skillId:   skill.id,
      skillName: skill.name,
      score:     parseFloat(finalScore.toFixed(4)),
      matchedBy,
    }
  })

  return scored
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

// ── Utility: get learning log for external consumers ─────────────────────────

export function getLearningHistory(
  skillId?: string,
  limit:    number = 50
): LearningEvent[] {
  const log = getLearningLog()
  const filtered = skillId ? log.filter(e => e.skillId === skillId) : log
  return filtered.slice(-limit).reverse()
}

export function getInspectionQueueSnapshot(): string[] {
  return getInspectionQueue()
}

export function getAmendmentsForSkill(skillId: string): AmendmentRecord[] {
  return getAllAmendments().filter(a => {
    const skill = _getSkill(skillId)
    return (skill?.amendments ?? []).some(sa => sa.id === a.id)
  })
}

// ── Default export ────────────────────────────────────────────────────────────

const skillCycleExports = {
  configureSkillCycle,
  observeSkill,
  inspectSkill,
  amendifySkill,
  evaluateAmendment,
  annotateSkill,
  routeTask,
  getLearningHistory,
  getInspectionQueueSnapshot,
  getAmendmentsForSkill,
}

export default skillCycleExports
