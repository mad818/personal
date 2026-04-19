// ── components/home/UIRulesEvaluator.tsx ──────────────────────────────────────
// Client component that runs the useUIRules hook.
// This is a wrapper to enable server/client boundary.
"use client";
import { useUIRules } from "@/hooks/useUIRules";

export default function UIRulesEvaluator() {
  useUIRules();
  return null;
}
