"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import {
  buildOperationalLightGrid,
  type OperationalLightGridModel,
  type OperationalStatusPayload,
} from "@/lib/operationalLights";

interface RuntimeHealthPayload {
  status?: string;
}

interface OperationalLightFetchState {
  status: OperationalStatusPayload | null;
  runtimeOk: boolean | null;
  protectedStatusOk: boolean | null;
  protectedStatusHttp: number | null;
  generatedAt: string | null;
}

const INITIAL_FETCH_STATE: OperationalLightFetchState = {
  status: null,
  runtimeOk: null,
  protectedStatusOk: null,
  protectedStatusHttp: null,
  generatedAt: null,
};

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function useOperationalLights() {
  const [fetchState, setFetchState] =
    useState<OperationalLightFetchState>(INITIAL_FETCH_STATE);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    const next: OperationalLightFetchState = {
      ...INITIAL_FETCH_STATE,
      generatedAt: new Date().toISOString(),
    };

    try {
      const [healthResult, statusResult] = await Promise.allSettled([
        apiFetch("/api/health", { cache: "no-store", signal }),
        apiFetch("/api/status", { cache: "no-store", signal }),
      ]);

      if (signal?.aborted) return;

      if (healthResult.status === "fulfilled") {
        const payload = await readJson<RuntimeHealthPayload>(healthResult.value);
        next.runtimeOk =
          healthResult.value.ok && (payload?.status ?? "ok") === "ok";
      } else {
        next.runtimeOk = false;
      }

      if (statusResult.status === "fulfilled") {
        next.protectedStatusHttp = statusResult.value.status;
        next.protectedStatusOk = statusResult.value.ok;
        if (statusResult.value.ok) {
          next.status = await readJson<OperationalStatusPayload>(
            statusResult.value,
          );
        }
      } else {
        next.protectedStatusOk = false;
      }

      if (!signal?.aborted) setFetchState(next);
    } catch {
      if (!signal?.aborted) {
        setFetchState({
          ...INITIAL_FETCH_STATE,
          runtimeOk: false,
          protectedStatusOk: false,
          generatedAt: new Date().toISOString(),
        });
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;

    const run = () => {
      if (!active) return;
      if (typeof document !== "undefined" && document.hidden) return;
      controller?.abort();
      controller = new AbortController();
      void refresh(controller.signal);
    };

    run();
    const interval = window.setInterval(run, 60_000);
    const handleVisibility = () => {
      if (document.hidden) return;
      run();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  const grid = useMemo<OperationalLightGridModel>(() => {
    return buildOperationalLightGrid({
      status: fetchState.status,
      runtimeOk: fetchState.runtimeOk,
      protectedStatusOk: fetchState.protectedStatusOk,
      protectedStatusHttp: fetchState.protectedStatusHttp,
      generatedAt: fetchState.generatedAt ?? undefined,
    });
  }, [fetchState]);

  return { grid, loading, refresh };
}
