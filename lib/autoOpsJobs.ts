import type { Settings } from '@/store/useStore'

export type AutoModeJob = {
  id: string
  name: string
  intervalMin: number
  prompt: string
  mode: 'war' | 'nightOps'
}

export const AUTO_MODE_JOBS: AutoModeJob[] = [
  {
    id: 'war-threat-sweep',
    name: 'War Threat Sweep',
    intervalMin: 20,
    mode: 'war',
    prompt:
      'Run a cyber + ops threat sweep using live dashboard context. Return top 3 risks, confidence, and immediate action priorities.',
  },
  {
    id: 'war-market-shock-watch',
    name: 'War Market Shock Watch',
    intervalMin: 30,
    mode: 'war',
    prompt:
      'Check for market shock signals tied to current geopolitics/cyber events. Return short risk posture and hedge/action suggestions.',
  },
  {
    id: 'night-anomaly-watch',
    name: 'Night Anomaly Watch',
    intervalMin: 45,
    mode: 'nightOps',
    prompt:
      'Run low-noise anomaly watch across security/cyber/ops data. Only report abnormal deltas, likely cause, and urgency.',
  },
  {
    id: 'night-morning-brief-prep',
    name: 'Morning Brief Prep',
    intervalMin: 60,
    mode: 'nightOps',
    prompt:
      'Prepare concise morning handoff notes from overnight events: what changed, why it matters, and what to check first.',
  },
]

export function isAutoOpsModeEnabled(mode: Settings['officeOperationalMode'], settings: Settings): boolean {
  if (mode === 'war') return Boolean(settings.enableWarAutoJobs)
  if (mode === 'nightOps') return Boolean(settings.enableNightOpsAutoJobs)
  return false
}

export function getAutoJobsForMode(mode: Settings['officeOperationalMode']): AutoModeJob[] {
  if (mode === 'war' || mode === 'nightOps') return AUTO_MODE_JOBS.filter((j) => j.mode === mode)
  return []
}

