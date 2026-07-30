"use client";

import { useEffect } from "react";
import RouteStatePanel from "@/components/ui/RouteStatePanel";
import { eventBus } from "@/lib/eventBus";
import { getDefaultEntrypoint } from "@/lib/releaseMatrix";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    eventBus.emit("system:error", {
      source: "AppRouter:root",
      error: error.message,
      stack: error.stack,
      ts: Date.now(),
    });

    if (process.env.NODE_ENV !== "production") {
      console.error("[AppRouter:root]", error);
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
    <html lang="en">
      <body className="nexus-global-error-body">
        <RouteStatePanel
          kind="error"
          eyebrow="Shell recovery"
          title="Nexus could not start"
          description="The application shell failed before the workspace became available. Retry startup or reopen the safe entrypoint."
          announcement="The Nexus application shell encountered an error"
          testId="global-error-state"
          asMain
          debugDetail={debugDetail}
          actions={
            <>
              <button
                type="button"
                className="nexus-route-state__action nexus-route-state__action--primary"
                onClick={reset}
              >
                Retry shell
              </button>
              <button
                type="button"
                className="nexus-route-state__action"
                onClick={() => window.location.assign(getDefaultEntrypoint())}
              >
                Open HQ
              </button>
            </>
          }
        />
      </body>
    </html>
  );
}
