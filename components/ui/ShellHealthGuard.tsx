"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import ClientStyleMount from "@/components/ui/ClientStyleMount";
import { getDefaultEntrypoint } from "@/lib/releaseMatrix";
import {
  SHELL_HEAL_STORAGE_PREFIX,
  TARGETED_VIEW_STORAGE_KEYS,
} from "@/lib/shellRecoveryState";
import { DEFAULT_SETTINGS, useStore } from "@/store/useStore";

const SHELL_HEAL_WINDOW_MS = 60_000;
const MAX_AUTO_RELOADS = 1;
const CHECK_DELAYS_MS = [650, 1600, 3200];

const EMERGENCY_SHELL_CSS = `
  html[data-nexus-shell-heal="emergency"] body {
    background: #040915;
    color: #ecfeff;
  }

  html[data-nexus-shell-heal="emergency"] main {
    padding-top: 96px !important;
    min-height: 100vh;
  }

  html[data-nexus-shell-heal="emergency"] .nexus-toprail {
    position: fixed;
    inset: 10px 12px auto;
    z-index: 220;
  }

  html[data-nexus-shell-heal="emergency"] .nexus-toprail__inner {
    min-height: 72px;
    max-width: 1460px;
    margin: 0 auto;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    border-radius: 22px;
    border: 1px solid rgba(103, 232, 249, 0.18);
    background:
      linear-gradient(180deg, rgba(6, 14, 28, 0.96), rgba(4, 9, 18, 0.94)),
      radial-gradient(circle at 0% 0%, rgba(245, 158, 11, 0.18), transparent 30%);
    box-shadow: 0 20px 55px rgba(0, 0, 0, 0.45);
  }

  html[data-nexus-shell-heal="emergency"] .nexus-toprail__brand {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
    color: #eff9ff;
    text-decoration: none;
  }

  html[data-nexus-shell-heal="emergency"] .nexus-toprail__eyebrow {
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(148, 198, 226, 0.88);
  }

  html[data-nexus-shell-heal="emergency"] .nexus-toprail__subtitle {
    font-size: 14px;
    color: rgba(237, 248, 255, 0.92);
  }

  html[data-nexus-shell-heal="emergency"] .nexus-toprail__tabs {
    display: flex;
    flex: 1 1 360px;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
  }

  html[data-nexus-shell-heal="emergency"] .nexus-toprail__link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
    color: #f2fbff;
    text-decoration: none;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  html[data-nexus-shell-heal="emergency"] .nexus-toprail__link.is-active {
    border-color: rgba(103, 232, 249, 0.28);
    background: rgba(103, 232, 249, 0.1);
  }

  html[data-nexus-shell-heal="emergency"] .nexus-toprail__meta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }

  html[data-nexus-shell-heal="emergency"] .nexus-toprail__icon-button,
  html[data-nexus-shell-heal="emergency"] .nexus-shell-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    color: #eff9ff;
    cursor: pointer;
  }

  html[data-nexus-shell-heal="emergency"] .nexus-shell-stage {
    position: relative;
    min-height: 100vh;
    padding: 12px 16px 48px;
  }

  html[data-nexus-shell-heal="emergency"] .nexus-shell-stage__veil {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 18% 18%, rgba(103, 232, 249, 0.1), transparent 24%),
      linear-gradient(180deg, rgba(4, 9, 18, 0.6), rgba(4, 9, 18, 0.9));
    pointer-events: none;
  }

  html[data-nexus-shell-heal="emergency"] .nexus-shell-stage > :not(.nexus-shell-stage__veil) {
    position: relative;
    z-index: 1;
  }

  html[data-nexus-shell-heal="emergency"] .nexus-hq-shell {
    width: 100%;
    max-width: min(1500px, calc(100vw - 32px));
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  html[data-nexus-shell-heal="emergency"] .nexus-hq-prelude {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
    gap: 16px;
    padding: 22px;
    border-radius: 28px;
    border: 1px solid rgba(212, 149, 106, 0.14);
    background:
      linear-gradient(180deg, rgba(31, 21, 24, 0.88), rgba(13, 9, 10, 0.96)),
      radial-gradient(circle at 100% 0%, rgba(212, 149, 106, 0.08), transparent 28%);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
  }

  html[data-nexus-shell-heal="emergency"] .nexus-hq-prelude__copy,
  html[data-nexus-shell-heal="emergency"] .nexus-hq-prelude__grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  html[data-nexus-shell-heal="emergency"] .nexus-hq-prelude__title {
    font-size: clamp(28px, 4vw, 42px);
    line-height: 0.98;
    letter-spacing: -0.04em;
    font-weight: 900;
    color: #f8fdff;
  }

  html[data-nexus-shell-heal="emergency"] .nexus-hq-prelude__description,
  html[data-nexus-shell-heal="emergency"] .nexus-hq-prelude__note {
    color: rgba(214, 232, 246, 0.78);
    line-height: 1.65;
  }

  html[data-nexus-shell-heal="emergency"] .nexus-hq-prelude__card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 118px;
    padding: 14px 15px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background:
      linear-gradient(180deg, rgba(25, 17, 19, 0.92), rgba(11, 8, 9, 0.96)),
      radial-gradient(circle at 100% 0%, rgba(196, 72, 90, 0.08), transparent 26%);
  }

  html[data-nexus-shell-heal="emergency"] .nexus-hq-prelude__label {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(148, 198, 226, 0.82);
  }

  html[data-nexus-shell-heal="emergency"] .nexus-hq-prelude__value {
    font-size: 20px;
    line-height: 1;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: #f8fdff;
  }

  html[data-nexus-shell-heal="emergency"] .nexus-hq-console {
    min-height: 560px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 28px;
    border: 1px solid rgba(212, 149, 106, 0.14);
    background:
      linear-gradient(180deg, rgba(18, 12, 14, 0.92), rgba(8, 6, 7, 0.98)),
      radial-gradient(circle at 100% 0%, rgba(212, 149, 106, 0.08), transparent 20%);
    box-shadow: 0 28px 80px rgba(0, 0, 0, 0.45);
  }

  html[data-nexus-shell-heal="emergency"] .nexus-shell-eyebrow {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(148, 198, 226, 0.82);
  }

  html[data-nexus-shell-heal="emergency"] .nexus-shell-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  html[data-nexus-shell-heal="emergency"] .nexus-shell-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    color: #e8f7ff;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  @media (max-width: 960px) {
    html[data-nexus-shell-heal="emergency"] .nexus-hq-prelude {
      grid-template-columns: 1fr;
    }

    html[data-nexus-shell-heal="emergency"] .nexus-toprail__meta {
      margin-left: 0;
    }
  }
`;

