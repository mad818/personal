// ── hooks/useUIRules.ts ────────────────────────────────────────────────────────
// Evaluates UI_RULES against live store state every 30s.
// Updates activeUIRuleIds in the store.
// Pure: no side effects except the store update.
"use client";
import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import { buildSnapshot, evaluateRules, UI_RULES } from "@/lib/uiRules";

export function useUIRules(): void {
  const signals     = useStore((s) => s.signals);
  const cves        = useStore((s) => s.cves);
  const worldRisk   = useStore((s) => s.worldRisk);
  const prices      = useStore((s) => s.prices);
  const agentRuntime = useStore((s) => s.agentRuntime);
  const dismissedRuleIds = useStore((s) => s.dismissedRuleIds);
  const setActiveUIRuleIds = useStore((s) => s.setActiveUIRuleIds);

  function evaluate() {
    try {
      const snapshot = buildSnapshot({ signals, cves, worldRisk, prices, agentRuntime });
      const allActive = evaluateRules(snapshot, UI_RULES);
      const filtered = allActive.filter((id) => !dismissedRuleIds.includes(id));
      setActiveUIRuleIds(filtered);
    } catch {
      // Never crash the app
    }
  }

  // Run on every relevant store change
  useEffect(() => { evaluate(); }, [signals, cves, worldRisk, prices, agentRuntime, dismissedRuleIds, setActiveUIRuleIds]);

  // Also poll every 30s for time-based rules (market hours)
  useEffect(() => {
    const id = setInterval(evaluate, 30_000);
    return () => clearInterval(id);
  }, [signals, cves, worldRisk, prices, agentRuntime, dismissedRuleIds, setActiveUIRuleIds]);
}
