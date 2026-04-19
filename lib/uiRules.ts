// ── lib/uiRules.ts ─────────────────────────────────────────────────────────────
// Context-aware UI rules engine.
// Evaluates pure conditions against live dashboard state and returns
// active rule matches plus presentation-ready copies. No side effects.

import type { NexusLiveSnapshot, UIRule } from "@/components/home/office/types";

export interface ActiveUIRuleMatch {
  id: string;
  priority: number;
  activationKey: string;
  rule: UIRule;
}

export interface ResolvedActiveUIRule extends ActiveUIRuleMatch {
  title?: string;
  body?: string;
  badgeLabel?: string;
  indicatorText?: string;
}

function bucket(value: number, size: number) {
  return Math.floor(value / size);
}

// ── Rule definitions ──────────────────────────────────────────────────────────
export const UI_RULES: UIRule[] = [
  {
    id: "fg-extreme-fear",
    label: "Extreme Fear",
    priority: 100,
    action: "float-card",
    when: (s) => s.fg.value <= 20,
    activationKey: (s) => `fg-extreme-fear:${bucket(s.fg.value, 5)}`,
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
    activationKey: (s) => `fg-extreme-greed:${bucket(s.fg.value, 5)}`,
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
    activationKey: (s) => `cve-spike:${s.cveCount.critical}`,
    badge: { tab: "cyber", color: "var(--flo)", label: "!" },
  },
  {
    id: "world-risk-elevated",
    label: "Elevated World Risk",
    priority: 85,
    action: "float-card",
    ttl: 300_000,
    when: (s) => s.worldRisk >= 70,
    activationKey: (s) => `world-risk-elevated:${bucket(s.worldRisk, 5)}`,
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
    activationKey: (s) => `parliament-mode:${s.agentBusy}`,
    indicator: { text: "{{agentBusy}} agents active", color: "var(--accent)" },
  },
  {
    id: "btc-spike-up",
    label: "BTC Surge",
    priority: 70,
    action: "float-card",
    ttl: 120_000,
    when: (s) => s.btcChgPct >= 5,
    activationKey: (s) => `btc-spike-up:${bucket(s.btcChgPct, 1)}`,
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
    activationKey: (s) => `btc-spike-down:${bucket(Math.abs(s.btcChgPct), 1)}`,
    card: {
      emoji: "📉",
      title: "BTC Drop {{btcChgPct}}%",
      body: "Bitcoin dropped {{btcChgPct}}% in the last period. Check ALPHA for FLUX analysis and CIPHER for related security events.",
      color: "var(--flo)",
    },
  },
  {
    id: "market-hours",
    label: "Market Hours",
    priority: 50,
    action: "nav-badge",
    when: (s) => s.isWeekday && s.hour >= 9 && s.hour < 16,
    activationKey: (s) => `market-hours:${s.dayKey}`,
    badge: { tab: "alpha", color: "var(--fhi)", label: "●" },
  },
];

// ── Snapshot builder ──────────────────────────────────────────────────────────
export function buildSnapshot(state: {
  signals?: { fg?: { value?: number; label?: string } | null };
  cves?: unknown[];
  worldRisk?: number;
  agentRuntime?: { status?: string };
  prices?: Record<string, { chg?: number }>;
  councilMode?: boolean;
  now?: Date | number;
}): NexusLiveSnapshot {
  const fg = state.signals?.fg ?? { value: 50, label: "Neutral" };
  const fgValue =
    fg && typeof fg === "object" && "value" in fg ? fg.value : 50;
  const fgLabel =
    fg && typeof fg === "object" && "label" in fg ? fg.label : "Neutral";
  const normalizedFgValue =
    typeof fgValue === "number" || typeof fgValue === "string"
      ? Number(fgValue)
      : 50;
  const normalizedFgLabel =
    typeof fgLabel === "string" && fgLabel.trim().length > 0
      ? fgLabel
      : "Neutral";

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

  const now = state.now instanceof Date ? state.now : new Date(state.now ?? Date.now());
  const hour = now.getHours();
  const dow = now.getDay();
  const isWeekday = dow >= 1 && dow <= 5;
  const dayKey = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const isRuntimeRunning = state.agentRuntime?.status === "running";
  const agentBusy = isRuntimeRunning ? (state.councilMode ? 3 : 1) : 0;
  const btcChgPct = state.prices?.bitcoin?.chg ?? 0;

  return {
    fg: { value: Number.isFinite(normalizedFgValue) ? normalizedFgValue : 50, label: normalizedFgLabel },
    cveCount: { critical: criticalCves, high: highCves },
    worldRisk: state.worldRisk ?? 0,
    hour,
    dayKey,
    isWeekday,
    agentBusy,
    btcChgPct,
  };
}

