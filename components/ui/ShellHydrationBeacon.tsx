"use client";

import { useEffect } from "react";

const RECOVERY_ID = "nexus-shell-bootstrap-recovery";

export default function ShellHydrationBeacon() {
  useEffect(() => {
    document.documentElement.setAttribute("data-nexus-hydrated", "1");
    document.documentElement.removeAttribute("data-nexus-shell-boot");
    const overlay = document.getElementById(RECOVERY_ID);
    overlay?.remove();
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("__shellHeal")) {
        url.searchParams.delete("__shellHeal");
        window.history.replaceState(window.history.state, "", url.toString());
      }
    } catch {
      // silent
    }

    return () => {
      document.documentElement.removeAttribute("data-nexus-hydrated");
    };
  }, []);

  return null;
}
