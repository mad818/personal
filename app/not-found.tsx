"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import RouteStatePanel from "@/components/ui/RouteStatePanel";
import { getDefaultEntrypoint } from "@/lib/releaseMatrix";

export default function NotFound() {
  const router = useRouter();

  return (
    <RouteStatePanel
      kind="not-found"
      eyebrow="Route unavailable"
      title="Workspace not found"
      description="This address does not map to an available Nexus surface. Return to HQ or reopen the previous page."
      announcement="The requested Nexus workspace was not found"
      testId="route-not-found-state"
      actions={
        <>
          <Link
            className="nexus-route-state__action nexus-route-state__action--primary"
            href={getDefaultEntrypoint()}
          >
            Open HQ
          </Link>
          <button
            type="button"
            className="nexus-route-state__action"
            onClick={() => router.back()}
          >
            Go back
          </button>
        </>
      }
    />
  );
}
