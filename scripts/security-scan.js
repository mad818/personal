#!/usr/bin/env node
/**
 * security-scan.js — Nexus Prime static security scanner
 *
 * Checks source files for:
 *   1. Hardcoded secrets / API key patterns
 *   2. OWASP Top 10 anti-patterns
 *
 * Run via: npm run verify (wired into verify script)
 * Also standalone: node scripts/security-scan.js
 *
 * Exit 0 = clean. Exit 1 = CRITICAL or HIGH findings.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const fs   = require('fs')
const path = require('path')

const ROOT     = path.join(__dirname, '..')
const CI       = process.env.CI === 'true'
const SCAN_DIRS = ['app/api', 'lib', 'scripts']
const SECRET_ONLY_DIRS = new Set(['scripts'])
const SCAN_EXTS = new Set(['.ts', '.tsx', '.js', '.mjs'])

// ── Secret patterns ───────────────────────────────────────────────────────────
const SECRET_PATTERNS = [
  { name: 'Anthropic key',         re: /sk-ant-[a-zA-Z0-9\-_]{20,}/g },
  { name: 'OpenAI key',            re: /sk-[a-zA-Z0-9]{20,}/g },
  { name: 'AWS access key',        re: /AKIA[0-9A-Z]{16}/g },
  { name: 'Generic Bearer token',  re: /Bearer\s+eyJ[a-zA-Z0-9._-]{20,}/g },
  { name: 'Firecrawl key',         re: /fc-[a-zA-Z0-9]{20,}/g },
  { name: 'Hardcoded password',    re: /password\s*[:=]\s*['"][^'"]{6,}['"]/gi },
]

// ── OWASP patterns ────────────────────────────────────────────────────────────
const OWASP_PATTERNS = [
  {
    name:     'A02 — eval() usage',
    re:       /\beval\s*\(/g,
    note:     'eval() executes arbitrary code — use JSON.parse() or a safe evaluator.',
    severity: 'CRITICAL',
  },
  {
    name:     'A03 — innerHTML assignment',
    re:       /\.innerHTML\s*=/g,
    note:     'innerHTML can inject scripts — use textContent or esc().',
    severity: 'HIGH',
  },
  {
    name:     'A06 — Logging secrets',
    re:       /console\.(log|debug|info)\s*\([^)]*(?:key|token|secret|password|auth)[^)]*\)/gi,
    note:     'Logging sensitive values leaks them to stdout/log aggregators.',
    severity: 'HIGH',
  },
  {
    name:     'A07 — Path traversal (../ in path.join)',
    re:       /path\.join\([^)]*\.\.\//g,
    note:     'User paths with ../ can escape the intended directory.',
    severity: 'HIGH',
    skipIf:   (ctx) => ctx.includes("includes('..')") || ctx.includes('includes(".."),'),
  },
  {
    name:     'A09 — Stack trace in API response',
    re:       /err\.stack/g,
    note:     'Sending stack traces to clients exposes internal file paths.',
    severity: 'MEDIUM',
    skipIf:   (ctx) => !ctx.includes('NextResponse') && !ctx.includes('res.json'),
  },
  {
    name:     'A05 — Debug flag hardcoded true',
    re:       /debug\s*[:=]\s*true/gi,
    note:     'Debug flag may expose internals in responses.',
    severity: 'LOW',
  },
]

// ── File walker ───────────────────────────────────────────────────────────────
function walk(dir) {
  const results = []
  let entries
  try { entries = fs.readdirSync(dir) } catch { return results }
  for (const entry of entries) {
    if (entry.startsWith('.') || entry === 'node_modules' || entry === '.next') continue
    const full = path.join(dir, entry)
    let stat
    try { stat = fs.statSync(full) } catch { continue }
    if (stat.isDirectory()) {
      results.push(...walk(full))
    } else if (SCAN_EXTS.has(path.extname(entry))) {
      results.push(full)
    }
  }
  return results
}

// ── Scanner ───────────────────────────────────────────────────────────────────
function scanFile(filePath) {
  const findings = []
  const rel = path.relative(ROOT, filePath)
  const secretOnly = rel.startsWith(`scripts${path.sep}`) || SECRET_ONLY_DIRS.has(path.dirname(rel))
  let src
  try { src = fs.readFileSync(filePath, 'utf-8') } catch { return findings }

  const lines = src.split('\n')

  const isCommentLine = (l) => {
    const t = l.trim()
    return t.startsWith('//') || t.startsWith('*') || t.startsWith('#')
  }

  // Secret scan
  for (const { name, re } of SECRET_PATTERNS) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(src)) !== null) {
      const lineIdx = src.slice(0, m.index).split('\n').length - 1
      const line    = lines[lineIdx] ?? ''
      if (line.includes('process.env')) continue
      if (isCommentLine(line)) continue
      findings.push({ type: 'SECRET', severity: 'CRITICAL', file: rel, line: lineIdx + 1, rule: name, snippet: line.trim().slice(0, 120) })
    }
  }

  // OWASP scan (lib + app/api only — scripts are secret-scan only)
  if (secretOnly) return findings

  for (const rule of OWASP_PATTERNS) {
    rule.re.lastIndex = 0
    let m
    while ((m = rule.re.exec(src)) !== null) {
      const lineIdx = src.slice(0, m.index).split('\n').length - 1
      const line    = lines[lineIdx] ?? ''
      if (isCommentLine(line)) continue
      const ctx = lines.slice(Math.max(0, lineIdx - 4), lineIdx + 6).join('\n')
      if (rule.skipIf && rule.skipIf(ctx)) continue
      findings.push({ type: 'OWASP', severity: rule.severity, file: rel, line: lineIdx + 1, rule: rule.name, note: rule.note, snippet: line.trim().slice(0, 120) })
    }
  }

  return findings
}

// ── Main ──────────────────────────────────────────────────────────────────────
const allFiles    = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)))
const allFindings = allFiles.flatMap(scanFile)

const criticals = allFindings.filter((f) => f.severity === 'CRITICAL')
const highs     = allFindings.filter((f) => f.severity === 'HIGH')
const others    = allFindings.filter((f) => f.severity !== 'CRITICAL' && f.severity !== 'HIGH')

if (allFindings.length === 0) {
  console.log('✅ security-scan: clean')
  process.exit(0)
}

console.log(`\n🔐 Security scan — ${allFindings.length} finding(s)\n`)
for (const f of [...criticals, ...highs, ...others]) {
  const icon = f.severity === 'CRITICAL' ? '🚨' : f.severity === 'HIGH' ? '⚠️ ' : '💡'
  console.log(`${icon} [${f.severity}] ${f.rule}`)
  console.log(`   ${f.file}:${f.line}`)
  console.log(`   ${f.snippet}`)
  if (f.note) console.log(`   → ${f.note}`)
  console.log()
}
console.log(`Summary: ${criticals.length} critical, ${highs.length} high, ${others.length} medium/low`)

if (criticals.length > 0 || highs.length > 0) {
  console.log('\n🚫 Blocking findings — fix CRITICAL/HIGH before pushing.')
  process.exit(1)
} else {
  console.log('\n✅ No blocking findings.')
  process.exit(0)
}
