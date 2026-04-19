export type OfflineReadinessStatus =
  | "checking"
  | "connected"
  | "local_only"
  | "runtime_unavailable";

export function readBrowserInternetAvailability(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

export function shouldPauseInternetPolling(): boolean {
  return !readBrowserInternetAvailability();
}

export function deriveOfflineReadinessStatus(input: {
  internetReachable: boolean;
  runtimeReachable: boolean | null;
}): OfflineReadinessStatus {
  const { internetReachable, runtimeReachable } = input;
  if (runtimeReachable === null) return "checking";
  if (!runtimeReachable) return "runtime_unavailable";
  return internetReachable ? "connected" : "local_only";
}
