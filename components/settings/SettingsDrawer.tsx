'use client'

import Link from 'next/link'
import { memo, useState, useCallback, useEffect } from 'react'
import { useStore, DEFAULT_SETTINGS, Settings } from '@/store/useStore'
import { apiFetch } from '@/lib/apiFetch'
import RuntimeEvalTrend from '@/components/ui/RuntimeEvalTrend'
import { PMHealthStrip } from '@/components/settings/PMHealthStrip'
import { PMChecklist }  from '@/components/settings/PMChecklist'

// ── Non-sensitive fields — stored in Zustand / localStorage ──────────────────
const LOCAL_FIELDS: { key: keyof Settings; label: string; type?: string; placeholder?: string }[] = [
  { key: 'aiProvider',    label: 'AI Provider (openai | anthropic | minimax)' },
  { key: 'localEndpoint', label: 'Local LLM Endpoint',       placeholder: 'http://localhost:11434/v1/...' },
  { key: 'localModel',    label: 'Local Model Name',         placeholder: 'qwen3:8b' },
  { key: 'localApiKey',   label: 'Local / OpenRouter Key',   type: 'password' },
  { key: 'userName',      label: 'Your Name' },
  { key: 'userGoals',     label: 'Goals',                    placeholder: 'SaaS, $4K/mo, freelance…' },
  { key: 'userSkills',    label: 'Skills',                   placeholder: 'Python, copywriting…' },
  { key: 'userLearning',  label: 'Currently Learning' },
  { key: 'userContext',   label: 'Extra Context for AI' },
  { key: 'alertKeywords', label: 'Alert Keywords (comma-separated)' },
]

// ── Sensitive fields shown in the drawer ─────────────────────────────────────
const SENSITIVE_FIELDS: { key: keyof Settings; label: string; envKey: string; placeholder?: string }[] = [
  { key: 'apiKey',       label: 'Claude / Anthropic API Key',  envKey: 'ANTHROPIC_API_KEY',  placeholder: 'sk-ant-...' },
  { key: 'minimaxKey',   label: 'MiniMax API Key',               envKey: 'MINIMAX_API_KEY',   placeholder: 'platform.minimax.io' },
  { key: 'braveKey',     label: 'Brave Search API Key',        envKey: 'BRAVE_SEARCH_KEY',   placeholder: 'Get free at search.brave.com' },
  { key: 'cgKey',        label: 'CoinGecko Demo Key',          envKey: 'COINGECKO_KEY' },
  { key: 'finnhubKey',   label: 'Finnhub Key',                 envKey: 'FINNHUB_KEY' },
  { key: 'nvdKey',       label: 'NVD API Key',                 envKey: 'NVD_KEY' },
  { key: 'guardianKey',  label: 'Guardian API Key',            envKey: 'GUARDIAN_KEY' },
  { key: 'fredKey',      label: 'FRED API Key',                envKey: 'FRED_KEY' },
  { key: 'otxKey',       label: 'AlienVault OTX Key',          envKey: 'OTX_KEY' },
  { key: 'aisstreamKey', label: 'AISStream Key',               envKey: 'AISSTREAM_KEY' },
  { key: 'firmsKey',     label: 'NASA FIRMS Key',              envKey: 'FIRMS_MAP_KEY' },
  { key: 'firecrawlKey', label: 'Firecrawl Key',               envKey: 'FIRECRAWL_KEY' },
]

interface Props {
  open:    boolean
  onClose: () => void
}

