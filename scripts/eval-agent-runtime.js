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
  }

  console.log(`Agent runtime eval score: ${score} weighted (${weightedPassed}/${weightedTotal}) [min=${opts.minScore}]`)
  for (const c of checks) {
    console.log(`- [${c.pass ? 'PASS' : 'FAIL'}] (${c.category}, w=${c.weight}) ${c.name}: ${c.detail}`)
  }
  for (const [k, v] of Object.entries(categories)) {
    console.log(`  category:${k} => ${v.score} (${v.passedWeight}/${v.totalWeight})`)
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
