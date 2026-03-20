import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type HNType = 'top' | 'best' | 'new' | 'ask' | 'show'

interface HNStory {
  id: number
  title: string
  url: string | null
  score: number
  by: string
  time: number
  descendants: number
}

interface HNRawItem {
  id: number
  title?: string
  url?: string
  score?: number
  by?: string
  time?: number
  descendants?: number
  type?: string
  deleted?: boolean
  dead?: boolean
}

const HN_BASE = 'https://hacker-news.firebaseio.com/v0'

const ENDPOINT_MAP: Record<HNType, string> = {
  top:  `${HN_BASE}/topstories.json`,
  best: `${HN_BASE}/beststories.json`,
  new:  `${HN_BASE}/newstories.json`,
  ask:  `${HN_BASE}/askstories.json`,
  show: `${HN_BASE}/showstories.json`,
}

async function fetchStoryIds(type: HNType): Promise<number[]> {
  const url = ENDPOINT_MAP[type]
  const r = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { 'Accept': 'application/json' },
  })
  if (!r.ok) throw new Error(`HN stories list error: ${r.status}`)
  const ids = await r.json() as number[]
  return ids.slice(0, 20)
}

async function fetchItem(id: number): Promise<HNStory | null> {
  try {
    const r = await fetch(`${HN_BASE}/item/${id}.json`, {
      signal: AbortSignal.timeout(8000),
      headers: { 'Accept': 'application/json' },
    })
    if (!r.ok) return null

    const item = await r.json() as HNRawItem | null
    if (!item || item.deleted || item.dead) return null
    if (!item.title) return null

    return {
      id: item.id,
      title: item.title,
      url: item.url ?? null,
      score: item.score ?? 0,
      by: item.by ?? '',
      time: item.time ?? 0,
      descendants: item.descendants ?? 0,
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const rawType = searchParams.get('type') ?? 'top'

  const validTypes: HNType[] = ['top', 'best', 'new', 'ask', 'show']
  const type: HNType = validTypes.includes(rawType as HNType)
    ? (rawType as HNType)
    : 'top'

  try {
    const ids = await fetchStoryIds(type)

    // Fetch all items in parallel
    const results = await Promise.allSettled(ids.map(fetchItem))

    const stories: HNStory[] = results
      .filter((r): r is PromiseFulfilledResult<HNStory | null> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((s): s is HNStory => s !== null)

    return NextResponse.json({
      type,
      stories,
      count: stories.length,
      timestamp: new Date().toISOString(),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { type, stories: [], count: 0, error: msg },
      { status: 200 },
    )
  }
}
