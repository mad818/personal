"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { detectRouteFromPrompt } from "@/lib/chatCapabilityRouting";
import {
  buildMemoryAskHref,
  getTabFromHref,
  type MissionContinuationTarget,
  resolveMissionContinuationTarget,
} from "@/lib/missionHandoff";

interface MissionContinuationActionsProps {
  promptText?: string | null;
  memoryQuery?: string | null;
  routeHint?: string | null;
  extraTargets?: MissionContinuationTarget[];
  showReturnToHQ?: boolean;
  className?: string;
}

const ACTION_STYLE: CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  color: "var(--text2)",
  cursor: "pointer",
  fontSize: "10px",
  padding: "2px 7px",
};

export default function MissionContinuationActions({
  promptText,
  memoryQuery,
  routeHint,
  extraTargets,
  showReturnToHQ = false,
  className,
}: MissionContinuationActionsProps) {
  const router = useRouter();
  const setTab = useStore((state) => state.setTab);

  const continuationTargets = useMemo(() => {
    const detectedRouteHint = routeHint ?? detectRouteFromPrompt(promptText ?? "");
    const primary = resolveMissionContinuationTarget(detectedRouteHint);
    const seen = new Set<string>();
    const targets: MissionContinuationTarget[] = [];

    const pushTarget = (target: MissionContinuationTarget | null | undefined) => {
      if (!target) return;
      const key = `${target.href}::${target.label}`;
      if (seen.has(key)) return;
      seen.add(key);
      targets.push(target);
    };

    pushTarget(primary);
    for (const target of extraTargets ?? []) {
      pushTarget(target);
    }

    return targets;
  }, [extraTargets, promptText, routeHint]);

  const trimmedMemoryQuery = memoryQuery?.trim() ?? "";

  if (continuationTargets.length === 0 && !trimmedMemoryQuery && !showReturnToHQ) {
    return null;
  }

  const openHref = (href: string) => {
    setTab(getTabFromHref(href));
    router.push(href);
  };

  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
      }}
    >
      {trimmedMemoryQuery ? (
        <button
          type="button"
          onClick={() => openHref(buildMemoryAskHref(trimmedMemoryQuery))}
          title="Open this context in the local memory lane"
          style={ACTION_STYLE}
        >
          Ask memory
        </button>
      ) : null}
      {continuationTargets.map((target) => (
        <button
          type="button"
          key={`${target.href}:${target.label}`}
          onClick={() => openHref(target.href)}
          title="Open the most relevant next surface for this context"
          style={ACTION_STYLE}
        >
          {target.label}
        </button>
      ))}
      {showReturnToHQ ? (
        <button
          type="button"
          onClick={() => openHref("/hq")}
          title="Return to HQ"
          style={ACTION_STYLE}
        >
          Return to HQ
        </button>
      ) : null}
    </div>
  );
}
