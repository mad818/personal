// ── hooks/useUIRules.ts ────────────────────────────────────────────────────────
// Evaluates UI_RULES against live store state every 30s.
// Updates activeUIRuleIds in the store.
// Pure: no side effects except the store update.
"use client";
import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import {
  buildSnapshot,
  evaluateRuleMatches,
  filterDismissedRuleMatches,
  UI_RULES,
} from "@/lib/uiRules";

export function useUIRules(): void {
  const signals     = useStore((s) => s.signals);
  const cves        = useStore((s) => s.cves);
  const worldRisk   = useStore((s) => s.worldRisk);
  const prices      = useStore((s) => s.prices);
  const agentRuntime = useStore((s) => s.agentRuntime);
  const councilMode = useStore((s) => s.councilMode);
  const dismissedUIRuleKeys = useStore((s) => s.dismissedUIRuleKeys);
  const setActiveUIRuleIds = useStore((s) => s.setActiveUIRuleIds);

  function evaluate() {
    try {
      const snapshot = buildSnapshot({
        signals,
        cves,
        worldRisk,
        prices,
        agentRuntime,
        councilMode,
      });
      const allActive = evaluateRuleMatches(snapshot, UI_RULES);
      const filtered = filterDismissedRuleMatches(allActive, dismissedUIRuleKeys);
      setActiveUIRuleIds(filtered.map((match) => match.id));
    } catch {
      // Never crash the app
    }
  }

  // Run on every relevant store change
  useEffect(() => {
    evaluate();
  }, [
    signals,
    cves,
    worldRisk,
    prices,
    agentRuntime,
    councilMode,
    dismissedUIRuleKeys,
    setActiveUIRuleIds,
  ]);

  // Also poll every 30s for time-based rules (market hours)
  useEffect(() => {
    const id = setInterval(evaluate, 30_000);
    return () => clearInterval(id);
  }, [
    signals,
    cves,
    worldRisk,
    prices,
    agentRuntime,
    councilMode,
    dismissedUIRuleKeys,
    setActiveUIRuleIds,
  ]);
}
