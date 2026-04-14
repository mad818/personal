"use client";

import { useEffect } from "react";

export function useSurfaceFocusScroll(targetId: string | null | undefined) {
  useEffect(() => {
    if (!targetId || typeof document === "undefined") return;

    const timer = window.setTimeout(() => {
      const element = document.getElementById(targetId);
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [targetId]);
}
