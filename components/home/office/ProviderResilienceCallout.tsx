"use client";

import { useEffect, useState } from "react";
import { ShellButton, ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { useProviderHealthPosture } from "@/hooks/useProviderHealthPosture";
import { useStore } from "@/store/useStore";

const FREE_KEY_NUDGE_STORAGE_KEY = "nexus_free_key_nudge_dismissed_v1";

export default function ProviderResilienceCallout() {
  const { posture, loadError } = useProviderHealthPosture();
  const privacyShieldStatus = useStore((s) => s.privacyShieldStatus);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(FREE_KEY_NUDGE_STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismissNudge = () => {
    setDismissed(true);
    try {
      localStorage.setItem(FREE_KEY_NUDGE_STORAGE_KEY, "1");
    } catch {
      // local-only dismissal best effort
    }
  };

  return (
    <div style={{ display: "grid", gap: "10px" }}>
      <SurfaceCallout
        tone={posture.noAiLaneAvailable ? "warning" : "info"}
        compact
        icon="↺"
        title={posture.summaryTitle}
        description={`${posture.summaryDescription} ${posture.repairAction}`}
      >
        <div className="flex flex-wrap gap-2">
          {posture.badges.map((badge) => (
            <ShellBadge key={badge.key} tone={badge.tone}>
              {badge.label}
            </ShellBadge>
          ))}
          {privacyShieldStatus?.active ? (
            <ShellBadge tone="accent">
              {privacyShieldStatus.dispatchMode === "blocked"
                ? `Privacy shield blocked · ${privacyShieldStatus.protectedCount}`
                : `Privacy shield · ${privacyShieldStatus.protectedCount}`}
            </ShellBadge>
          ) : null}
          {privacyShieldStatus?.active
            ? Object.entries(privacyShieldStatus.classCounts ?? {})
                .filter(([, count]) => count > 0)
                .slice(0, 2)
                .map(([kind, count]) => (
                  <ShellBadge key={kind} tone="muted">
                    {kind.replace(/_/g, " ")} {count}
                  </ShellBadge>
                ))
            : null}
        </div>
        {privacyShieldStatus?.active ? (
          <div className="mt-2 text-[10px] leading-5 text-[var(--text3)]">
            {privacyShieldStatus.summary}
          </div>
        ) : null}
        {loadError ? (
          <div className="mt-2 text-[10px] leading-5 text-[var(--text3)]">
            {loadError}
          </div>
        ) : null}
      </SurfaceCallout>

      {posture.freeKeyOnboardingUseful && !dismissed ? (
        <SurfaceCallout
          tone="info"
          compact
          icon="Key"
          title="Free cloud fallback is worth arming"
          description="No cloud keys are configured and the local runtime is unavailable right now. A single free Groq, Cerebras, or SambaNova key gives HQ a bounded fallback lane without widening Nexus into paid-only posture."
        >
          <div className="flex flex-wrap items-center gap-2">
            <ShellBadge tone="muted">Dismissible</ShellBadge>
            <ShellBadge tone="accent">Local-only nudge</ShellBadge>
            <ShellButton onClick={dismissNudge}>Dismiss</ShellButton>
          </div>
        </SurfaceCallout>
      ) : null}
    </div>
  );
}
