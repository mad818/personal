"use client";

import {
  useCallback,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { StrategiumSystemAction } from "./HQStrategiumDeck";
import {
  isEditableTarget,
  OFFICE_HEIGHT_DEFAULT_VH,
  OFFICE_HEIGHT_MAX_PX,
  OFFICE_HEIGHT_MIN_PX,
  OFFICE_HEIGHT_STEP_PX,
  SPLIT_LOCK_STORAGE_KEY,
} from "./officeCommandCenterConfig";

interface UseOfficeConsoleShellControlsArgs {
  router: AppRouterInstance;
  setTab: (tab: string) => void;
  openSurface: (tab: string) => void;
  primaryFrontHref: string;
  strategiumSystems: StrategiumSystemAction[];
  setMemoryOpen: Dispatch<SetStateAction<boolean>>;
  setSchedulerOpen: Dispatch<SetStateAction<boolean>>;
  officeHeightPx: number | null;
  setOfficeHeightPx: Dispatch<SetStateAction<number | null>>;
  updateOfficeSplitHeight: (patch: { officeSplitHeightPx: number }) => void;
  splitDragLocked: boolean;
  setSplitNotice: Dispatch<SetStateAction<string | null>>;
  setSplitDragLocked: Dispatch<SetStateAction<boolean>>;
}

export function useOfficeConsoleShellControls({
  router,
  setTab,
  openSurface,
  primaryFrontHref,
  strategiumSystems,
  setMemoryOpen,
  setSchedulerOpen,
  officeHeightPx,
  setOfficeHeightPx,
  updateOfficeSplitHeight,
  splitDragLocked,
  setSplitNotice,
  setSplitDragLocked,
}: UseOfficeConsoleShellControlsArgs) {
  const openBriefingTab = useCallback(
    (tab: string) => {
      setTab(tab);
      router.push(`/${tab}`);
    },
    [router, setTab],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) && event.key !== "Escape") return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "/") {
        event.preventDefault();
        return;
      }
      const lower = event.key.toLowerCase();
      if (lower === "r") {
        event.preventDefault();
        openSurface(primaryFrontHref);
        return;
      }
      if (lower === "m") {
        event.preventDefault();
        setMemoryOpen(true);
        return;
      }
      if (lower === "o") {
        event.preventDefault();
        setSchedulerOpen(true);
        return;
      }
      if (/^[1-5]$/.test(event.key)) {
        const system = strategiumSystems[Number(event.key) - 1];
        if (!system) return;
        event.preventDefault();
        openSurface(system.href);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    openSurface,
    primaryFrontHref,
    setMemoryOpen,
    setSchedulerOpen,
    strategiumSystems,
  ]);

  const applySplitHeight = useCallback(
    (next: number, announce?: string) => {
      const maxByViewport =
        typeof window !== "undefined"
          ? Math.round(window.innerHeight * 0.76)
          : OFFICE_HEIGHT_MAX_PX;
      const maxAllowed = Math.max(
        OFFICE_HEIGHT_MIN_PX,
        Math.min(OFFICE_HEIGHT_MAX_PX, maxByViewport),
      );
      const clamped = Math.max(
        OFFICE_HEIGHT_MIN_PX,
        Math.min(maxAllowed, Math.round(next)),
      );
      setOfficeHeightPx(clamped);
      updateOfficeSplitHeight({ officeSplitHeightPx: clamped });
      if (announce) setSplitNotice(announce);
    },
    [setOfficeHeightPx, setSplitNotice, updateOfficeSplitHeight],
  );

  const startResize = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (splitDragLocked) return;
      event.preventDefault();
      const onMove = (moveEvent: MouseEvent) => {
        applySplitHeight(moveEvent.clientY);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        setSplitNotice("Layout resized");
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [applySplitHeight, setSplitNotice, splitDragLocked],
  );

  const resetSplit = useCallback(() => {
    const baseline = Math.round(
      (window.innerHeight * OFFICE_HEIGHT_DEFAULT_VH) / 100,
    );
    applySplitHeight(baseline, "Layout reset");
  }, [applySplitHeight]);

  const handleSplitterKey = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const current =
        officeHeightPx ??
        Math.round((window.innerHeight * OFFICE_HEIGHT_DEFAULT_VH) / 100);
      const step = event.shiftKey
        ? OFFICE_HEIGHT_STEP_PX * 2
        : OFFICE_HEIGHT_STEP_PX;
      if (event.key === "ArrowUp") {
        event.preventDefault();
        applySplitHeight(current - step, "Layout resized");
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        applySplitHeight(current + step, "Layout resized");
      } else if (event.key === "Home") {
        event.preventDefault();
        applySplitHeight(OFFICE_HEIGHT_MIN_PX, "Layout minimized");
      } else if (event.key === "End") {
        event.preventDefault();
        const maxByViewport =
          typeof window !== "undefined"
            ? Math.round(window.innerHeight * 0.76)
            : OFFICE_HEIGHT_MAX_PX;
        const maxAllowed = Math.max(
          OFFICE_HEIGHT_MIN_PX,
          Math.min(OFFICE_HEIGHT_MAX_PX, maxByViewport),
        );
        applySplitHeight(maxAllowed, "Layout maximized");
      }
    },
    [applySplitHeight, officeHeightPx],
  );

  const toggleSplitLock = useCallback(() => {
    setSplitDragLocked((current) => {
      const next = !current;
      try {
        localStorage.setItem(SPLIT_LOCK_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // silent fail
      }
      setSplitNotice(next ? "Drag lock enabled" : "Drag lock disabled");
      return next;
    });
  }, [setSplitDragLocked, setSplitNotice]);

  return {
    applySplitHeight,
    openBriefingTab,
    startResize,
    resetSplit,
    handleSplitterKey,
    toggleSplitLock,
  };
}
