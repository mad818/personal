'use client'

import { useState, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/ai'

// ── Stage definitions ────────────────────────────────────────────────────────
type StageKey = 'validate' | 'offer' | 'outreach' | 'close' | 'deliver'

interface Stage {
  key:      StageKey
  label:    string
  goal:     string
  checks:   string[]
  prompt:   string
}

const STAGES: Stage[] = [
  {
    key:   'validate',
    label: '1 · Validate',
    goal:  'Confirm demand before building anything',
    checks: [
      'Identified 10 potential clients',
      'Talked to at least 3 people about the problem',
      'Defined the one core pain you solve',
      'Priced a solution hypothesis',
    ],
    prompt: 'You are a startup advisor. The user wants to start a service business targeting $4K/month. Help them validate their idea with 3 specific, actionable steps they can take this week. Be concise and direct. No fluff.',
  },
  {
    key:   'offer',
    label: '2 · Build Offer',
    goal:  'Package the service into a clear, sellable offer',
    checks: [
      'Written a one-sentence value proposition',
      'Defined deliverables and timeline',
      'Set pricing (retainer or project-based)',
      'Created a simple one-page PDF or Notion doc',
    ],
    prompt: 'You are a service business coach. The user has validated demand and now needs to package their offer. Give them 3 specific steps to create a compelling, premium offer this week. Focus on positioning and pricing.',
  },
  {
    key:   'outreach',
    label: '3 · Outreach',
    goal:  'Get conversations with qualified prospects',
    checks: [
      'Built list of 20 cold prospects',
      'Written a cold outreach message (email or DM)',
      'Sent first 10 outreach messages',
      'Set up a simple booking link (Cal.com or Calendly)',
    ],
    prompt: 'You are a B2B sales coach. The user has an offer and needs to start outreach. Give them 3 concrete steps to get their first sales conversations this week. Include a short cold outreach template.',
  },
  {
    key:   'close',
    label: '4 · Close',
    goal:  'Turn conversations into paying clients',
    checks: [
      'Had at least 3 discovery calls',
      'Sent a proposal or simple contract',
      'Followed up with every prospect',
      'Closed first paying client',
    ],
    prompt: 'You are a sales closer. The user is having discovery calls and needs to close deals. Give them 3 specific steps to close their first client this week. Include one objection-handling tip.',
  },
  {
    key:   'deliver',
    label: '5 · Deliver & Scale',
    goal:  'Deliver great work and generate referrals',
    checks: [
      'Onboarded first client with a clear process',
      'Set up a weekly check-in or reporting cadence',
      'Delivered first milestone on time',
      'Asked for a referral or testimonial',
    ],
    prompt: 'You are a service business operator. The user has a paying client and needs to deliver great work and scale to $4K/month. Give them 3 specific steps for this week to systemize delivery and get referrals.',
  },
]

const REVENUE_TARGET = 4000

// ── Component ────────────────────────────────────────────────────────────────
export default function BusinessBuilder() {
  const settings = useStore((s) => s.settings)
  const [activeStage, setActiveStage] = useState<StageKey>('validate')
  const [checks, setChecks]           = useState<Record<string, boolean>>({})
  const [revenue, setRevenue]         = useState(0)
  const [aiOut,   setAiOut]           = useState('')
  const [loading, setLoading]         = useState(false)

  const stage = STAGES.find((s) => s.key === activeStage) ?? STAGES[0]

  const toggleCheck = useCallback((id: string) => {
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const progress = (() => {
    const total    = stage.checks.length
    const done     = stage.checks.filter((_, i) => checks[`${stage.key}-${i}`]).length
    return total > 0 ? Math.round((done / total) * 100) : 0
  })()

  const runAction = useCallback(async () => {
    if (!settings.apiKey) {
      setAiOut('Add your API key in Settings to get AI guidance.')
      return
    }
    setLoading(true)
    setAiOut('')
    try {
      const userCtx = settings.userContext ? `\nContext about the user: ${settings.userContext}` : ''
      const result  = await callAI(stage.prompt + userCtx, 400)
      setAiOut(result)
    } catch {
      setAiOut('Could not get AI response. Check your API key in Settings.')
    } finally {
      setLoading(false)
    }
  }, [settings.apiKey, settings.userContext, stage.prompt])

  const revenueColor = revenue >= REVENUE_TARGET
    ? 'var(--fhi)' : revenue >= REVENUE_TARGET * 0.5
    ? 'var(--fmd)' : 'var(--flo)'

  return (
    <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text)' }}>
          🏗 Business Builder
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600 }}>
          Goal: ${REVENUE_TARGET.toLocaleString()}/month
        </span>

        {/* Revenue tracker */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10.5px', color: 'var(--text3)', fontWeight: 600 }}>MRR $</span>
          <input
            type="number"
            min={0}
            value={revenue || ''}
            placeholder="0"
            onChange={(e) => setRevenue(Number(e.target.value))}
            style={{
              width: '72px', height: '26px', padding: '0 7px',
              background: 'var(--surf3)', border: '1px solid var(--border2)',
              borderRadius: '6px', color: revenueColor,
              fontSize: '12px', fontWeight: 700, outline: 'none',
            }}
          />
          <span style={{ fontSize: '10.5px', color: revenueColor, fontWeight: 700 }}>
            / ${REVENUE_TARGET.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Revenue progress bar */}
      {revenue > 0 && (
        <div style={{ height: '3px', background: 'var(--surf3)', borderRadius: '2px', overflow: 'hidden', marginBottom: '14px' }}>
          <div style={{
            width: `${Math.min(100, (revenue / REVENUE_TARGET) * 100)}%`,
            height: '100%', background: revenueColor, borderRadius: '2px',
            transition: 'width 0.4s',
          }} />
        </div>
      )}

      {/* Stage tabs */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {STAGES.map((s) => {
          const stageChecks  = s.checks.filter((_, i) => checks[`${s.key}-${i}`]).length
          const stageDone    = stageChecks === s.checks.length
          return (
            <button
              key={s.key}
              onClick={() => setActiveStage(s.key)}
              style={{
                height: '28px', padding: '0 10px', borderRadius: '7px',
                fontSize: '10.5px', fontWeight: 700, cursor: 'pointer',
                border: '1px solid var(--border2)',
                background: activeStage === s.key ? 'var(--accent)' : stageDone ? 'rgba(16,185,129,.12)' : 'transparent',
                color: activeStage === s.key ? '#fff' : stageDone ? 'var(--fhi)' : 'var(--text3)',
              }}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Stage goal */}
      <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '10px', fontWeight: 600 }}>
        🎯 {stage.goal}
      </div>

      {/* Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
        {stage.checks.map((item, i) => {
          const id      = `${stage.key}-${i}`
          const checked = !!checks[id]
          return (
            <label
              key={id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px',
                cursor: 'pointer', padding: '6px 10px',
                background: checked ? 'rgba(16,185,129,.08)' : 'var(--surf3)',
                borderRadius: '7px', border: `1px solid ${checked ? 'rgba(16,185,129,.25)' : 'transparent'}`,
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleCheck(id)}
                style={{ marginTop: '2px', accentColor: 'var(--fhi)', cursor: 'pointer' }}
              />
              <span style={{
                fontSize: '12px', color: checked ? 'var(--fhi)' : 'var(--text)',
                textDecoration: checked ? 'line-through' : 'none',
                lineHeight: 1.4,
              }}>
                {item}
              </span>
            </label>
          )
        })}
      </div>

      {/* Stage progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <div style={{ flex: 1, height: '3px', background: 'var(--surf3)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width .4s' }} />
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 700 }}>{progress}%</span>
      </div>

      {/* AI action button */}
      <button
        onClick={runAction}
        disabled={loading}
        style={{
          width: '100%', height: '32px', borderRadius: '7px',
          background: 'var(--accent)', border: 'none',
          color: '#fff', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Getting guidance…' : '⚡ Get AI Action Plan for This Stage'}
      </button>

      {/* AI output */}
      {aiOut && (
        <div style={{
          marginTop: '12px', padding: '12px 14px',
          background: 'var(--surf3)', borderRadius: '8px',
          fontSize: '12px', color: 'var(--text)', lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
        }}>
          {aiOut}
        </div>
      )}
    </div>
  )
}
