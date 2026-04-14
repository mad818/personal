// ── lib/uiRules.ts ─────────────────────────────────────────────────────────────
// Context-aware UI rules engine.
// Evaluates pure conditions against live dashboard state and returns
// the IDs of currently active rules. No side effects — all rendering
// is done by DynamicAlerts.tsx.
//
// Rules evaluate in priority order. Each rule's when() is wrapped in
// try/catch — a buggy rule never breaks the dashboard.

import type { NexusLiveSnapshot, UIRule } from "@/components/home/office/types";

// ── Rule definitions ──────────────────────────────────────────────────────────
export const UI_RULES: UIRule[] = [
  {
    id: "fg-extreme-fear",
    label: "Extreme Fear",
    priority: 100,
    action: "float-card",
    when: (s) => s.fg.value <= 20,
    card: {
      emoji: "⚠️",
      title: "Extreme Fear Signal",
      body: "Fear & Greed is at {{fg.value}} ({{fg.label}}). Historical inflection zone — contrarian opportunity or continued panic. Review ALPHA for positioning.",
      color: "var(--flo)",
    },
  },
  {
    id: "fg-extreme-greed",
    label: "Extreme Greed",
    priority: 95,
    action: "float-card",
    when: (s) => s.fg.value >= 80,
    card: {
      emoji: "🔥",
      title: "Extreme Greed Signal",
      body: "Fear & Greed is at {{fg.value}} ({{fg.label}}). Historically precedes corrections. FLUX recommends reviewing position sizing.",
      color: "var(--fhi)",
    },
  },
  {
    id: "cve-spike",
    label: "Critical CVE Spike",
    priority: 90,
    action: "nav-badge",
    when: (s) => s.cveCount.critical >= 5,
    badge: { tab: "cyber", color: "var(--flo)", label: "!" },
  },
  {
    id: "world-risk-elevated",
    label: "Elevated World Risk",
    priority: 85,
    action: "float-card",
    ttl: 300_000,
    when: (s) => s.worldRisk >= 70,
    card: {
      emoji: "🌍",
      title: "Elevated Geopolitical Risk",
      body: "World risk score is {{worldRisk}}/100. RECON and CIPHER context is heightened. Threat sweep recommended.",
      color: "var(--fmd)",
    },
  },
  {
    id: "parliament-mode",
    label: "Parliament Mode",
    priority: 80,
    action: "header-indicator",
    when: (s) => s.agentBusy >= 2,
    indicator: { text: "{{agentBusy}} agents active", color: "var(--accent)" },
  },
  {
    id: "market-hours",
    label: "Market Hours",
    priority: 50,
    action: "nav-badge",
    when: (s) => s.isWeekday && s.hour >= 9 && s.hour < 16,
    badge: { tab: "alpha", color: "var(--fhi)", label: "●" },
  },
  {
    id: "btc-spike-up",
    label: "BTC Surge",
    priority: 70,
    action: "float-card",
    ttl: 120_000,
    when: (s) => s.btcChgPct >= 5,
    card: {
      emoji: "⚡",
      title: "BTC Surge +{{btcChgPct}}%",
      body: "Bitcoin moved +{{btcChgPct}}% in the last period. FLUX has updated market analysis in ALPHA.",
      color: "var(--fhi)",
    },
  },
  {
    id: "btc-spike-down",
    label: "BTC Drop",
    priority: 70,
    action: "float-card",
    ttl: 120_000,
    when: (s) => s.btcChgPct <= -5,
    card: {
      emoji: "📉",
      title: "BTC Drop {{btcChgPct}}%",
      body: "Bitcoin dropped {{btcChgPct}}% in the last period. Check ALPHA for FLUX analysis and CIPHER for related security events.",
      color: "var(--flo)",
    },
  },
];

// ── Snapshot builder ──────────────────────────────────────────────────────────
// Reads from the Zustand store state shape.
// The `state` parameter is typed loosely to avoid importing the full store type.
export function buildSnapshot(state: {
  signals?: { fg?: { value?: number; label?: string } | null };
  cves?: unknown[];
  worldRisk?: number;
  agentRuntime?: { status?: string };
  prices?: Record<string, { chg?: number }>;
}): NexusLiveSnapshot {
  const fg = state.signals?.fg ?? { value: 50, label: "Neutral" };
  const fgValue = fg ? (typeof fg === 'object' && 'value' in fg ? fg.value : 50) : 50;
  const fgLabel = fg ? (typeof fg === 'object' && 'label' in fg ? fg.label : "Neutral") : "Neutral";

  const cves = state.cves ?? [];
  const criticalCves = cves.filter(
    (c: any) =>
      c.severity?.toLowerCase?.() === "critical" ||
      (c.cvssScore ?? c.score ?? 0) >= 9,
  ).length;
  const highCves = cves.filter(
    (c: any) =>
      c.severity?.toLowerCase?.() === "high" ||
      ((c.cvssScore ?? c.score ?? 0) >= 7 &&
        (c.cvssScore ?? c.score ?? 0) < 9),
  ).length;

  const now = new Date();
  const hour = now.getHours();
  const dow = now.getDay();
  const isWeekday = dow >= 1 && dow <= 5;

  // Count busy agents from runtime status
  const agentBusy =
    state.agentRuntime?.status === "running" ? 1 : 0;

  const btcChgPct = state.prices?.["bitcoin"]?.chg ?? 0;

  return {
    fg: { value: Number(fgValue), label: String(fgLabel) },
    cveCount: { critical: criticalCves, high: highCves },
    worldRisk: state.worldRisk ?? 0,
    hour,
    isWeekday,
    agentBusy,
    btcChgPct,
  };
}

// ── Template resolver ─────────────────────────────────────────────────────────
// Replaces {{fg.value}}, {{worldRisk}}, {{btcChgPct}} etc. in rule text.
export function resolveTemplate(template: string, s: NexusLiveSnapshot): string {
  return template
    .replace(/\{\{fg\.value\}\}/g, String(Math.round(s.fg.value)))
    .replace(/\{\{fg\.label\}\}/g, s.fg.label)
    .replace(/\{\{worldRisk\}\}/g, String(Math.round(s.worldRisk)))
    .replace(/\{\{agentBusy\}\}/g, String(s.agentBusy))
    .replace(/\{\{btcChgPct\}\}/g, (s.btcChgPct >= 0 ? "+" : "") + s.btcChgPct.toFixed(1))
    .replace(/\{\{cveCount\.critical\}\}/g, String(s.cveCount.critical));
}

// ── Rule evaluator ────────────────────────────────────────────────────────────
// Returns sorted active rule IDs (highest priority first).
// Each rule's when() is wrapped in try/catch — a bad rule never crashes the app.
export function evaluateRules(snapshot: NexusLiveSnapshot, rules: UIRule[]): string[] {
  const active: { id: string; priority: number }[] = [];
  for (const rule of rules) {
    try {
      if (rule.when(snapshot)) {
        active.push({ id: rule.id, priority: rule.priority });
      }
    } catch {
      // Buggy rule — skip silently
    }
  }
  return active
    .sort((a, b) => b.priority - a.priority)
    .map((r) => r.id);
}