type ShellHealthIssue = {
  reason:
    | "missing_toprail"
    | "unstyled_toprail"
    | "missing_main"
    | "missing_shell";
  detail: string;
};

function buildHealStorageKey(pathname: string) {
  return `${SHELL_HEAL_STORAGE_PREFIX}${pathname}`;
}

function readHealAttemptCount(storageKey: string) {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { count?: number; ts?: number };
    if (
      !parsed ||
      typeof parsed.count !== "number" ||
      typeof parsed.ts !== "number"
    ) {
      return 0;
    }
    if (Date.now() - parsed.ts > SHELL_HEAL_WINDOW_MS) {
      window.sessionStorage.removeItem(storageKey);
      return 0;
    }
    return parsed.count;
  } catch {
    return 0;
  }
}

function writeHealAttemptCount(storageKey: string, count: number) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({ count, ts: Date.now() }),
    );
  } catch {
    // silent
  }
}

function clearHealAttemptCount(storageKey: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // silent
  }
}

function evaluateShellHealth(pathname: string): ShellHealthIssue | null {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return null;
  }

  const toprail = document.querySelector<HTMLElement>(".nexus-toprail");
  if (!toprail) {
    return {
      reason: "missing_toprail",
      detail: "Primary navigation did not mount after authentication.",
    };
  }

  const toprailStyle = window.getComputedStyle(toprail);
  if (toprailStyle.position !== "fixed") {
    return {
      reason: "unstyled_toprail",
      detail:
        "Toprail styling did not resolve, which usually means the shell CSS or hydration path stalled.",
    };
  }

  const main = document.querySelector<HTMLElement>("main");
  if (!main) {
    return {
      reason: "missing_main",
      detail: "The main shell frame did not mount.",
    };
  }

  const mainPaddingTop = Number.parseFloat(
    window.getComputedStyle(main).paddingTop || "0",
  );
  if (!Number.isFinite(mainPaddingTop) || mainPaddingTop < 60) {
    return {
      reason: "unstyled_toprail",
      detail:
        "Toprail spacing is unresolved, so the page is not using the expected shell styling.",
    };
  }

  if (pathname === "/hq" || pathname === "/home") {
    const hqShell = document.querySelector(".nexus-hq-shell");
    if (!hqShell) {
      return {
        reason: "missing_shell",
        detail: "HQ authenticated, but the core command shell did not mount.",
      };
    }
  }

  return null;
}

