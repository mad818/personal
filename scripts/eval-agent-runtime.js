#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

const ROOT = process.cwd()
const HISTORY_DIR = path.join(ROOT, 'docs', 'metrics')
const LATEST_FILE = path.join(HISTORY_DIR, 'agent-runtime-latest.json')
const HISTORY_FILE = path.join(HISTORY_DIR, 'agent-runtime-history.jsonl')

function read(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), 'utf-8')
  } catch {
    return ''
  }
}

function readJson(rel) {
  try {
    const raw = read(rel)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function check(name, pass, detail, category, weight = 1) {
  return { name, pass, detail, category, weight }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const has = (flag) => args.includes(flag)
  const readFlag = (flag, fallback) => {
    const idx = args.indexOf(flag)
    if (idx === -1) return fallback
    const v = Number(args[idx + 1])
    return Number.isFinite(v) ? v : fallback
  }
  const minCategory = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== '--min-category') continue
    const raw = args[i + 1] || ''
    const [name, scoreRaw] = raw.split('=')
    const score = Number(scoreRaw)
    if (!name || !Number.isFinite(score)) continue
    minCategory[name.trim().toLowerCase()] = Math.max(0, Math.min(100, score))
  }
  return {
    minScore: readFlag('--min-score', 100),
    record: has('--record'),
    minCategory,
  }
}

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true })
  } catch {
    // ignore
  }
}

