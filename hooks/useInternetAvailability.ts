"use client";

import { useEffect, useState } from "react";
import { readBrowserInternetAvailability } from "@/lib/offlineReadiness";

export function useInternetAvailability() {
  const [internetReachable, setInternetReachable] = useState<boolean>(() =>
    readBrowserInternetAvailability(),
  );

  useEffect(() => {
    const handleOnline = () => setInternetReachable(true);
    const handleOffline = () => setInternetReachable(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { internetReachable };
}
