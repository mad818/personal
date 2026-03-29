// ── components/recon/ReconLookup ────────────────────────────
// OSINT lookup panel: RDAP, DNS, TLS certs, IP geo, HIBP, VirusTotal, Shodan.
// Free lookups run without keys. HIBP/VT/Shodan are BYOK (optional).

'use client'

import { useState, useCallback } from 'react'
import { useStore } from '@/store/useStore'

// ── types ─────────────────────────────────────────────────────────────────────
type TargetType = 'auto' | 'domain' | 'ip' | 'email' | 'hash' | 'url'

interface PanelState {
  rdap:   string
  dns:    string
  certs:  string
  geo:    string
  hibp:   string
  vt:     string
  shodan: string
}

// ── helpers ───────────────────────────────────────────────────────────────────
function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function detectType(raw: string): Exclude<TargetType,'auto'> {
  if (/^[\da-f]{32,64}$/i.test(raw))          return 'hash'
  if (/^https?:\/\//i.test(raw))               return 'url'
  if (/@/.test(raw))                           return 'email'
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(raw))    return 'ip'
  return 'domain'
}

function rcTable(rows: [string, string][]): string {
  if (!rows.length) return ''
  return '<table style="width:100%;border-collapse:collapse;font-size:11px">'
    + rows.map(([k, v]) =>
        `<tr>
          <td style="color:var(--text3);padding:3px 8px 3px 0;white-space:nowrap;vertical-align:top">${k}</td>
          <td style="color:var(--text);word-break:break-all">${v}</td>
        </tr>`
      ).join('')
    + '</table>'
}

// ── fetch functions (all free) ────────────────────────────────────────────────
async function fetchRdapDomain(domain: string): Promise<string> {
  try {
    const r = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const d = await r.json()
    const rows: [string,string][] = []
    if (d.ldhName)  rows.push(['Domain',   esc(d.ldhName)])
    if (d.status)   rows.push(['Status',   (d.status as string[]).map(esc).join(', ')])
    const ns = ((d.nameservers || []) as {ldhName?:string}[]).map(n => esc(n.ldhName ?? '')).filter(Boolean)
    if (ns.length)  rows.push(['NS', ns.join(', ')])
    const registrar = (d.entities as {roles?:string[];vcardArray?:unknown[][]}[])?.find(e => e.roles?.includes('registrar'))
    if (registrar?.vcardArray?.[1]) {
      const fn = (registrar.vcardArray[1] as unknown[][]).find(v => v[0] === 'fn')
      if (fn) rows.push(['Registrar', esc(String(fn[3] ?? ''))])
    }
    const reg = (d.events as {eventAction:string;eventDate?:string}[])?.find(e => e.eventAction === 'registration')
    const exp = (d.events as {eventAction:string;eventDate?:string}[])?.find(e => e.eventAction === 'expiration')
    if (reg) rows.push(['Registered', esc(reg.eventDate?.slice(0,10) ?? '')])
    if (exp) rows.push(['Expires',    esc(exp.eventDate?.slice(0,10) ?? '')])
    return rcTable(rows) || '<span style="color:var(--text3)">No data</span>'
  } catch (e) { return `<span style="color:var(--flo)">${esc(String(e))}</span>` }
}

