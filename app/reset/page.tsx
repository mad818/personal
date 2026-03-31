"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ResetPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      localStorage.removeItem("nexus-settings");
    } catch {
      // ignore
    }
    // Route away after clearing local state
    router.replace("/intel");
    // Force reload to ensure all modules re-hydrate cleanly
    setTimeout(() => {
      try {
        window.location.reload();
      } catch {
        // ignore
      }
    }, 50);
  }, [router]);

  return (
    <div style={{ padding: 18, color: "var(--text2)", fontSize: 12 }}>
      Resetting local state…
    </div>
  );
}
