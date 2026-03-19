import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs/promises'
import * as path from 'path'

// ── Workspace root (files the agent can read/write) ───────────────────────────
const WORKSPACE = process.env.AGENT_WORKSPACE
  ?? path.join(process.cwd(), 'agent-workspace')

async function ensureWorkspace() {
  await fs.mkdir(WORKSPACE, { recursive: true })
}

// ── Tool handlers ─────────────────────────────────────────────────────────────

async function webSearch(query: string): Promise<string> {
  const braveKey = process.env.BRAVE_SEARCH_KEY ?? ''

  // ── Brave Search (preferred, much better quality) ──────────────────────────
  if (braveKey) {
    try {
      const q   = encodeURIComponent(query)
      const url = `https://api.search.brave.com/res/v1/web/search?q=${q}&count=8&text_decorations=0`
      const r   = await fetch(url, {
        headers: {
          'Accept':               'application/json',
          'Accept-Encoding':      'gzip',
          'X-Subscription-Token': braveKey,
        },
        signal: AbortSignal.timeout(8000),
      })
      const d = await r.json()
      const results = (d.web?.results ?? []) as { title: string; url: string; description?: string; meta_url?: { netloc?: string } }[]
      if (results.length) {
        return results
          .slice(0, 8)
          .map((a, i) =>
            `${i + 1}. ${a.title}\n   ${a.description ?? ''}\n   Source: ${a.meta_url?.netloc ?? new URL(a.url).hostname} | ${a.url}`,
          )
          .join('\n\n')
      }
    } catch {
      // fall through to GDELT
    }
  }

  // ── GDELT fallback (no key required) ───────────────────────────────────────
  try {
    const q   = encodeURIComponent(query)
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&maxrecords=10&format=json`
    const r   = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const d   = await r.json()
    const articles = (d.articles ?? []) as { title: string; url: string; domain?: string; seendate?: string }[]
    if (!articles.length) return 'No results found.'
    return articles
      .slice(0, 8)
      .map((a, i) => `${i + 1}. ${a.title}\n   Source: ${a.domain ?? 'unknown'} | ${a.url}`)
      .join('\n\n')
  } catch {
    return 'Search failed — could not reach search API.'
  }
}

async function fetchUrl(url: string): Promise<string> {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NexusAI/1.0)' },
      signal:  AbortSignal.timeout(10000),
    })
    const html = await r.text()
    // Strip tags, collapse whitespace
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 4000)
    return text || 'Page returned no readable text.'
  } catch {
    return 'Could not fetch that URL.'
  }
}

async function writeFile(filename: string, content: string): Promise<string> {
  await ensureWorkspace()
  // Sanitise — no path traversal
  const safe = path.basename(filename)
  const dest = path.join(WORKSPACE, safe)
  await fs.writeFile(dest, content, 'utf-8')
  return `File written: ${safe} (${content.length} chars)`
}

async function readFile(filename: string): Promise<string> {
  await ensureWorkspace()
  const safe = path.basename(filename)
  const src  = path.join(WORKSPACE, safe)
  try {
    const content = await fs.readFile(src, 'utf-8')
    return content.slice(0, 6000)
  } catch {
    return `File not found: ${safe}`
  }
}

async function listFiles(): Promise<string> {
  await ensureWorkspace()
  try {
    const files = await fs.readdir(WORKSPACE)
    if (!files.length) return 'Workspace is empty.'
    return files.join('\n')
  } catch {
    return 'Could not list workspace files.'
  }
}

// ── Agent memory (inspired by OpenClaw SOUL.md / USER.md pattern) ─────────────
const NOTES_FILE = 'agent-notes.md'

async function rememberNote(note: string): Promise<string> {
  await ensureWorkspace()
  const dest    = path.join(WORKSPACE, NOTES_FILE)
  const ts      = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const entry   = `\n- [${ts}] ${note.trim()}`
  try {
    await fs.appendFile(dest, entry, 'utf-8')
  } catch {
    // File might not exist yet — create it
    const header = `# Agent Notes\n\nThings to remember across sessions.\n`
    await fs.writeFile(dest, header + entry, 'utf-8')
  }
  return `Noted: "${note.trim()}"`
}

async function recallNotes(): Promise<string> {
  await ensureWorkspace()
  const src = path.join(WORKSPACE, NOTES_FILE)
  try {
    const content = await fs.readFile(src, 'utf-8')
    return content.slice(0, 4000) || 'No notes saved yet.'
  } catch {
    return 'No notes saved yet.'
  }
}