// ── Template resolver ─────────────────────────────────────────────────────────
export function resolveTemplate(template: string, s: NexusLiveSnapshot): string {
  return template
    .replace(/\{\{fg\.value\}\}/g, String(Math.round(s.fg.value)))
    .replace(/\{\{fg\.label\}\}/g, s.fg.label)
    .replace(/\{\{worldRisk\}\}/g, String(Math.round(s.worldRisk)))
    .replace(/\{\{agentBusy\}\}/g, String(s.agentBusy))
    .replace(/\{\{btcChgPct\}\}/g, (s.btcChgPct >= 0 ? "+" : "") + s.btcChgPct.toFixed(1))
    .replace(/\{\{cveCount\.critical\}\}/g, String(s.cveCount.critical));
}

export function buildRuleActivationKey(rule: UIRule, snapshot: NexusLiveSnapshot) {
  return rule.activationKey ? rule.activationKey(snapshot) : rule.id;
}

// ── Rule evaluators ───────────────────────────────────────────────────────────
export function evaluateRuleMatches(
  snapshot: NexusLiveSnapshot,
  rules: UIRule[],
): ActiveUIRuleMatch[] {
  const active: ActiveUIRuleMatch[] = [];
  for (const rule of rules) {
    try {
      if (rule.when(snapshot)) {
        active.push({
          id: rule.id,
          priority: rule.priority,
          activationKey: buildRuleActivationKey(rule, snapshot),
          rule,
        });
      }
    } catch {
      // Buggy rule — skip silently
    }
  }
  return active.sort((a, b) => b.priority - a.priority);
}

export function filterDismissedRuleMatches(
  matches: ActiveUIRuleMatch[],
  dismissedActivationKeys: string[],
): ActiveUIRuleMatch[] {
  if (dismissedActivationKeys.length === 0) return matches;
  const dismissed = new Set(dismissedActivationKeys);
  return matches.filter((match) => !dismissed.has(match.activationKey));
}

// Backward-compatible helper for older callers that only need rule IDs.
export function evaluateRules(snapshot: NexusLiveSnapshot, rules: UIRule[]): string[] {
  return evaluateRuleMatches(snapshot, rules).map((match) => match.id);
}

export function resolveActiveUIRules(
  snapshot: NexusLiveSnapshot,
  activeRuleIds: string[],
  rules: UIRule[] = UI_RULES,
): ResolvedActiveUIRule[] {
  if (activeRuleIds.length === 0) return [];
  const activeIds = new Set(activeRuleIds);
  return rules
    .filter((rule) => activeIds.has(rule.id))
    .sort((a, b) => b.priority - a.priority)
    .map((rule) => ({
      id: rule.id,
      priority: rule.priority,
      activationKey: buildRuleActivationKey(rule, snapshot),
      rule,
      title: rule.card ? resolveTemplate(rule.card.title, snapshot) : undefined,
      body: rule.card ? resolveTemplate(rule.card.body, snapshot) : undefined,
      badgeLabel: rule.badge ? resolveTemplate(rule.badge.label, snapshot) : undefined,
      indicatorText: rule.indicator
        ? resolveTemplate(rule.indicator.text, snapshot)
        : undefined,
    }));
}
