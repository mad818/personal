"use client";

import { useMemo } from "react";
import { ShellBadge } from "@/components/ui/shell";
import {
  listBlockedSkillCapabilities,
  summarizeSkillSpectrumPolicies,
} from "@/lib/skillSpectrumSummary";
import { SKILL_CAPABILITY_POLICIES } from "@/lib/skillSpectrumPolicy";

export default function SkillSpectrumValidatorStrip() {
  const summary = useMemo(() => summarizeSkillSpectrumPolicies(), []);
  const blocked = useMemo(() => listBlockedSkillCapabilities(), []);
  const reviewCount = useMemo(
    () =>
      SKILL_CAPABILITY_POLICIES.filter(
        (policy) => policy.riskLevel === "review",
      ).length,
    [],
  );

  return (
    <div
      style={{
        borderRadius: "12px",
        border: "1px solid rgba(96, 165, 250, 0.16)",
        background: "rgba(8, 18, 31, 0.46)",
        padding: "10px 12px",
        display: "grid",
        gap: "6px",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        <ShellBadge tone="accent">SkillSpector policy</ShellBadge>
        <ShellBadge tone="muted">Read-only validator</ShellBadge>
        {reviewCount > 0 ? (
          <ShellBadge tone="muted">{reviewCount} review gates</ShellBadge>
        ) : null}
      </div>
      <div
        className="nexus-shell-copy nexus-shell-copy--compact"
        style={{ fontSize: "11px", color: "var(--text2)", lineHeight: 1.5 }}
      >
        {summary}
      </div>
      {blocked.length > 0 ? (
        <div
          style={{ fontSize: "10px", color: "var(--text3)", lineHeight: 1.45 }}
        >
          Blocked tokens: {blocked.join(", ")}. CI runs{" "}
          <code>npm run agentshield:check</code> against skill markdown.
        </div>
      ) : null}
    </div>
  );
}
