"use client";

import { useEffect } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { NEXUS_RUNTIME_POLICY_REFRESHED_EVENT } from "@/lib/runtimePolicyEvents";

export default function RuntimePolicyCookieSync() {
  useEffect(() => {
    void apiFetch("/api/settings")
      .then(async (response) => {
        if (!response.ok) return;
        window.dispatchEvent(
          new CustomEvent(NEXUS_RUNTIME_POLICY_REFRESHED_EVENT),
        );
      })
      .catch(() => {
        // silent self-heal: this only exists to refresh middleware-visible policy cookies
      });
  }, []);

  return null;
}