function main() {
  const opts = parseArgs()
  const agent = read('lib/agent.ts')
  const verifyRoute = read('app/api/verify/route.ts')
  const hud = read('components/ui/TelemetryHUD.tsx')
  const statusRoute = read('app/api/status/route.ts')
  const hqAnswerStyle = read('components/home/office/hqAnswerStyle.ts')
  const hqTypes = read('components/home/office/types.ts')
  const assistantGuidance = read('lib/assistantGuidance.ts')
  const assistantRegistry = read('lib/assistantCapabilityRegistry.ts')
  const assistantCanonicalRegistry = read('lib/assistantCanonicalRegistry.ts')
  const assistantRetrieveRoute = read('app/api/assistant/retrieve/route.ts')
  const assistantSessionMemory = read('lib/assistantSessionMemory.ts')
  const assistantSessionRecovery = read('lib/assistantSessionRecovery.ts')
  const assistantExecutionSignals = read('lib/assistantExecutionSignals.ts')
  const artifactContinuity = read('lib/artifactContinuity.ts')
  const binaryTriage = read('lib/binaryTriage.ts')
  const secondBrainExport = read('lib/secondBrainExport.ts')
  const specDrivenDevelopment = read('lib/specDrivenDevelopment.ts')
  const schedulerEfficiencyLatest = readJson('docs/metrics/scheduler-efficiency-latest.json')
  const forecastEvalLatest = readJson('docs/metrics/forecast-eval-latest.json')

  const checks = [
    check(
      'tool risk tiers',
      /const TOOL_RISK/.test(agent) && /tier2/.test(agent),
      'Agent runtime declares risk tier policy map',
      'safety',
      3,
    ),
    check(
      'verification adapters',
      /runVerificationAdapters/.test(agent) &&
        /\/api\/verify/.test(agent) &&
        /typecheck/.test(verifyRoute) &&
        /route_integrity/.test(agent) &&
        /route_integrity/.test(verifyRoute),
      'Verification flow wired to typecheck/lint/route smoke/route integrity',
      'reliability',
      3,
    ),
    check(
      'runtime status chip',
      /label="RUN"/.test(hud) && /agentRuntime\.status/.test(hud),
      'Telemetry HUD surfaces run status',
      'ux',
      2,
    ),
    check(
      'status diagnostics queue',
      /runQueueMode/.test(statusRoute) && /verifyEndpoint/.test(statusRoute),
      'Status endpoint includes queue and verification diagnostics',
      'observability',
      2,
    ),
    check(
      'assistant response kinds',
      /responseKind/.test(hqAnswerStyle) &&
        /assistant/.test(hqAnswerStyle) &&
        /evidence/.test(hqAnswerStyle) &&
        /workflow/.test(hqAnswerStyle),
      'HQ answer style contract distinguishes assistant, evidence, and workflow replies',
      'ux',
      2,
    ),
    check(
      'assistant capability registry',
      /ASSISTANT_CAPABILITIES/.test(assistantRegistry) &&
        /CANONICAL_ROUTE_ALIASES/.test(assistantCanonicalRegistry) &&
        /normalizeCanonicalResourceParams/.test(assistantCanonicalRegistry) &&
        /detectAssistantCapability/.test(assistantRegistry),
      'Assistant capability registry centralizes route aliases, exact-session context, and capability routing',
      'reliability',
      2,
    ),
    check(
      'shared assistant guidance',
      /assistantGuidance\?: AssistantGuidance\[]/.test(hqTypes) &&
        /mergeAssistantGuidance/.test(assistantGuidance) &&
        /scope_drift/.test(assistantGuidance),
      'Assistant replies use one shared guidance contract instead of separate cue fields',
      'ux',
      2,
    ),
    check(
      'live retrieval adapter',
      /GET\(req: NextRequest\)/.test(assistantRetrieveRoute) &&
        /fetchOpenWebResults/.test(assistantRetrieveRoute) &&
        /api\/prices/.test(assistantRetrieveRoute) &&
        /api\/news/.test(assistantRetrieveRoute) &&
        /api\/cves/.test(assistantRetrieveRoute),
      'Assistant retrieval adapter verifies live queries through internal feeds or protected open-web fallback',
      'safety',
      3,
    ),
    check(
      'assistant continuity memory',
      /continuationValue/.test(assistantSessionMemory) &&
        /artifactClass/.test(assistantSessionMemory) &&
        /findStrongestUnfinishedSessionForPath/.test(assistantSessionMemory) &&
        /findStrongestUnfinishedSessionForRoute/.test(assistantSessionMemory),
      'Assistant session memory tracks richer unfinished-session continuity and broad-route recovery',
      'reliability',
      2,
    ),
    check(
      'assistant session recovery',
      /resolveAssistantSessionHref/.test(assistantSessionRecovery) &&
        /includeRouteDefault/.test(assistantSessionRecovery) &&
        /PREPARED_WORKSPACE_TTL_MS/.test(assistantSessionRecovery),
      'Assistant session recovery centralizes prepared, unfinished, and route-default exact-session transport',
      'reliability',
      2,
    ),
    check(
      'reverse engineering continuity',
      /buildReverseEngineeringContinuityTag/.test(binaryTriage) &&
        /reverse-engineering-brief/.test(binaryTriage) &&
        /buildArtifactContinuityMetadata/.test(artifactContinuity),
      'Reverse-engineering and research artifacts share deterministic continuity metadata',
      'observability',
      2,
    ),
    check(
      'assistant execution and archive cues',
      /buildAssistantExecutionAttachment/.test(assistantExecutionSignals) &&
        /buildAssistantArchiveCue/.test(assistantExecutionSignals) &&
        /preferredPreparedHref/.test(assistantExecutionSignals),
      'Assistant turns can attach bounded execution context and compact archive continuity cues',
      'ux',
      2,
    ),
    check(
      'spec drift cues',
      /detectSpecScopeDrift/.test(specDrivenDevelopment) &&
        /scopeSignals/.test(specDrivenDevelopment),
      'Spec-driven execution exposes lightweight scope-drift cues for assistant turns',
      'safety',
      2,
    ),
  ]

  const passed = checks.filter((c) => c.pass).length
  const total = checks.length
  const weightedPassed = checks.filter((c) => c.pass).reduce((s, c) => s + (c.weight || 1), 0)
  const weightedTotal = checks.reduce((s, c) => s + (c.weight || 1), 0)
  const score = Math.round((weightedPassed / Math.max(1, weightedTotal)) * 100)
  const categories = {}
  for (const c of checks) {
    const k = c.category || 'other'
    if (!categories[k]) categories[k] = { passedWeight: 0, totalWeight: 0, score: 0 }
    categories[k].totalWeight += c.weight || 1
    if (c.pass) categories[k].passedWeight += c.weight || 1
  }
  for (const k of Object.keys(categories)) {
    const v = categories[k]
    v.score = Math.round((v.passedWeight / Math.max(1, v.totalWeight)) * 100)
  }
  const report = {
    ts: new Date().toISOString(),
    score,
    weightedPassed,
    weightedTotal,
    passed,
    total,
    minScore: opts.minScore,
    ok: score >= opts.minScore,
    categoryThresholds: opts.minCategory,
    categories,
    checks,
    schedulerEfficiency: schedulerEfficiencyLatest
      ? {
          ts: schedulerEfficiencyLatest.ts || null,
          providerId: schedulerEfficiencyLatest.provider?.id || 'native_scheduler',
          quality: schedulerEfficiencyLatest.summary?.quality || 'guarded',
          score: Number(schedulerEfficiencyLatest.summary?.score || 0),
          activeJobs: Number(schedulerEfficiencyLatest.summary?.activeJobs || 0),
          measuredRuns: Number(schedulerEfficiencyLatest.summary?.measuredRuns || 0),
          cacheObservedCoverage: Number(
            schedulerEfficiencyLatest.summary?.cacheObservedCoverage || 0,
          ),
          cacheHitCoverage: Number(
            schedulerEfficiencyLatest.summary?.cacheHitCoverage || 0,
          ),
          batchedRuns: Number(
            schedulerEfficiencyLatest.summary?.batchedRuns || 0,
          ),
          reasons: Array.isArray(schedulerEfficiencyLatest.summary?.reasons)
            ? schedulerEfficiencyLatest.summary.reasons
            : [],
        }
      : null,
    forecastEval: forecastEvalLatest
      ? {
          ts: forecastEvalLatest.ts || null,
          providerId: forecastEvalLatest.provider?.id || 'native_baseline',
          ready: Boolean(forecastEvalLatest.provider?.ready),
          quality: forecastEvalLatest.summary?.quality || 'degraded',
          score: Number(forecastEvalLatest.summary?.score || 0),
          assetsCovered: Number(forecastEvalLatest.summary?.assetsCovered || 0),
          assetsRequested: Number(forecastEvalLatest.summary?.assetsRequested || 0),
          horizons: Array.isArray(forecastEvalLatest.summary?.horizons)
            ? forecastEvalLatest.summary.horizons
            : [],
          reasons: Array.isArray(forecastEvalLatest.summary?.reasons)
            ? forecastEvalLatest.summary.reasons
            : [],
        }
      : null,
  }

  console.log(`Agent runtime eval score: ${score} weighted (${weightedPassed}/${weightedTotal}) [min=${opts.minScore}]`)
  for (const c of checks) {
    console.log(`- [${c.pass ? 'PASS' : 'FAIL'}] (${c.category}, w=${c.weight}) ${c.name}: ${c.detail}`)
  }
  for (const [k, v] of Object.entries(categories)) {
    console.log(`  category:${k} => ${v.score} (${v.passedWeight}/${v.totalWeight})`)
  }
  if (report.schedulerEfficiency) {
    console.log(
      `Scheduler efficiency: ${report.schedulerEfficiency.quality} ${report.schedulerEfficiency.score}/100 · ${report.schedulerEfficiency.measuredRuns} measured · ${report.schedulerEfficiency.activeJobs} active`,
    )
  }
  if (report.forecastEval) {
    console.log(
      `Forecast eval: ${report.forecastEval.quality} ${report.forecastEval.score}/100 · ${report.forecastEval.assetsCovered}/${report.forecastEval.assetsRequested} assets`,
    )
  }

  const failedChecks = checks.filter((c) => !c.pass)
  if (failedChecks.length > 0) {
    console.log('Failed checks:')
    for (const c of failedChecks) {
      console.log(`  - ${c.name} [${c.category}]`)
    }
  }

  const failedCategories = Object.entries(categories)
    .filter(([k, v]) => {
      const threshold = opts.minCategory[k]
      return typeof threshold === 'number' && v.score < threshold
    })
    .map(([k, v]) => ({ name: k, score: v.score, threshold: opts.minCategory[k] }))
  if (failedCategories.length > 0) {
    console.log('Category threshold failures:')
    for (const c of failedCategories) {
      console.log(`  - ${c.name}: ${c.score} < ${c.threshold}`)
    }
  }

  if (opts.record) {
    ensureDir(HISTORY_DIR)
    try {
      fs.writeFileSync(LATEST_FILE, JSON.stringify(report, null, 2))
      fs.appendFileSync(HISTORY_FILE, `${JSON.stringify(report)}\n`)
      console.log(`Wrote eval report: ${path.relative(ROOT, LATEST_FILE)}`)
      console.log(`Appended eval history: ${path.relative(ROOT, HISTORY_FILE)}`)
    } catch (err) {
      console.log(`Could not persist eval report: ${String(err && err.message ? err.message : err)}`)
    }
  }

  if (score < opts.minScore || failedCategories.length > 0) process.exit(1)
}

main()
