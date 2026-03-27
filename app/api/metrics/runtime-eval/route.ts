import { NextResponse } from 'next/server'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'

type EvalReport = {
  ts: string
  score: number
  minScore?: number
  ok?: boolean
  checks?: { name?: string; pass?: boolean; category?: string }[]
  categoryThresholds?: Record<string, number>
  categories?: Record<string, { score?: number }>
}

type RunnerState = {
  lastRunAt?: string
  lastOk?: boolean
  lastSummary?: string
  cooldownMin?: number
  effectiveCooldownMin?: number
  nextEligibleAt?: string
  failureStreak?: number
}

const ROOT = process.cwd()
const METRICS_DIR = join(ROOT, 'docs', 'metrics')
const LATEST_FILE = join(METRICS_DIR, 'agent-runtime-latest.json')
const HISTORY_FILE = join(METRICS_DIR, 'agent-runtime-history.jsonl')
const RUNNER_STATE_FILE = join(METRICS_DIR, 'agent-runtime-runner.json')

function ensureMetricsDir() {
  if (!existsSync(METRICS_DIR)) mkdirSync(METRICS_DIR, { recursive: true })
}

function readLatest(): EvalReport | null {
  if (!existsSync(LATEST_FILE)) return null
  try {
    const raw = readFileSync(LATEST_FILE, 'utf-8')
    return JSON.parse(raw) as EvalReport
  } catch {
    return null
  }
}

function readHistory(limit: number): EvalReport[] {
  if (!existsSync(HISTORY_FILE)) return []
  try {
    const lines = readFileSync(HISTORY_FILE, 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    const parsed = lines
      .slice(-Math.max(1, Math.min(200, limit)))
      .map((l) => {
        try {
          return JSON.parse(l) as EvalReport
        } catch {
          return null
        }
      })
      .filter((x): x is EvalReport => Boolean(x))
    return parsed
  } catch {
    return []
  }
}

function readRunnerState(): RunnerState {
  if (!existsSync(RUNNER_STATE_FILE)) return {}
  try {
    return JSON.parse(readFileSync(RUNNER_STATE_FILE, 'utf-8')) as RunnerState
  } catch {
    return {}
  }
}

export async function GET(req: Request) {
  ensureMetricsDir()
  const u = new URL(req.url)
  const limit = Math.max(5, Math.min(120, Number(u.searchParams.get('limit') ?? 30)))
  const latest = readLatest()
  const history = readHistory(limit)
  const runner = readRunnerState()
  const freshnessWindowMin = Math.max(5, Math.min(24 * 60, Number(u.searchParams.get('freshnessMin') ?? 240)))
  const ageMinutes = latest?.ts
    ? Math.max(0, Math.round((Date.now() - new Date(latest.ts).getTime()) / 60000))
    : null
  const failedChecks = (latest?.checks ?? [])
    .filter((c) => c?.pass === false)
    .map((c) => ({
      name: c.name ?? 'unknown',
      category: c.category ?? 'unknown',
    }))
  const categoryFailures = Object.entries(latest?.categories ?? {})
    .filter(([name, v]) => {
      const threshold = latest?.categoryThresholds?.[name]
      return typeof threshold === 'number' && Number(v?.score ?? 0) < threshold
    })
    .map(([name, v]) => ({
      name,
      score: Number(v?.score ?? 0),
      threshold: latest?.categoryThresholds?.[name] ?? null,
    }))
  return NextResponse.json({
    status: 'ok',
    latest,
    history,
    points: history.length,
    freshness: {
      freshnessWindowMin,
      ageMinutes,
      stale: ageMinutes === null ? true : ageMinutes > freshnessWindowMin,
    },
    failures: {
      checks: failedChecks,
      categories: categoryFailures,
    },
    runner,
  })
}