// ── OpenClaw / Max integration ────────────────────────────────────────────────
const OPENCLAW_GATEWAY = process.env.OPENCLAW_URL ?? 'http://127.0.0.1:18789'
const OPENCLAW_TOKEN   = process.env.OPENCLAW_TOKEN ?? ''

async function askMax(message: string): Promise<string> {
  // OpenClaw REST API: POST /api/v1/messages to main agent session
  const token = OPENCLAW_TOKEN
  if (!token) {
    return 'Max (OpenClaw) is not configured. Set OPENCLAW_TOKEN and OPENCLAW_URL in your environment or .env.local to enable this tool.'
  }
  try {
    const r = await fetch(`${OPENCLAW_GATEWAY}/api/v1/messages`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body:    JSON.stringify({
        agentId:  'main',
        message,
        stream:   false,
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!r.ok) {
      return `Max returned HTTP ${r.status}. Make sure OpenClaw is running (openclaw gateway run).`
    }
    const d = await r.json()
    // Response shape: { content: string } or { message: string } depending on version
    const text = d?.content ?? d?.message ?? d?.text ?? JSON.stringify(d)
    return `Max says: ${text}`
  } catch {
    return 'Could not reach Max (OpenClaw). Make sure OpenClaw is running: run `openclaw gateway run` in your terminal.'
  }
}

// ── Safe math evaluator (no eval / no Function constructor) ──────────────────
// Recursive descent parser: handles +, -, *, /, (), unary minus, %
function mathEval(expr: string): number {
  const s = expr.replace(/\s+/g, '')
  if (!/^[0-9+\-*/().%]+$/.test(s)) throw new Error('Invalid characters')

  let pos = 0

  function parseExpr(): number {
    let left = parseTerm()
    while (pos < s.length && (s[pos] === '+' || s[pos] === '-')) {
      const op = s[pos++]
      const right = parseTerm()
      left = op === '+' ? left + right : left - right
    }
    return left
  }

  function parseTerm(): number {
    let left = parseFactor()
    while (pos < s.length && (s[pos] === '*' || s[pos] === '/')) {
      const op = s[pos++]
      const right = parseFactor()
      if (op === '/' && right === 0) throw new Error('Division by zero')
      left = op === '*' ? left * right : left / right
    }
    return left
  }

  function parseFactor(): number {
    if (s[pos] === '(') {
      pos++ // skip '('
      const val = parseExpr()
      if (s[pos] === ')') pos++ // skip ')'
      return val
    }
    if (s[pos] === '-') { pos++; return -parseFactor() }
    if (s[pos] === '+') { pos++; return  parseFactor() }
    let numStr = ''
    while (pos < s.length && /[0-9.]/.test(s[pos])) numStr += s[pos++]
    if (!numStr) throw new Error('Unexpected character')
    const n = parseFloat(numStr)
    if (pos < s.length && s[pos] === '%') { pos++; return n / 100 }
    return n
  }

  const result = parseExpr()
  if (!isFinite(result)) throw new Error('Non-finite result')
  return result
}

async function calculate(expression: string): Promise<string> {
  try {
    const result = mathEval(expression)
    return String(result)
  } catch {
    return 'Could not evaluate that expression.'
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { tool, input } = await req.json() as { tool: string; input: Record<string, string> }

    let result = ''

    switch (tool) {
      case 'web_search':
        result = await webSearch(input.query ?? '')
        break
      case 'fetch_url':
        result = await fetchUrl(input.url ?? '')
        break
      case 'write_file':
        result = await writeFile(input.filename ?? 'output.txt', input.content ?? '')
        break
      case 'read_file':
        result = await readFile(input.filename ?? '')
        break
      case 'list_files':
        result = await listFiles()
        break
      case 'calculate':
        result = await calculate(input.expression ?? '')
        break
      case 'remember':
        result = await rememberNote(input.note ?? '')
        break
      case 'recall':
        result = await recallNotes()
        break
      case 'ask_max':
        result = await askMax(input.message ?? '')
        break
      default:
        result = `Unknown tool: ${tool}`
    }

    return NextResponse.json({ result })
  } catch (err) {
    return NextResponse.json({ result: 'Tool execution error.' }, { status: 200 })
  }
}
