"use client";

import { ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { useProviderHealthPosture } from "@/hooks/useProviderHealthPosture";
import { useStore } from "@/store/useStore";

export default function ProviderHealthStrip({
  surface = "command",
}: {
  surface?: "command" | "hq";
}) {
  const { posture, loadError } = useProviderHealthPosture();
  const privacyShieldStatus = useStore((s) => s.privacyShieldStatus);

  return (
    <SurfaceCallout
      tone={
        posture.noAiLaneAvailable
          ? "warning"
          : posture.runtimeReachable
            ? "success"
            : "info"
      }
      compact
      icon="AI"
      title={
        surface === "command" ? "Provider health" : "Provider resilience"
      }
      description={posture.summaryDescription}
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
              ? "privacy shield blocked"
              : "privacy shield active"}
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
        <div
          role="alert"
          className="mt-2 text-[10px] leading-5 text-[var(--text3)]"
        >
          {loadError}
        </div>
      ) : null}
    </SurfaceCallout>
  );
}
