"use client";

import { useIntelOnlyPosture } from "@/hooks/useIntelOnlyPosture";
import { ShellButton } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";

const LOCAL_AI_CHECK_PROMPT =
  "Are you using local Ollama, what model, and are paid APIs blocked?";

interface IntelOnlyAgentGateProps {
  surface: "hq" | "command";
  onCheckLocalAi?: (prompt: string) => void;
  compact?: boolean;
}

export default function IntelOnlyAgentGate({
  surface,
  onCheckLocalAi,
  compact = false,
}: IntelOnlyAgentGateProps) {
  const { posture, loading } = useIntelOnlyPosture();

  if (!posture.degraded || loading) return null;

  return (
    <SurfaceCallout
      tone="warning"
      className={
        compact
          ? "nexus-intel-only-gate nexus-intel-only-gate--compact"
          : "nexus-intel-only-gate"
      }
      data-testid="intel-only-agent-gate"
      data-surface={surface}
    >
      <div className="nexus-intel-only-gate__copy">
        <strong>{posture.headline}</strong>
        <p>{posture.detail}</p>
        {posture.requestedModel && posture.resolvedModel !== posture.requestedModel ? (
          <p className="nexus-intel-only-gate__model">
            Configured {posture.requestedModel} · resolved{" "}
            {posture.resolvedModel ?? "none"}
          </p>
        ) : null}
      </div>
      <div className="nexus-intel-only-gate__actions">
        {onCheckLocalAi ? (
          <ShellButton onClick={() => onCheckLocalAi(LOCAL_AI_CHECK_PROMPT)}>
            Check local AI
          </ShellButton>
        ) : null}
        <ShellButton
          onClick={() => {
            window.open("/command?focus=provider-health", "_self");
          }}
        >
          Open setup
        </ShellButton>
      </div>
    </SurfaceCallout>
  );
}
