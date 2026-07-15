"use client";

import { useMemo } from "react";
import { ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { useOfflineReadiness } from "@/hooks/useOfflineReadiness";

type OfflineSurface = "hq" | "command" | "vault";

const SURFACE_COPY: Record<
  OfflineSurface,
  {
    connected: string;
    local_only: string;
    runtime_unavailable: string;
    checking: string;
  }
> = {
  hq: {
    connected:
      "HQ can fall back to local memory, scheduler posture, and local model lanes if the internet drops.",
    local_only:
      "Internet is offline, but HQ can still operate through local memory, scheduler controls, and local AI/runtime lanes.",
    runtime_unavailable:
      "The local runtime is unreachable, so HQ dispatch and local APIs are degraded until the server comes back.",
    checking:
      "Checking whether the local runtime is available for local-only HQ operation.",
  },
  command: {
    connected:
      "COMMAND is ready for local-first fallback. If the internet drops, live feeds may pause while local memory and operator controls stay available.",
    local_only:
      "Internet is offline. COMMAND keeps local memory and operator surfaces, while internet-backed feeds pause until reconnect.",
    runtime_unavailable:
      "The local runtime is unreachable, so COMMAND cannot rely on local APIs until the server comes back.",
    checking:
      "Checking the local runtime before confirming offline-ready command posture.",
  },
  vault: {
    connected:
      "VAULT is already local-first. Graph, compiled pages, exports, and memory recall stay available even if external connectivity changes.",
    local_only:
      "Internet is offline, but VAULT remains available locally for graph, compiled memory, exports, and document intake.",
    runtime_unavailable:
      "The local runtime is unreachable, so protected memory/page reads may be limited until the server returns.",
    checking:
      "Checking whether the local runtime is available for protected VAULT memory routes.",
  },
};

export default function OfflineReadinessCallout({
  surface,
}: {
  surface: OfflineSurface;
}) {
  const { status, internetReachable, runtimeReachable } = useOfflineReadiness();

  const tone = useMemo(() => {
    if (status === "local_only") return "success" as const;
    if (status === "runtime_unavailable") return "warning" as const;
    return "info" as const;
  }, [status]);

  const title = useMemo(() => {
    if (status === "local_only")
      return "Internet offline · local lane still ready";
    if (status === "runtime_unavailable") return "Local runtime unavailable";
    if (status === "connected") return "Local-first fallback is ready";
    return "Checking local runtime";
  }, [status]);

  return (
    <SurfaceCallout
      tone={tone}
      compact
      icon="Offline"
      title={title}
      description={SURFACE_COPY[surface][status]}
    >
      <div className="flex flex-wrap gap-2">
        <ShellBadge tone={internetReachable ? "success" : "muted"}>
          Internet {internetReachable ? "online" : "offline"}
        </ShellBadge>
        <ShellBadge
          tone={
            runtimeReachable === null
              ? "muted"
              : runtimeReachable
                ? "success"
                : "muted"
          }
        >
          Runtime{" "}
          {runtimeReachable === null
            ? "checking"
            : runtimeReachable
              ? "reachable"
              : "unreachable"}
        </ShellBadge>
      </div>
    </SurfaceCallout>
  );
}