// Wrapped in memo — settings rarely change so this prevents unnecessary re-renders
// triggered by unrelated store writes (e.g. price updates every 60s).
const SettingsDrawer = memo(function SettingsDrawer({ open, onClose }: Props) {
  // Narrow selector: subscribes only to the settings slice, not the full store.
  // Zustand will only re-render this component when `settings` itself changes.
  const settings       = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)

  // Track local edits to sensitive fields before save (never stored in Zustand)
  const [sensitiveEdits, setSensitiveEdits] = useState<Record<string, string>>({})
  // Server-side key status from GET /api/settings
  const [keyStatus, setKeyStatus] = useState<Record<string, boolean>>({})

  const [saved,    setSaved]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saveErr,  setSaveErr]  = useState('')

  // Load key status whenever drawer opens
  useEffect(() => {
    if (!open) return
    apiFetch('/api/settings')
      .then((r) => r.json())
      .then((d) => { if (d.status) setKeyStatus(d.status) })
      .catch(() => { /* non-fatal */ })
  }, [open])

  const handleSensitiveChange = (envKey: string, value: string) => {
    setSensitiveEdits((prev) => ({ ...prev, [envKey]: value }))
  }

  const save = useCallback(async () => {
    setSaving(true)
    setSaveErr('')

    // POST sensitive keys to server if any were edited
    const hasServerKeys = Object.keys(sensitiveEdits).length > 0
    if (hasServerKeys) {
      try {
        const r = await apiFetch('/api/settings', {
          method: 'POST',
          body:   JSON.stringify(sensitiveEdits),
        })
        const d = await r.json()
        if (!d.ok) {
          setSaveErr(d.error ?? 'Failed to save API keys.')
          setSaving(false)
          return
        }
        if (d.needsRestart) {
          setSaveErr('Keys saved. Restart the dev server to apply them.')
        }
        // Refresh key status
        apiFetch('/api/settings')
          .then((r2) => r2.json())
          .then((d2) => { if (d2.status) setKeyStatus(d2.status) })
          .catch(() => {})
        // Clear the in-memory edits
        setSensitiveEdits({})
      } catch {
        setSaveErr('Could not reach the server. Is Next.js running?')
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }, [sensitiveEdits])

  const reset = useCallback(() => {
    updateSettings(DEFAULT_SETTINGS)
    setSensitiveEdits({})
  }, [updateSettings])

  // ── Exit animation ───────────────────────────────────────────────────────────
  const [closing, setClosing] = useState(false)
  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => { setClosing(false); onClose() }, 220)
  }, [onClose])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1100,
          opacity: closing ? 0 : 1,
          transition: 'opacity .22s var(--t, ease)',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(440px, 100vw)',
        background: 'var(--surf)',
        borderLeft: '1px solid var(--border)',
        zIndex: 1200,
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
        transform: closing ? 'translateX(100%)' : 'translateX(0)',
        transition: 'transform .22s cubic-bezier(.4,0,.2,1)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '16px 18px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--surf)', zIndex: 1,
        }}>
          <span style={{ fontWeight: 900, fontSize: '14px', color: 'var(--text)' }}>⚙️ Settings</span>
          <button
            onClick={handleClose}
            style={{
              marginLeft: 'auto', background: 'transparent', border: 'none',
              color: 'var(--text2)', fontSize: '18px', cursor: 'pointer', padding: '0 4px',
            }}
          >✕</button>
        </div>

        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── Server-Side API Keys section ── */}
          <div>
            <div style={{
              fontSize: '10px', fontWeight: 700, color: 'var(--accent)',
              textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              🔒 API Keys
              <span style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 400, textTransform: 'none' }}>
                — stored server-side in .env.local, never in browser
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {SENSITIVE_FIELDS.map(({ key, label, envKey, placeholder }) => {
                const isSet = keyStatus[envKey] === true
                return (
                  <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, color: 'var(--text3)',
                      textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      {label}
                      <span style={{
                        fontSize: '10px', fontWeight: 700,
                        color: isSet ? 'var(--fhi)' : 'var(--text3)',
                      }}>
                        {isSet ? '● set' : '○ not set'}
                      </span>
                    </span>
                    <input
                      type="password"
                      value={sensitiveEdits[envKey] ?? ''}
                      placeholder={isSet ? '••••••••••••• (already set)' : placeholder ?? 'Paste key…'}
                      onChange={(e) => handleSensitiveChange(envKey, e.target.value)}
                      style={{
                        background: 'var(--surf2)', border: '1px solid var(--border2)',
                        borderRadius: '6px', color: 'var(--text)', fontSize: '12px',
                        padding: '7px 10px', outline: 'none', width: '100%', boxSizing: 'border-box',
                        fontFamily: 'monospace',
                      }}
                    />
                  </label>
                )
              })}
            </div>
          </div>

          {/* ── Local settings section ── */}
          <div>
            <div style={{
              fontSize: '10px', fontWeight: 700, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px',
            }}>
              App Settings
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {LOCAL_FIELDS.map(({ key, label, type, placeholder }) => {
                const val = settings[key]
                if (Array.isArray(val) || typeof val === 'object') return null
                return (
                  <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>
                      {label}
                    </span>
                    <input
                      type={type ?? 'text'}
                      value={String(val ?? '')}
                      placeholder={placeholder}
                      onChange={(e) => updateSettings({ [key]: e.target.value } as Partial<Settings>)}
                      style={{
                        background: 'var(--surf2)', border: '1px solid var(--border2)',
                        borderRadius: '6px', color: 'var(--text)', fontSize: '12px',
                        padding: '7px 10px', outline: 'none', width: '100%', boxSizing: 'border-box',
                      }}
                    />
                  </label>
                )
              })}
            </div>

            {/* Operational profiles: auto-jobs controls */}
            <div style={{ marginTop: 14, padding: '10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surf2)' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
                Operational Auto Jobs
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>
                  Office VFX Quality
                </span>
                <select
                  value={String(settings.officeVfxQuality ?? 'low')}
                  onChange={(e) => updateSettings({ officeVfxQuality: e.target.value as any } as Partial<Settings>)}
                  style={{
                    background: 'var(--surf)', border: '1px solid var(--border2)',
                    borderRadius: '6px', color: 'var(--text)', fontSize: '12px',
                    padding: '7px 10px', outline: 'none', width: '100%', boxSizing: 'border-box',
                  }}
                >
                  <option value="off">Off</option>
                  <option value="low">Low (recommended)</option>
                  <option value="high">High</option>
                </select>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={Boolean(settings.enableWarAutoJobs)}
                  onChange={(e) => updateSettings({ enableWarAutoJobs: e.target.checked } as Partial<Settings>)}
                />
                <span style={{ fontSize: 12, color: 'var(--text)' }}>Enable War Room auto jobs</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={Boolean(settings.enableNightOpsAutoJobs)}
                  onChange={(e) => updateSettings({ enableNightOpsAutoJobs: e.target.checked } as Partial<Settings>)}
                />
                <span style={{ fontSize: 12, color: 'var(--text)' }}>Enable Night Ops auto jobs</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={Boolean(settings.agentHighRiskWritesRequireApproval)}
                  onChange={(e) => updateSettings({ agentHighRiskWritesRequireApproval: e.target.checked } as Partial<Settings>)}
                />
                <span style={{ fontSize: 12, color: 'var(--text)' }}>Require approval for high-risk write tools</span>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>
                  Global Auto Job Cooldown (minutes)
                </span>
                <input
                  type="number"
                  min={10}
                  max={180}
                  value={Number(settings.autoOpsJobCooldownMin ?? 30)}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    const safe = Number.isFinite(n) ? Math.max(10, Math.min(180, n)) : 30
                    updateSettings({ autoOpsJobCooldownMin: safe } as Partial<Settings>)
                  }}
                  style={{
                    background: 'var(--surf)', border: '1px solid var(--border2)',
                    borderRadius: '6px', color: 'var(--text)', fontSize: '12px',
                    padding: '7px 10px', outline: 'none', width: '100%', boxSizing: 'border-box',
                  }}
                />
              </label>
            </div>

            <PMHealthStrip />
            <PMChecklist />
            <RuntimeEvalTrend />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '8px',
          padding: '16px 18px', borderTop: '1px solid var(--border)',
          position: 'sticky', bottom: 0, background: 'var(--surf)',
        }}>
          <Link
            href="/resources"
            onClick={onClose}
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--accent)',
              textDecoration: 'none',
              marginBottom: '2px',
            }}
          >
            📚 Field manual — certification, interviews, agent resources →
          </Link>
          {saveErr && (
            <div style={{ fontSize: '11px', color: saveErr.includes('Restart') ? 'var(--fmd)' : 'var(--flo)', lineHeight: 1.4 }}>
              {saveErr}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={save}
              disabled={saving}
              style={{
                flex: 1, height: '34px', borderRadius: '7px',
                background: saving ? 'var(--border2)' : 'var(--accent)',
                border: 'none', color: '#fff', fontSize: '12px',
                fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Settings'}
            </button>
            <button
              onClick={reset}
              style={{
                height: '34px', padding: '0 14px', borderRadius: '7px',
                background: 'transparent', border: '1px solid var(--border2)',
                color: 'var(--text2)', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </>
  )
})

export default SettingsDrawer
