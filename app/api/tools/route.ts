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

// ── Project file access ───────────────────────────────────────────────────────
// Gives the agent read + targeted-edit access to the actual project source code.
// Security rules:
//  - No path traversal (../ blocked)
//  - .env* files always blocked
//  - node_modules, .git, .next, archive blocked
//  - Write only allowed inside safe source dirs
//  - Max read: 60,000 chars (~1,500 lines)

const PROJECT_ROOT = process.cwd()

// Extensions the agent is allowed to read
const READABLE_EXTS = new Set([
  '.tsx', '.ts', '.js', '.jsx', '.css', '.json', '.md', '.txt', '.svg',
  '.html', '.sh', '.bat', '.ps1',
])

// Prefixes blocked for both read and write
const BLOCKED_PREFIXES = [
  'node_modules', '.git', '.next', 'archive', '.env',
]

// Directories where the agent is allowed to write/patch
const WRITABLE_DIRS = [
  'app', 'components', 'lib', 'store', 'public', 'docs', 'specs', 'hooks',
]

function resolveProjectPath(relPath: string): { safe: string; blocked: string | null } {
  // Strip any leading slashes or backslashes
  const cleaned = relPath.replace(/^[/\\]+/, '').replace(/\\/g, '/')
  // Block path traversal
  if (cleaned.includes('..')) return { safe: '', blocked: 'Path traversal is not allowed.' }
  // Block .env files
  const basename = path.basename(cleaned)
  if (basename.startsWith('.env')) return { safe: '', blocked: '.env files are protected.' }
  // Block known directories
  const topLevel = cleaned.split('/')[0]
  if (BLOCKED_PREFIXES.some((p) => topLevel === p || cleaned.startsWith(p + '/')))
    return { safe: '', blocked: `"${topLevel}" is off-limits.` }
  const full = path.join(PROJECT_ROOT, cleaned)
  return { safe: full, blocked: null }
}

async function readProjectFile(relPath: string): Promise<string> {
  const { safe, blocked } = resolveProjectPath(relPath)
  if (blocked) return `Blocked: ${blocked}`
  const ext = path.extname(relPath).toLowerCase()
  if (!READABLE_EXTS.has(ext)) return `Cannot read file type "${ext}". Allowed: ${Array.from(READABLE_EXTS).join(', ')}`
  try {
    const content = await fs.readFile(safe, 'utf-8')
    const preview = content.slice(0, 60_000)
    const truncated = content.length > 60_000 ? `\n\n[Truncated — showing first 60,000 of ${content.length} chars]` : ''
    return preview + truncated
  } catch {
    return `File not found: ${relPath}`
  }
}

async function listProjectFiles(relDir: string): Promise<string> {
  const cleanDir = relDir.replace(/^[/\\]+/, '').replace(/\\/g, '/') || '.'
  const { safe, blocked } = resolveProjectPath(cleanDir === '.' ? '_root_sentinel' : cleanDir)
  // For root listing, bypass the sentinel trick
  const targetPath = cleanDir === '.'
    ? PROJECT_ROOT
    : (blocked ? null : safe)

  if (!targetPath) return `Blocked: ${blocked}`

  try {
    const entries = await fs.readdir(targetPath, { withFileTypes: true })
    const lines = entries
      .filter((e) => !BLOCKED_PREFIXES.some((b) => e.name === b || e.name.startsWith('.env')))
      .map((e) => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`)
    return lines.length ? lines.join('\n') : 'Directory is empty.'
  } catch {
    return `Directory not found: ${relDir}`
  }
}

async function createProjectFile(relPath: string, content: string): Promise<string> {
  const { safe, blocked } = resolveProjectPath(relPath)
  if (blocked) return `Blocked: ${blocked}`

  const topLevel = relPath.replace(/^[/\\]+/, '').split('/')[0]
  if (!WRITABLE_DIRS.includes(topLevel)) {
    return `Write blocked: "${topLevel}" is not a writable directory. Allowed: ${WRITABLE_DIRS.join(', ')}`
  }

  const ext = path.extname(relPath).toLowerCase()
  if (!READABLE_EXTS.has(ext)) return `Cannot create file type "${ext}".`

  // Refuse to overwrite — agent should use patch_project_file for that
  try {
    await fs.access(safe)
    return `File already exists: ${relPath}. Use patch_project_file to edit it.`
  } catch {
    // File does not exist — good, proceed
  }

  // Create intermediate directories if needed
  await fs.mkdir(path.dirname(safe), { recursive: true })
  await fs.writeFile(safe, content, 'utf-8')
  return `Created: ${relPath} (${content.length} chars, ${content.split('\n').length} lines)`
}

async function patchProjectFile(relPath: string, oldStr: string, newStr: string): Promise<string> {
  const { safe, blocked } = resolveProjectPath(relPath)
  if (blocked) return `Blocked: ${blocked}`

  // Only allow writes in approved directories
  const topLevel = relPath.replace(/^[/\\]+/, '').split('/')[0]
  if (!WRITABLE_DIRS.includes(topLevel)) {
    return `Write blocked: "${topLevel}" is not a writable directory. Allowed: ${WRITABLE_DIRS.join(', ')}`
  }

  const ext = path.extname(relPath).toLowerCase()
  if (!READABLE_EXTS.has(ext)) return `Cannot edit file type "${ext}".`

  // Read current content
  let content: string
  try {
    content = await fs.readFile(safe, 'utf-8')
  } catch {
    return `File not found: ${relPath}. Use create_project_file to create it first.`
  }

  if (!content.includes(oldStr)) {
    return `Patch failed: the exact text was not found in ${relPath}. Read the file first and copy the exact string you want to replace.`
  }

  // Only replace the first occurrence (safer — prevents mass replacement)
  const updated = content.replace(oldStr, newStr)
  await fs.writeFile(safe, updated, 'utf-8')
  const linesChanged = Math.abs(newStr.split('\n').length - oldStr.split('\n').length)
  return `Patched: ${relPath} — ${linesChanged} line(s) changed.`
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
      case 'read_project_file':
        result = await readProjectFile(input.path ?? '')
        break
      case 'list_project_files':
        result = await listProjectFiles(input.directory ?? '.')
        break
      case 'patch_project_file':
        result = await patchProjectFile(input.path ?? '', input.old_string ?? '', input.new_string ?? '')
        break
      case 'create_project_file':
        result = await createProjectFile(input.path ?? '', input.content ?? '')
        break
      default:
        result = `Unknown tool: ${tool}`
    }

    return NextResponse.json({ result })
  } catch (err) {
    return NextResponse.json({ result: 'Tool execution error.' }, { status: 200 })
  }
}
