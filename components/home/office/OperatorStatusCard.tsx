"use client";

import { useMemo } from "react";
import { ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { useStore } from "@/store/useStore";

export default function OperatorStatusCard({
  surface = "hq",
}: {
  surface?: "hq" | "command";
}) {
  const operatorStatus = useStore((s) => s.switchOperatorStatus);

  const title = useMemo(() => {
    if (!operatorStatus) return "Operator mode standby";
    if (operatorStatus.mode === "running") return "Operator mode running";
    if (operatorStatus.mode === "blocked") return "Operator mode blocked";
    if (operatorStatus.mode === "failed") return "Operator mode failed";
    return "Operator mode ready";
  }, [operatorStatus]);

  const description = useMemo(() => {
    if (!operatorStatus) {
      return surface === "command"
        ? "Switch Operator has not staged a one-shot command run yet."
        : "HQ is ready for an explicit /operator run whenever you want one bounded orchestration pass.";
    }
    return (
      operatorStatus.detail ??
      operatorStatus.readinessSummary ??
      "One-shot operator posture is available."
    );
  }, [operatorStatus, surface]);

  return (
    <SurfaceCallout
      tone={
        operatorStatus?.mode === "blocked" || operatorStatus?.mode === "failed"
          ? "warning"
          : operatorStatus?.mode === "running"
            ? "info"
            : "success"
      }
      compact
      icon="◎"
      title={title}
      description={description}
    >
      <div className="flex flex-wrap gap-2">
        <ShellBadge tone="accent">
          Mode {operatorStatus?.mode ?? "idle"}
        </ShellBadge>
        <ShellBadge
          tone={
            operatorStatus?.mode === "blocked" ||
            operatorStatus?.mode === "failed"
              ? "accent"
              : "muted"
          }
        >
          {operatorStatus?.readinessSummary ?? "Awaiting explicit operator run"}
        </ShellBadge>
        {operatorStatus?.taskLabel ? (
          <ShellBadge tone="muted">Task {operatorStatus.taskLabel}</ShellBadge>
        ) : null}
        {operatorStatus?.selectedLane ? (
          <ShellBadge tone="muted">{operatorStatus.selectedLane}</ShellBadge>
        ) : null}
        {operatorStatus?.selectedAgent ? (
          <ShellBadge tone="success">
            Agent {operatorStatus.selectedAgent.toUpperCase()}
          </ShellBadge>
        ) : null}
        {operatorStatus?.providerUsed ? (
          <ShellBadge tone="success">
            Provider {operatorStatus.providerUsed}
          </ShellBadge>
        ) : null}
      </div>
      {operatorStatus?.nextStep ? (
        <div className="mt-2 text-[10px] leading-5 text-[var(--text3)]">
          Next step: {operatorStatus.nextStep}
        </div>
      ) : null}
    </SurfaceCallout>
  );
}
