"use client";

import { useEffect } from "react";

export default function ResetPage() {
  useEffect(() => {
    try {
      localStorage.removeItem("nexus-settings");
      sessionStorage.removeItem("nexus_session_token");
    } catch {
      // ignore
    }
    window.location.replace("/auth/logout?next=/hq");
  }, []);

  return (
    <div style={{ padding: 18, color: "var(--text2)", fontSize: 12 }}>
      Resetting local state…
    </div>
  );
}
