#!/usr/bin/env node
// scripts/audit.js — npm run audit:full
// Full project health audit: tsc, lint, security-scan, path-collisions, todo check.
// Prints a summary with pass/fail for each check.
// Usage: npm run audit:full

const { execSync } = require('child_process')
const fs            = require('fs')
const path          = require('path')

const CHECKS = [
  {
    name:    'TypeScript (tsc --noEmit)',
    cmd:     'npx tsc --noEmit 2>&1',
    failOn:  /error TS/,
  },
  {
    name:    'ESLint',
    cmd:     'npx next lint --max-warnings 0 2>&1',
    failOn:  /Error:|error/,
  },
  {
    name:    'Security scan',
    cmd:     'node scripts/security-scan.js 2>&1',
    failOn:  /CRITICAL|HIGH/,
  },
  {
    name:    'Path collisions',
    cmd:     'node scripts/path-collisions.js 2>&1',
    failOn:  /COLLISION|ERROR/i,
  },
]

const CYAN   = '\x1b[36m'
const GREEN  = '\x1b[32m'
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const RESET  = '\x1b[0m'

function run(cmd) {
  try {
    return { ok: true, output: execSync(cmd, { encoding: 'utf-8', timeout: 60_000 }) }
  } catch (e) {
    return { ok: false, output: e.stdout ?? e.message ?? '' }
  }
}

function todoStats() {
  const file = path.join(process.cwd(), 'tasks', 'todo.md')
  try {
    const content = fs.readFileSync(file, 'utf-8')
    const open   = (content.match(/\[\s\]/g)  ?? []).length
    const closed = (content.match(/\[x\]/gi)  ?? []).length
    return { open, closed }
  } catch {
    return { open: 0, closed: 0 }
  }
}

function main() {
  console.log(`\n${CYAN}═══════════════════════════════════════${RESET}`)
  console.log(`${CYAN}  NEXUS PRIME — FULL AUDIT${RESET}`)
  console.log(`${CYAN}═══════════════════════════════════════${RESET}\n`)

  const results = []

  for (const check of CHECKS) {
    process.stdout.write(`  Checking ${check.name}… `)
    const { ok, output } = run(check.cmd)
    const failed = check.failOn && check.failOn.test(output)
    const pass   = ok && !failed

    if (pass) {
      console.log(`${GREEN}✓ PASS${RESET}`)
    } else {
      console.log(`${RED}✗ FAIL${RESET}`)
      // Show first error line
      const firstErr = output.split('\n').find(l => l.trim()) ?? ''
      if (firstErr) console.log(`    ${YELLOW}→ ${firstErr.slice(0, 120)}${RESET}`)
    }
    results.push({ name: check.name, pass })
  }

  // Todo stats
  const { open, closed } = todoStats()
  const todoColor = open === 0 ? GREEN : open <= 3 ? YELLOW : RED
  console.log(`\n  Task backlog: ${todoColor}${open} open${RESET}, ${closed} closed`)

  // Summary
  const allPassed = results.every(r => r.pass)
  const failCount = results.filter(r => !r.pass).length

  console.log(`\n${CYAN}───────────────────────────────────────${RESET}`)
  if (allPassed) {
    console.log(`${GREEN}  ✓ All checks passed — safe to push.${RESET}`)
  } else {
    console.log(`${RED}  ✗ ${failCount} check(s) failed — fix before pushing.${RESET}`)
    process.exitCode = 1
  }
  console.log(`${CYAN}═══════════════════════════════════════${RESET}\n`)
}

main()
