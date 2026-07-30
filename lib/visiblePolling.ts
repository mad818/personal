export interface VisiblePollingEnvironment {
  addOnlineListener(listener: () => void): () => void;
  addPolicyListener(listener: () => void): () => void;
  addVisibilityListener(listener: () => void): () => void;
  canUseInternet(): boolean;
  clearInterval(intervalId: ReturnType<typeof setInterval>): void;
  isHidden(): boolean;
  isInternetPollingPaused(): boolean;
  setInterval(
    listener: () => void,
    intervalMs: number,
  ): ReturnType<typeof setInterval>;
}

export interface VisiblePollingSubscription {
  key: string;
  run: () => void | Promise<void>;
  intervalMs: number;
  internetRequired?: boolean;
}

interface PollingEntry {
  callbacks: Map<number, () => void | Promise<void>>;
  cleanups: Array<() => void>;
  inFlight: boolean;
  internetRequired: boolean;
  intervalId: ReturnType<typeof setInterval>;
  intervalMs: number;
}

export type VisiblePollingSnapshot = Record<
  string,
  {
    inFlight: boolean;
    intervalMs: number;
    subscribers: number;
  }
>;

const RUNTIME_POLICY_REFRESHED_EVENT = "nexus-runtime-policy-refreshed";

function createBrowserEnvironment(): VisiblePollingEnvironment {
  return {
    addOnlineListener(listener) {
      if (typeof window === "undefined") return () => undefined;
      window.addEventListener("online", listener);
      return () => window.removeEventListener("online", listener);
    },
    addPolicyListener(listener) {
      if (typeof window === "undefined") return () => undefined;
      window.addEventListener(RUNTIME_POLICY_REFRESHED_EVENT, listener);
      return () =>
        window.removeEventListener(RUNTIME_POLICY_REFRESHED_EVENT, listener);
    },
    addVisibilityListener(listener) {
      if (typeof document === "undefined") return () => undefined;
      document.addEventListener("visibilitychange", listener);
      return () => document.removeEventListener("visibilitychange", listener);
    },
    canUseInternet() {
      return typeof navigator === "undefined" || navigator.onLine !== false;
    },
    clearInterval(intervalId) {
      clearInterval(intervalId);
    },
    isHidden() {
      return typeof document !== "undefined" && document.hidden;
    },
    isInternetPollingPaused() {
      return typeof navigator !== "undefined" && navigator.onLine === false;
    },
    setInterval(listener, intervalMs) {
      return setInterval(listener, intervalMs);
    },
  };
}

export function createVisiblePollingCoordinator(
  environment: VisiblePollingEnvironment = createBrowserEnvironment(),
) {
  const entries = new Map<string, PollingEntry>();
  let nextSubscriberId = 1;

  const execute = (entry: PollingEntry) => {
    if (entry.inFlight || environment.isHidden()) return;
    if (
      entry.internetRequired &&
      (!environment.canUseInternet() || environment.isInternetPollingPaused())
    ) {
      return;
    }

    const run = entry.callbacks.values().next().value;
    if (!run) return;

    entry.inFlight = true;
    void Promise.resolve()
      .then(() => run())
      .catch(() => undefined)
      .finally(() => {
        entry.inFlight = false;
      });
  };

  return {
    subscribe({
      key,
      run,
      intervalMs,
      internetRequired = true,
    }: VisiblePollingSubscription) {
      const subscriberId = nextSubscriberId++;
      let entry = entries.get(key);

      if (!entry) {
        const callbacks = new Map<number, () => void | Promise<void>>();
        entry = {
          callbacks,
          cleanups: [],
          inFlight: false,
          internetRequired,
          intervalId: environment.setInterval(
            () => execute(entry!),
            intervalMs,
          ),
          intervalMs,
        };
        entry.cleanups.push(
          environment.addVisibilityListener(() => execute(entry!)),
          environment.addOnlineListener(() => execute(entry!)),
          environment.addPolicyListener(() => execute(entry!)),
        );
        entries.set(key, entry);
      }

      entry.callbacks.set(subscriberId, run);
      if (entry.callbacks.size === 1) {
        execute(entry);
      }

      return () => {
        const current = entries.get(key);
        if (!current) return;
        current.callbacks.delete(subscriberId);
        if (current.callbacks.size > 0) return;
        environment.clearInterval(current.intervalId);
        current.cleanups.forEach((cleanup) => cleanup());
        entries.delete(key);
      };
    },
    getSnapshot(): VisiblePollingSnapshot {
      return Object.fromEntries(
        Array.from(entries.entries()).map(([key, entry]) => [
          key,
          {
            inFlight: entry.inFlight,
            intervalMs: entry.intervalMs,
            subscribers: entry.callbacks.size,
          },
        ]),
      );
    },
  };
}

const visiblePollingCoordinator = createVisiblePollingCoordinator();

export function subscribeVisiblePolling(
  subscription: VisiblePollingSubscription,
) {
  return visiblePollingCoordinator.subscribe(subscription);
}

export function getVisiblePollingSnapshot(): VisiblePollingSnapshot {
  return visiblePollingCoordinator.getSnapshot();
}