function applyEmergencyFlag(active: boolean) {
  if (typeof document === "undefined") return;
  if (active) {
    document.documentElement.setAttribute("data-nexus-shell-heal", "emergency");
    return;
  }
  document.documentElement.removeAttribute("data-nexus-shell-heal");
}

export default function ShellHealthGuard() {
  const pathname = usePathname() ?? getDefaultEntrypoint();
  const updateSettings = useStore((s) => s.updateSettings);
  const resetOfficeLayout = useStore((s) => s.resetOfficeLayout);
  const [issue, setIssue] = useState<ShellHealthIssue | null>(null);
  const [showReloadedNotice, setShowReloadedNotice] = useState(false);
  const storageKey = useMemo(() => buildHealStorageKey(pathname), [pathname]);

  const resetTargetedViewState = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      TARGETED_VIEW_STORAGE_KEYS.forEach((key) => {
        window.localStorage.removeItem(key);
      });
      const sessionKeys: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i += 1) {
        const key = window.sessionStorage.key(i);
        if (key && key.startsWith(SHELL_HEAL_STORAGE_PREFIX)) {
          sessionKeys.push(key);
        }
      }
      sessionKeys.forEach((key) => window.sessionStorage.removeItem(key));
    } catch {
      // silent
    }

    resetOfficeLayout();
    updateSettings({
      officeSceneMode: DEFAULT_SETTINGS.officeSceneMode,
      officeMotion: DEFAULT_SETTINGS.officeMotion,
      officeSplitHeightPx: DEFAULT_SETTINGS.officeSplitHeightPx,
      officeCameraPreset: DEFAULT_SETTINGS.officeCameraPreset,
      officeOperationalMode: DEFAULT_SETTINGS.officeOperationalMode,
      officeVfxQuality: DEFAULT_SETTINGS.officeVfxQuality,
    });
  }, [resetOfficeLayout, updateSettings]);

  const reloadShell = useCallback(() => {
    clearHealAttemptCount(storageKey);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, [storageKey]);

  const recoverToEntrypoint = useCallback(() => {
    clearHealAttemptCount(storageKey);
    if (typeof window !== "undefined") {
      window.location.assign(getDefaultEntrypoint());
    }
  }, [storageKey]);

  const resetAndReload = useCallback(() => {
    resetTargetedViewState();
    clearHealAttemptCount(storageKey);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, [resetTargetedViewState, storageKey]);

  useEffect(() => {
    let cancelled = false;

    applyEmergencyFlag(false);
    setIssue(null);
    setShowReloadedNotice(false);

    const runCheck = (isFinalAttempt: boolean) => {
      if (cancelled || typeof window === "undefined") return;
      const failure = evaluateShellHealth(pathname);
      if (!failure) {
        clearHealAttemptCount(storageKey);
        applyEmergencyFlag(false);
        setIssue(null);
        return;
      }
      if (!isFinalAttempt) return;

      const attempts = readHealAttemptCount(storageKey);
      if (attempts < MAX_AUTO_RELOADS) {
        writeHealAttemptCount(storageKey, attempts + 1);
        window.location.reload();
        return;
      }

      setShowReloadedNotice(attempts > 0);
      setIssue(failure);
      applyEmergencyFlag(true);
    };

    const timers = CHECK_DELAYS_MS.map((delay, index) =>
      window.setTimeout(() => {
        runCheck(index === CHECK_DELAYS_MS.length - 1);
      }, delay),
    );

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (cancelled) return;
      const failure = evaluateShellHealth(pathname);
      if (!failure) {
        clearHealAttemptCount(storageKey);
        applyEmergencyFlag(false);
        setIssue(null);
        return;
      }
      setShowReloadedNotice(readHealAttemptCount(storageKey) > 0);
      setIssue(failure);
      applyEmergencyFlag(true);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      document.removeEventListener("visibilitychange", onVisibilityChange);
      applyEmergencyFlag(false);
    };
  }, [pathname, storageKey]);

  if (!issue) {
    return null;
  }

  return (
    <>
      <ClientStyleMount
        id="shell-health-emergency-css"
        cssText={EMERGENCY_SHELL_CSS}
      />
      <div
        data-testid="shell-health-recovery"
        style={{
          position: "fixed",
          right: "16px",
          bottom: "16px",
          zIndex: 260,
          width: "min(420px, calc(100vw - 32px))",
          borderRadius: "22px",
          border: "1px solid rgba(245, 158, 11, 0.22)",
          background:
            "linear-gradient(180deg, rgba(12, 18, 29, 0.96), rgba(6, 11, 20, 0.98))",
          boxShadow: "0 26px 70px rgba(0,0,0,0.52)",
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              width: "fit-content",
              borderRadius: "999px",
              padding: "6px 10px",
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.22)",
              color: "#fcd79d",
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Shell self-heal
          </div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: "#f7fbff",
            }}
          >
            Recovered into emergency mode
          </div>
          <div
            style={{
              fontSize: "13px",
              lineHeight: 1.65,
              color: "rgba(223, 239, 248, 0.84)",
            }}
          >
            {issue.detail}
          </div>
          {showReloadedNotice ? (
            <div
              style={{
                fontSize: "11px",
                lineHeight: 1.55,
                color: "rgba(252, 211, 77, 0.88)",
              }}
            >
              A one-time automatic reload already ran. The actions below let you
              recover without getting stuck in a reload loop.
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <button
            type="button"
            onClick={reloadShell}
            style={{
              minHeight: "38px",
              borderRadius: "999px",
              border: "1px solid rgba(103, 232, 249, 0.22)",
              background: "rgba(103, 232, 249, 0.08)",
              color: "#def9ff",
              padding: "0 12px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Reload shell
          </button>
          <button
            type="button"
            onClick={recoverToEntrypoint}
            style={{
              minHeight: "38px",
              borderRadius: "999px",
              border: "1px solid rgba(245, 158, 11, 0.22)",
              background: "rgba(245, 158, 11, 0.08)",
              color: "#ffe4b0",
              padding: "0 12px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Open HQ
          </button>
          <button
            type="button"
            onClick={resetAndReload}
            style={{
              minHeight: "38px",
              borderRadius: "999px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              background: "rgba(255, 255, 255, 0.04)",
              color: "#f1f8ff",
              padding: "0 12px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Reset local view state
          </button>
        </div>

        <div
          style={{
            fontSize: "11px",
            lineHeight: 1.55,
            color: "rgba(163, 190, 210, 0.82)",
          }}
        >
          Reset clears only local UI view state such as split/layout cache and
          graph or scheduler filters. It does not expose secrets and does not
          wipe durable saved artifacts.
        </div>
      </div>
    </>
  );
}
