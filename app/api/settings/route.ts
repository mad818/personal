import { NextRequest, NextResponse } from 'next/server'
import * as fs   from 'fs/promises'
import * as path from 'path'

/**
 * Server-side settings store — OpenClaw-style.
 *
 * API keys are NEVER stored in the browser. They live in .env.local
 * on the server. The browser only sends keys when the user explicitly
 * saves them. On read, we return which keys are set (boolean) not their
 * values — the browser never sees the raw key strings.
 *
 * Non-sensitive settings (user profile, watchlist, etc.) stay in
 * localStorage as before.
 */

// Keys that are sensitive and should live server-side only
const SENSITIVE_KEYS = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'BRAVE_SEARCH_KEY',
  'COINGECKO_KEY',
  'FINNHUB_KEY',
  'GUARDIAN_KEY',
  'NVD_KEY',
  'OTX_KEY',
  'FRED_KEY',
  'AISSSTREAM_KEY',
  'FIRMS_KEY',
  'FIRECRAWL_KEY',
  'OPENCLAW_TOKEN',
  'NEXUS_TOKEN',
]

const ENV_FILE = path.join(process.cwd(), '.env.local')

async function readEnvFile(): Promise<Record<string, string>> {
  try {
    const content = await fs.readFile(ENV_FILE, 'utf-8')
    const env: Record<string, string> = {}
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim()
      env[key] = val
    }
    return env
  } catch {
    return {}
  }
}

async function writeEnvFile(env: Record<string, string>): Promise<void> {
  // Preserve the original file structure — only update/add value lines
  let content = ''
  try { content = await fs.readFile(ENV_FILE, 'utf-8') } catch { /* new file */ }

  for (const [key, value] of Object.entries(env)) {
    const regex = new RegExp(`^(${key}=)(.*)$`, 'm')
    if (regex.test(content)) {
      content = content.replace(regex, `$1${value}`)
    } else {
      content += `\n${key}=${value}`
    }
  }

  await fs.writeFile(ENV_FILE, content, 'utf-8')
}

// GET — return which keys are set (true/false), not the values
export async function GET() {
  const env = await readEnvFile()
  const status: Record<string, boolean> = {}
  for (const key of SENSITIVE_KEYS) {
    status[key] = !!(env[key] ?? process.env[key])
  }
  return NextResponse.json({ status })
}

// POST — update one or more keys in .env.local
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, string>

    // Internal tokens the user cannot overwrite via the settings UI
    const READONLY_KEYS = new Set(['NEXUS_TOKEN', 'OPENCLAW_TOKEN'])

    // Only allow updating known sensitive keys (minus internal tokens)
    const updates: Record<string, string> = {}
    for (const [k, v] of Object.entries(body)) {
      if (SENSITIVE_KEYS.includes(k) && !READONLY_KEYS.has(k)) {
        updates[k] = String(v)
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: 'No valid keys provided' }, { status: 400 })
    }

    await writeEnvFile(updates)

    // Note: env vars don't hot-reload in Next.js — a restart is needed
    // to pick up new values. We return a flag so the UI can warn the user.
    return NextResponse.json({ ok: true, needsRestart: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Write failed' }, { status: 500 })
  }
}
