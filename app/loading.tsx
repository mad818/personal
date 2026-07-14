"use client";

import { usePathname } from "next/navigation";
import RouteStatePanel from "@/components/ui/RouteStatePanel";

export default function Loading() {
  const pathname = usePathname();

  return (
    <RouteStatePanel
      kind="loading"
      eyebrow="Route load"
      title="Preparing workspace"
      description="Loading the requested surface and restoring its local operating context."
      announcement="Nexus workspace loading"
      testId="route-loading-state"
      asMain={pathname === "/"}
    />
  );
}
