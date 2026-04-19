"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { probeRuntimeHealth } from "@/lib/apiFetch";
import {
  deriveOfflineReadinessStatus,
  readBrowserInternetAvailability,
} from "@/lib/offlineReadiness";

export function useOfflineReadiness() {
  const [internetReachable, setInternetReachable] = useState<boolean>(() =>
    readBrowserInternetAvailability(),
  );
  const [runtimeReachable, setRuntimeReachable] = useState<boolean | null>(null);

  const refreshRuntime = useCallback(async () => {
    try {
      const ok = await probeRuntimeHealth();
      setRuntimeReachable(ok);
    } catch {
      setRuntimeReachable(false);
    }
  }, []);

  useEffect(() => {
    setInternetReachable(readBrowserInternetAvailability());
    void refreshRuntime();

    const handleOnline = () => {
      setInternetReachable(true);
      void refreshRuntime();
    };
    const handleOffline = () => {
      setInternetReachable(false);
      void refreshRuntime();
    };
    const handleVisible = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      setInternetReachable(readBrowserInternetAvailability());
      void refreshRuntime();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [refreshRuntime]);

  const status = useMemo(
    () =>
      deriveOfflineReadinessStatus({
        internetReachable,
        runtimeReachable,
      }),
    [internetReachable, runtimeReachable],
  );

  return {
    status,
    internetReachable,
    runtimeReachable,
  };
}
