"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordLocalUsageEvent } from "@/lib/localUsageAnalytics";

export default function LocalUsageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname === "/") return;
    recordLocalUsageEvent({ name: "route_view", route: pathname });
  }, [pathname]);

  return null;
}
