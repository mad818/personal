"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import RouteStatePanel from "@/components/ui/RouteStatePanel";
import { eventBus } from "@/lib/eventBus";
import { getDefaultEntrypoint } from "@/lib/releaseMatrix";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    eventBus.emit("system:error", {
      source: "AppRouter:segment",
      error: error.message,
      stack: error.stack,
      ts: Date.now(),
    });

    if (process.env.NODE_ENV !== "production") {
      console.error("[AppRouter:segment]", error);
    }
  }, [error]);

  const debugDetail =
    process.env.NODE_ENV !== "production"
      ? [
          error.message,
          error.stack,
          error.digest ? `Digest: ${error.digest}` : "",
        ]
          .filter(Boolean)
          .join("\n\n")
      : undefined;

  return (
    <RouteStatePanel
      kind="error"
      eyebrow="Route recovery"
      title="Workspace interrupted"
      description="The current surface stopped rendering. Retry it in place or return to the safe entrypoint."
      announcement="The current Nexus workspace encountered an error"
      testId="route-error-state"
      asMain={pathname === "/"}
      debugDetail={debugDetail}
      actions={
        <>
          <button
            type="button"
            className="nexus-route-state__action nexus-route-state__action--primary"
            onClick={reset}
          >
            Retry surface
          </button>
          <Link
            className="nexus-route-state__action"
            href={getDefaultEntrypoint()}
          >
            Open HQ
          </Link>
        </>
      }
    />
  );
}