async function fetchRdapIp(ip: string): Promise<string> {
  try {
    const r = await fetch(`https://rdap.org/ip/${encodeURIComponent(ip)}`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const d = await r.json()
    const rows: [string,string][] = []
    if (d.name)    rows.push(['Name',   esc(d.name)])
    if (d.type)    rows.push(['Type',   esc(d.type)])
    if (d.handle)  rows.push(['Handle', esc(d.handle)])
    const cidr = ((d.cidr0CIDRs || []) as {v4prefix?:string;v6prefix?:string;length?:number}[])
      .map(c => `${c.v4prefix ?? c.v6prefix}/${c.length}`)
    if (cidr.length) rows.push(['CIDR', esc(cidr[0])])
    if (d.country) rows.push(['Country', esc(d.country)])
    const org = (d.entities as {roles?:string[];vcardArray?:unknown[][]}[])?.find(e => e.roles?.includes('registrant'))
    if (org?.vcardArray?.[1]) {
      const fn = (org.vcardArray[1] as unknown[][]).find(v => v[0] === 'fn')
      if (fn) rows.push(['Org', esc(String(fn[3] ?? ''))])
    }
    return rcTable(rows) || '<span style="color:var(--text3)">No data</span>'
  } catch (e) { return `<span style="color:var(--flo)">${esc(String(e))}</span>` }
}

async function fetchDns(domain: string): Promise<string> {
  try {
    const types = ['A','MX','NS','TXT'] as const
    const results = await Promise.allSettled(
      types.map(t => fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${t}`).then(r => r.json()))
    )
    let html = ''
    types.forEach((type, i) => {
      const res = results[i]
      if (res.status === 'fulfilled' && (res.value as {Answer?:{data:string}[]}).Answer?.length) {
        html += `<div style="font-size:10px;font-weight:700;color:var(--accent);margin:6px 0 2px">${type}</div>`
        ;(res.value as {Answer:{data:string}[]}).Answer.forEach(a => {
          html += `<div style="font-size:11px;color:var(--text);word-break:break-all;padding:1px 0">${esc(String(a.data ?? ''))}</div>`
        })
      }
    })
    return html || '<span style="color:var(--text3)">No records found</span>'
  } catch (e) { return `<span style="color:var(--flo)">${esc(String(e))}</span>` }
}

interface CrtEntry { common_name?: string; not_before?: string; not_after?: string; issuer_name?: string }
async function fetchCerts(domain: string): Promise<string> {
  try {
    const r = await fetch(`https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const data: CrtEntry[] = await r.json()
    const seen = new Set<string>()
    const uniq = data.filter(c => {
      if (seen.has(c.common_name ?? '')) return false
      seen.add(c.common_name ?? ''); return true
    }).slice(0, 12)
    if (!uniq.length) return '<span style="color:var(--text3)">No certificates found</span>'
    let html = ''
    uniq.forEach(c => {
      const issued  = (c.not_before ?? '').slice(0,10)
      const expires = (c.not_after  ?? '').slice(0,10)
      const issuer  = esc((c.issuer_name ?? '').replace(/.*CN=/,'').split(',')[0] ?? '')
      html += `<div style="font-size:11px;padding:4px 0;border-bottom:1px solid var(--border)">
        <span style="color:var(--text);font-weight:700">${esc(c.common_name ?? '')}</span>
        <span style="color:var(--text3);margin-left:8px">${esc(issued)} → ${esc(expires)}</span>
        <span style="color:var(--accent);margin-left:8px;font-size:10px">${issuer}</span>
      </div>`
    })
    if (data.length > 12) html += `<div style="font-size:10px;color:var(--text3);margin-top:6px">+${data.length - 12} more — see crt.sh</div>`
    return html
  } catch (e) { return `<span style="color:var(--flo)">${esc(String(e))}</span>` }
}

async function fetchIpGeo(ip: string): Promise<string> {
  try {
    const r = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const d = await r.json()
    if (d.error) return `<span style="color:var(--flo)">${esc(d.reason ?? d.error)}</span>`
    const rows: [string,string][] = [
      ['IP',       esc(d.ip ?? ip)],
      ['City',     esc(d.city ?? '—')],
      ['Region',   esc(d.region ?? '—')],
      ['Country',  esc(`${d.country_name ?? ''} ${d.country_code ?? ''}`.trim())],
      ['Org',      esc(d.org ?? '—')],
      ['ASN',      esc(d.asn ?? '—')],
      ['Timezone', esc(d.timezone ?? '—')],
    ]
    return rcTable(rows)
  } catch (e) { return `<span style="color:var(--flo)">${esc(String(e))}</span>` }
}

async function fetchDomainGeo(domain: string): Promise<string> {
  try {
    const rr = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`)
    const dd = await rr.json()
    const ip: string = dd.Answer?.[0]?.data
    if (!ip) return '<span style="color:var(--text3)">Could not resolve domain to IP</span>'
    return fetchIpGeo(ip)
  } catch (e) { return `<span style="color:var(--flo)">${esc(String(e))}</span>` }
}

async function fetchHibp(email: string, key: string): Promise<string> {
  if (!key) return '<span style="color:var(--text3)">Add HIBP key in Settings to check breaches</span>'
  try {
    const r = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      { headers: { 'hibp-api-key': key, 'User-Agent': 'Nexus-Prime' } }
    )
    if (r.status === 404) return '<span style="color:var(--fhi)">✅ No breaches found</span>'
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const breaches: {Name?:string;Title?:string;BreachDate?:string;DataClasses?:string[];IsSensitive?:boolean;IsVerified?:boolean}[] = await r.json()
    let html = `<div style="font-weight:700;color:var(--flo);margin-bottom:6px">${breaches.length} breach${breaches.length !== 1 ? 'es' : ''} found</div>`
    breaches.forEach(b => {
      const col = b.IsSensitive ? 'var(--flo)' : b.IsVerified ? 'var(--fmd)' : 'var(--text2)'
      html += `<div style="font-size:11px;padding:3px 0;border-bottom:1px solid var(--border)">
        <span style="color:${col};font-weight:700">${esc(b.Name ?? b.Title ?? '')}</span>
        <span style="color:var(--text3);margin-left:8px">${esc((b.BreachDate ?? '').slice(0,10))}</span>
        <span style="color:var(--text2);margin-left:8px;font-size:10px">${(b.DataClasses ?? []).slice(0,4).map(esc).join(' · ')}</span>
      </div>`
    })
    return html
  } catch (e) { return `<span style="color:var(--flo)">${esc(String(e))}</span>` }
}

async function fetchVirusTotal(target: string, type: Exclude<TargetType,'auto'>, key: string): Promise<string> {
  if (!key) return '<span style="color:var(--text3)">Add VirusTotal key in Settings</span>'
  try {
    let endpoint = ''
    if (type === 'hash')   endpoint = `https://www.virustotal.com/api/v3/files/${encodeURIComponent(target)}`
    else if (type === 'ip') endpoint = `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(target)}`
    else {
      const dom = type === 'url' ? new URL(target).hostname : target
      endpoint = `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(dom)}`
    }
    const r = await fetch(endpoint, { headers: { 'x-apikey': key } })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const d = await r.json()
    const stats = d.data?.attributes?.last_analysis_stats ?? {}
    const total = (Object.values(stats) as number[]).reduce((a, b) => a + (b ?? 0), 0)
    const mal   = (stats.malicious ?? 0) + (stats.suspicious ?? 0)
    const col   = mal === 0 ? 'var(--fhi)' : mal < 5 ? 'var(--fmd)' : 'var(--flo)'
    let html = `<div style="font-size:16px;font-weight:900;color:${col};margin-bottom:8px">${mal}/${total} engines flagged</div>`
    const rows: [string,string][] = []
    if (d.data?.attributes?.reputation !== undefined) rows.push(['Reputation', String(d.data.attributes.reputation)])
    if (d.data?.attributes?.last_analysis_date) rows.push(['Last scan', new Date(d.data.attributes.last_analysis_date * 1000).toISOString().slice(0,10)])
    if (d.data?.attributes?.registrar) rows.push(['Registrar', esc(d.data.attributes.registrar)])
    if (d.data?.attributes?.country)   rows.push(['Country',   esc(d.data.attributes.country)])
    html += rcTable(rows)
    const engines = Object.entries(d.data?.attributes?.last_analysis_results ?? {})
      .filter(([,v]) => (v as {category:string}).category === 'malicious' || (v as {category:string}).category === 'suspicious')
      .slice(0, 6)
    if (engines.length) {
      html += '<div style="margin-top:8px">'
      engines.forEach(([name, v]) => {
        html += `<div style="font-size:11px;display:flex;justify-content:space-between;padding:2px 0">
          <span style="color:var(--text)">${esc(name)}</span>
          <span style="color:var(--flo)">${esc((v as {result?:string;category:string}).result ?? (v as {category:string}).category)}</span>
        </div>`
      })
      html += '</div>'
    }
    return html
  } catch (e) { return `<span style="color:var(--flo)">${esc(String(e))}</span>` }
}

async function fetchShodan(ip: string, key: string): Promise<string> {
  if (!key) return '<span style="color:var(--text3)">Add Shodan key in Settings</span>'
  try {
    const r = await fetch(`https://api.shodan.io/shodan/host/${encodeURIComponent(ip)}?key=${encodeURIComponent(key)}`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const d = await r.json()
    const rows: [string,string][] = []
    if (d.org)          rows.push(['Org',     esc(d.org)])
    if (d.country_name) rows.push(['Country', esc(d.country_name)])
    if (d.city)         rows.push(['City',    esc(d.city)])
    if (d.isp)          rows.push(['ISP',     esc(d.isp)])
    if (d.asn)          rows.push(['ASN',     esc(d.asn)])
    if (d.os)           rows.push(['OS',      esc(d.os)])
    if ((d.vulns as string[])?.length) rows.push(['CVEs', (d.vulns as string[]).slice(0,5).map(esc).join(', ')])
    let html = rcTable(rows)
    if ((d.data as {port?:number;transport?:string;product?:string;_shodan?:{module?:string}}[])?.length) {
      html += '<div style="margin-top:8px;font-size:11px">'
      ;(d.data as {port?:number;transport?:string;product?:string;_shodan?:{module?:string}}[]).slice(0,10).forEach(svc => {
        html += `<div style="display:flex;gap:8px;padding:2px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--accent);font-weight:700;min-width:40px">${esc(String(svc.port ?? ''))}</span>
          <span style="color:var(--text3)">${esc(svc.transport ?? 'tcp')}</span>
          <span style="color:var(--text)">${esc((svc.product ?? svc._shodan?.module ?? '').slice(0,40))}</span>
        </div>`
      })
      if ((d.data as unknown[]).length > 10) html += `<div style="color:var(--text3);margin-top:4px;font-size:10px">+${(d.data as unknown[]).length - 10} more ports</div>`
      html += '</div>'
    }
    return html
  } catch (e) { return `<span style="color:var(--flo)">${esc(String(e))}</span>` }
}

// ── Panel component ────────────────────────────────────────────────────────────
function Panel({ title, content, loading }: { title: string; content: string; loading: boolean }) {
  return (
    <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '8px' }}>{title}</div>
      {loading
        ? <div style={{ color: 'var(--text3)', fontSize: '11px' }}>Scanning…</div>
        : <div dangerouslySetInnerHTML={{ __html: content }} />
      }
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ReconLookup() {
  const settings = useStore((s) => s.settings)

  const [target,  setTarget]  = useState('')
  const [typeVal, setTypeVal] = useState<TargetType>('auto')
  const [loading, setLoading] = useState(false)
  const [panels,  setPanels]  = useState<PanelState>({
    rdap: '', dns: '', certs: '', geo: '', hibp: '', vt: '', shodan: '',
  })
  const [loadingMap, setLoadingMap] = useState<Record<keyof PanelState, boolean>>({
    rdap: false, dns: false, certs: false, geo: false, hibp: false, vt: false, shodan: false,
  })

  const set = useCallback((key: keyof PanelState, val: string) => {
    setPanels(p => ({ ...p, [key]: val }))
    setLoadingMap(m => ({ ...m, [key]: false }))
  }, [])

  const startLoading = useCallback((keys: (keyof PanelState)[]) => {
    setLoadingMap(m => { const next = { ...m }; keys.forEach(k => { next[k] = true }); return next })
  }, [])

  async function scan() {
    const raw = target.trim()
    if (!raw) return
    const resolvedType = typeVal === 'auto' ? detectType(raw) : typeVal

    const isDomain = resolvedType === 'domain' || resolvedType === 'email'
    const isIp     = resolvedType === 'ip'
    const isHash   = resolvedType === 'hash'
    const isUrl    = resolvedType === 'url'
    const domain   = isDomain ? (resolvedType === 'email' ? raw.split('@')[1] : raw) : null
    const ip       = isIp ? raw : null

    setLoading(true)
    const tasks: Promise<void>[] = []

    // RDAP
    startLoading(['rdap','dns','certs','geo','hibp','vt','shodan'])
    if (domain) {
      tasks.push(fetchRdapDomain(domain).then(v => set('rdap', v)))
      tasks.push(fetchDns(domain).then(v => set('dns', v)))
      tasks.push(fetchCerts(domain).then(v => set('certs', v)))
      tasks.push(fetchDomainGeo(domain).then(v => set('geo', v)))
    } else if (ip) {
      tasks.push(fetchRdapIp(ip).then(v => set('rdap', v)))
      set('dns',   '<span style="color:var(--text3)">DNS lookup not applicable for raw IPs</span>')
      set('certs', '<span style="color:var(--text3)">Cert transparency requires a domain</span>')
      tasks.push(fetchIpGeo(ip).then(v => set('geo', v)))
    } else {
      set('rdap',  '<span style="color:var(--text3)">RDAP requires a domain or IP</span>')
      set('dns',   '<span style="color:var(--text3)">—</span>')
      set('certs', '<span style="color:var(--text3)">—</span>')
      set('geo',   '<span style="color:var(--text3)">Geo requires domain or IP</span>')
    }

    // HIBP — email only
    if (resolvedType === 'email') {
      tasks.push(fetchHibp(raw, settings.hibpKey).then(v => set('hibp', v)))
    } else {
      set('hibp', '<span style="color:var(--text3)">Email targets only</span>')
    }

    // VirusTotal — domain, ip, hash, url
    if (domain || ip || isHash || isUrl) {
      tasks.push(fetchVirusTotal(raw, resolvedType, settings.vtKey).then(v => set('vt', v)))
    } else {
      set('vt', '<span style="color:var(--text3)">—</span>')
    }

    // Shodan — IP only
    if (ip) {
      tasks.push(fetchShodan(ip, settings.shodanKey).then(v => set('shodan', v)))
    } else {
      set('shodan', '<span style="color:var(--text3)">IP targets only</span>')
    }

    await Promise.allSettled(tasks)
    setLoading(false)
  }

  function clear() {
    setTarget('')
    setPanels({ rdap:'', dns:'', certs:'', geo:'', hibp:'', vt:'', shodan:'' })
  }

  const INPUT: React.CSSProperties = {
    background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: '8px',
    color: 'var(--text)', fontSize: '13px', padding: '8px 12px', outline: 'none', width: '100%', boxSizing: 'border-box',
  }
  const BTN: React.CSSProperties = {
    padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
    fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap',
  }

  return (
    <div>
      {/* Target input row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <input
          style={{ ...INPUT, flex: 1, minWidth: '200px' }}
          placeholder="Domain · IP · Email · Hash · URL"
          value={target}
          onChange={e => setTarget(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void scan() }}
        />
        <select
          style={{ ...INPUT, width: 'auto', cursor: 'pointer' }}
          value={typeVal}
          onChange={e => setTypeVal(e.target.value as TargetType)}
        >
          <option value="auto">Auto-detect</option>
          <option value="domain">Domain</option>
          <option value="ip">IP Address</option>
          <option value="email">Email</option>
          <option value="hash">File Hash</option>
          <option value="url">URL</option>
        </select>
        <button onClick={() => void scan()} disabled={loading} style={{ ...BTN, background: 'var(--accent)', color: '#fff' }}>
          {loading ? 'Scanning…' : '🔍 Scan'}
        </button>
        <button onClick={clear} style={{ ...BTN, background: 'var(--surf3)', color: 'var(--text2)' }}>
          Clear
        </button>
      </div>

      {/* Results grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
        <Panel title="RDAP / WHOIS" content={panels.rdap} loading={loadingMap.rdap} />
        <Panel title="DNS Records"   content={panels.dns}   loading={loadingMap.dns} />
        <Panel title="TLS Certs (crt.sh)" content={panels.certs} loading={loadingMap.certs} />
        <Panel title="IP Geolocation" content={panels.geo}  loading={loadingMap.geo} />
        <Panel title="Have I Been Pwned (BYOK)" content={panels.hibp} loading={loadingMap.hibp} />
        <Panel title="VirusTotal (BYOK)"  content={panels.vt}     loading={loadingMap.vt} />
        <Panel title="Shodan (BYOK)"      content={panels.shodan} loading={loadingMap.shodan} />
      </div>

      <p style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '12px' }}>
        Free lookups: RDAP · DNS · crt.sh · ipapi.co — no key needed.
        BYOK (optional): Have I Been Pwned · VirusTotal · Shodan — add keys in ⚙️ Settings.
      </p>
    </div>
  )
}
