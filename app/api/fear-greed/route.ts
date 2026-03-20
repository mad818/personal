import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface FearGreedEntry {
  value: number
  classification: string
  timestamp: string
}

interface FearGreedResponse {
  current: FearGreedEntry
  history: FearGreedEntry[]
}

interface AlternativeFNGEntry {
  value: string
  value_classification: string
  timestamp: string
  time_until_update?: string
}

interface AlternativeFNGResponse {
  name: string
  data: AlternativeFNGEntry[]
  metadata?: { error: string | null }
}

function parseEntry(entry: AlternativeFNGEntry): FearGreedEntry {
  return {
    value: parseInt(entry.value, 10),
    classification: entry.value_classification,
    timestamp: new Date(parseInt(entry.timestamp, 10) * 1000).toISOString(),
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    // Fetch current + history in parallel
    const [currentRes, historyRes] = await Promise.all([
      fetch('https://api.alternative.me/fng/?limit=1&format=json', {
        signal: AbortSignal.timeout(8000),
        headers: { 'Accept': 'application/json' },
      }),
      fetch('https://api.alternative.me/fng/?limit=30&format=json', {
        signal: AbortSignal.timeout(8000),
        headers: { 'Accept': 'application/json' },
      }),
    ])

    if (!currentRes.ok) {
      throw new Error(`Fear & Greed API error: ${currentRes.status}`)
    }
    if (!historyRes.ok) {
      throw new Error(`Fear & Greed history API error: ${historyRes.status}`)
    }

    const [currentData, historyData] = await Promise.all([
      currentRes.json() as Promise<AlternativeFNGResponse>,
      historyRes.json() as Promise<AlternativeFNGResponse>,
    ])

    const currentEntry = currentData.data?.[0]
    if (!currentEntry) {
      throw new Error('No current Fear & Greed data returned')
    }

    const current = parseEntry(currentEntry)
    const history = (historyData.data ?? []).map(parseEntry)

    const result: FearGreedResponse = { current, history }

    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      {
        error: msg,
        current: null,
        history: [],
      },
      { status: 200 },
    )
  }
}
