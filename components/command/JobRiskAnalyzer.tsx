'use client'

import { useState, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/ai'

// ── Benchmark jobs (Karpathy rubric, 0–10) ────────────────────────────────────
const BENCHMARKS: { job: string; score: number; category: string }[] = [
  { job: 'Medical Transcriptionist',  score: 10,  category: 'Admin' },
  { job: 'Data Entry Clerk',          score: 9.5, category: 'Admin' },
  { job: 'Paralegal',                 score: 9,   category: 'Legal' },
  { job: 'Software Developer',        score: 8.5, category: 'Tech' },
  { job: 'Data Analyst',              score: 8.5, category: 'Tech' },
  { job: 'Copywriter / Content Writer', score: 8, category: 'Creative' },
  { job: 'Accountant',                score: 7.5, category: 'Finance' },
  { job: 'Financial Analyst',         score: 7.5, category: 'Finance' },
  { job: 'Graphic Designer',          score: 7,   category: 'Creative' },
  { job: 'Customer Support Agent',    score: 7,   category: 'Service' },
  { job: 'Marketing Manager',         score: 6.5, category: 'Business' },
  { job: 'Radiologist',               score: 6,   category: 'Medical' },
  { job: 'HR Specialist',             score: 6,   category: 'Business' },
  { job: 'Truck Driver',              score: 5.5, category: 'Transport' },
  { job: 'Pharmacist',                score: 5,   category: 'Medical' },
  { job: 'Physician',                 score: 4.5, category: 'Medical' },
  { job: 'Nurse (RN)',                score: 4,   category: 'Medical' },
  { job: 'Retail Sales Worker',       score: 4,   category: 'Service' },
  { job: 'Electrician',               score: 2.5, category: 'Trades' },
  { job: 'Plumber',                   score: 2,   category: 'Trades' },
  { job: 'Carpenter',                 score: 1.5, category: 'Trades' },
  { job: 'Janitor',                   score: 1,   category: 'Trades' },
  { job: 'Roofer',                    score: 0.5, category: 'Trades' },
]

function riskColor(score: number): string {
  if (score >= 8) return '#ef4444'
  if (score >= 6) return '#f59e0b'
  if (score >= 4) return '#a78bfa'
  return '#10b981'
}

function riskLabel(score: number): string {
  if (score >= 8) return 'High Risk'
  if (score >= 6) return 'Elevated'
  if (score >= 4) return 'Moderate'
  if (score >= 2) return 'Low Risk'
  return 'Very Safe'
}

// ── Scoring rubric (mirrors Karpathy's criteria) ──────────────────────────────
const RUBRIC = `
Score each job 0-10 using this rubric:
- Work product is fundamentally digital (text, code, data, images): +3
- Job can be done entirely from a home office: +2
- Tasks are repetitive or follow defined rules/patterns: +2
- Requires specialised physical skill, manual dexterity, or on-site presence: -3
- Requires real-time empathy, crisis management, or human trust: -2
- Requires creativity that depends on embodied human experience: -1
Average score across all 342 BLS occupations: 5.3/10
`

export default function JobRiskAnalyzer() {
  const settings = useStore((s) => s.settings)
  const [jobInput,  setJobInput]  = useState(settings.userSkills ? '' : '')
  const [result,    setResult]    = useState<{ score: number; rationale: string; actions: string[] } | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [showAll,   setShowAll]   = useState(false)

  const displayed = showAll ? BENCHMARKS : BENCHMARKS.slice(0, 8)

  const analyse = useCallback(async () => {
    const job = jobInput.trim()
    if (!job) return
    if (!settings.apiKey) {
      setResult({ score: -1, rationale: 'Add your API key in Settings to run the analysis.', actions: [] })
      return
    }

    setLoading(true)
    setResult(null)
    try {
      const userCtx = [
        settings.userName ? `User name: ${settings.userName}` : '',
        settings.userSkills ? `Skills: ${settings.userSkills}` : '',
        settings.userGoals  ? `Goals: ${settings.userGoals}`  : '',
        settings.userContext ? `Context: ${settings.userContext}` : '',
      ].filter(Boolean).join('\n')

      const prompt = `
You are an AI labour economist applying Andrej Karpathy's job displacement scoring rubric.

${RUBRIC}

Job to score: "${job}"
${userCtx ? `\nAbout the person:\n${userCtx}` : ''}

Respond with valid JSON only, no markdown fences:
{
  "score": <number 0-10, one decimal>,
  "rationale": "<2-3 sentence explanation of the score>",
  "actions": ["<specific action 1>", "<specific action 2>", "<specific action 3>"]
}

The actions should be concrete steps this specific person can take right now to reduce their AI displacement risk or pivot toward higher-value work. Be direct and personal.
`.trim()

      const raw   = await callAI(prompt, 500)
      const match = raw.match(/\{[\s\S]*\}/)
      const json  = JSON.parse(match?.[0] ?? raw)
      setResult({ score: Number(json.score), rationale: json.rationale, actions: json.actions ?? [] })
    } catch {
      setResult({ score: -1, rationale: 'Analysis failed. Check your API key in Settings.', actions: [] })
    } finally {
      setLoading(false)
    }
  }, [jobInput, settings])

  return (
    <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px', marginTop: '18px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text)' }}>🤖 AI Job Risk Analyzer</span>
        <span style={{
          fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px',
          background: 'rgba(79,110,247,.15)', color: 'var(--accent)',
        }}>Karpathy Rubric</span>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '14px' }}>
        Scores your role 0–10 on AI displacement risk. Average across 342 BLS occupations: 5.3/10.
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <input
          type="text"
          value={jobInput}
          onChange={(e) => setJobInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && analyse()}
          placeholder="Enter your job title or role…"
          style={{
            flex: 1, height: '34px', padding: '0 11px',
            background: 'var(--surf3)', border: '1px solid var(--border2)',
            borderRadius: '7px', color: 'var(--text)', fontSize: '12px', outline: 'none',
          }}
        />
        <button
          onClick={analyse}
          disabled={loading || !jobInput.trim()}
          style={{
            height: '34px', padding: '0 16px', borderRadius: '7px',
            background: 'var(--accent)', border: 'none',
            color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            opacity: loading || !jobInput.trim() ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Scoring…' : 'Analyse'}
        </button>
      </div>

      {/* Result */}
      {result && result.score >= 0 && (
        <div style={{
          padding: '14px', borderRadius: '9px',
          background: `${riskColor(result.score)}14`,
          border: `1px solid ${riskColor(result.score)}33`,
          marginBottom: '14px',
        }}>
          {/* Score display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{
              fontSize: '28px', fontWeight: 900, color: riskColor(result.score),
              lineHeight: 1,
            }}>{result.score.toFixed(1)}</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: riskColor(result.score) }}>
                {riskLabel(result.score)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text3)' }}>out of 10</div>
            </div>
            {/* Bar */}
            <div style={{ flex: 1, height: '6px', background: 'var(--surf3)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                width: `${(result.score / 10) * 100}%`,
                height: '100%', borderRadius: '3px',
                background: riskColor(result.score),
                transition: 'width .5s',
              }} />
            </div>
          </div>

          {/* Rationale */}
          <p style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.6, margin: '0 0 10px' }}>
            {result.rationale}
          </p>

          {/* Actions */}
          {result.actions.length > 0 && (
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Your action plan
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {result.actions.map((a, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: '7px', alignItems: 'flex-start',
                    fontSize: '12px', color: 'var(--text)', lineHeight: 1.5,
                  }}>
                    <span style={{
                      minWidth: '18px', height: '18px', borderRadius: '50%',
                      background: riskColor(result.score),
                      color: '#fff', fontSize: '10px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: '1px',
                    }}>{i + 1}</span>
                    {a}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {result && result.score < 0 && (
        <div style={{ fontSize: '12px', color: 'var(--flo)', marginBottom: '14px' }}>
          {result.rationale}
        </div>
      )}

      {/* Benchmark table */}
      <div>
        <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' }}>
          Benchmark scores (BLS occupations)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {displayed.map((b) => (
            <div key={b.job} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '5px 8px', borderRadius: '6px',
              background: 'var(--surf3)',
            }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text)', flex: 1 }}>{b.job}</span>
              <span style={{ fontSize: '10px', color: 'var(--text3)', width: '56px' }}>{b.category}</span>
              {/* Mini bar */}
              <div style={{ width: '70px', height: '4px', background: 'var(--surf)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${(b.score / 10) * 100}%`, height: '100%', background: riskColor(b.score), borderRadius: '2px' }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: riskColor(b.score), width: '26px', textAlign: 'right' }}>
                {b.score}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowAll((v) => !v)}
          style={{
            marginTop: '8px', background: 'transparent', border: 'none',
            color: 'var(--accent)', fontSize: '11px', fontWeight: 700,
            cursor: 'pointer', padding: '2px 0',
          }}
        >
          {showAll ? '▲ Show less' : `▼ Show all ${BENCHMARKS.length} benchmarks`}
        </button>
      </div>
    </div>
  )
}
