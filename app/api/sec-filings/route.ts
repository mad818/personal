import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SEC_HEADERS = {
  'User-Agent': 'NexusPrime/1.0 (contact@nexusprime.local)',
  'Accept': 'application/json',
  'Accept-Encoding': 'gzip, deflate',
}

interface Filing {
  company: string
  form_type: string
  date_filed: string
  description: string
  url: string
}

interface EFTSHit {
  _source: {
    entity_name?: string
    file_date?: string
    form_type?: string
    period_of_report?: string
    file_num?: string
    display_date_filed?: string
    biz_location?: string
    inc_states?: string
    category?: string
    file_name?: string
    id?: string
  }
}

interface EFTSResponse {
  hits?: {
    hits?: EFTSHit[]
    total?: { value: number }
  }
}

async function searchEFTS(query: string): Promise<Filing[]> {
  const encoded = encodeURIComponent(query)
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const startDate = thirtyDaysAgo.toISOString().slice(0, 10)
  const endDate = today.toISOString().slice(0, 10)

  // Use EFTS full-text search
  const url = `https://efts.sec.gov/LATEST/search-index?q=${encoded}&dateRange=custom&startdt=${startDate}&enddt=${endDate}&from=0&size=20`

  const r = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: SEC_HEADERS,
  })

  if (!r.ok) throw new Error(`SEC EFTS error: ${r.status}`)

  const data = await r.json() as EFTSResponse
  const hits = data.hits?.hits ?? []

  return hits.map((hit) => {
    const src = hit._source
    const fileName = src.file_name ?? ''
    const entityName = src.entity_name ?? 'Unknown Entity'
    const formType = src.form_type ?? ''
    const dateFiled = src.file_date ?? src.display_date_filed ?? ''
    const id = src.id ?? ''

    // Build the EDGAR filing URL
    const secUrl = fileName
      ? `https://www.sec.gov/Archives/edgar/data/${fileName}`
      : id
        ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&filenum=${id}`
        : 'https://www.sec.gov/cgi-bin/browse-edgar'

    const description = [
      src.category ?? '',
      src.period_of_report ? `Period: ${src.period_of_report}` : '',
      src.biz_location ?? '',
    ].filter(Boolean).join(' | ') || `${formType} filing`

    return {
      company: entityName,
      form_type: formType,
      date_filed: dateFiled,
      description,
      url: secUrl,
    }
  })
}

async function searchEDGAR(query: string): Promise<Filing[]> {
  // Alternative: use EDGAR full-text search API
  const encoded = encodeURIComponent(query)
  const url = `https://efts.sec.gov/LATEST/search-index?q=${encoded}&from=0&size=20`

  const r = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: SEC_HEADERS,
  })

  if (!r.ok) throw new Error(`SEC EDGAR search error: ${r.status}`)

  const data = await r.json() as EFTSResponse
  const hits = data.hits?.hits ?? []

  return hits.map((hit) => {
    const src = hit._source
    const formType = src.form_type ?? ''
    const entityName = src.entity_name ?? 'Unknown Entity'
    const dateFiled = src.file_date ?? ''
    const fileName = src.file_name ?? ''

    const secUrl = fileName
      ? `https://www.sec.gov/Archives/edgar/data/${fileName}`
      : 'https://www.sec.gov/cgi-bin/browse-edgar'

    const description = [
      src.category ?? '',
      src.period_of_report ? `Period: ${src.period_of_report}` : '',
    ].filter(Boolean).join(' | ') || `${formType} filing`

    return {
      company: entityName,
      form_type: formType,
      date_filed: dateFiled,
      description,
      url: secUrl,
    }
  })
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query') ?? ''

  if (!query.trim()) {
    return NextResponse.json(
      { filings: [], error: 'Missing required ?query= parameter' },
      { status: 400 },
    )
  }

  try {
    let filings: Filing[] = []

    try {
      filings = await searchEFTS(query)
    } catch {
      // Fallback to simpler EDGAR endpoint
      filings = await searchEDGAR(query)
    }

    return NextResponse.json({
      query,
      count: filings.length,
      filings,
      timestamp: new Date().toISOString(),
      source: 'SEC EDGAR EFTS',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { query, filings: [], count: 0, error: msg },
      { status: 200 },
    )
  }
}
