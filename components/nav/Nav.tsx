// ── components/nav/Nav ─────────────────────────────────────
// Top navigation bar with tab links, settings, and user menu.

"use client";

import { clsx } from "clsx";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import OperationalLightGrid from "@/components/ui/OperationalLightGrid";
import { useOperationalLights } from "@/hooks/useOperationalLights";
import { BRAND_NAME, BRAND_TAGLINE, getSurfaceBranding } from "@/lib/brand";
import { buildSnapshot, resolveActiveUIRules } from "@/lib/uiRules";
import {
  NEXUS_FREE_USE_DESCRIPTION,
  NEXUS_FREE_USE_LABEL,
} from "@/lib/productGuarantees";
import {
  resolveSurfaceSignalMotionSpec,
  type SurfaceMotionSurface,
} from "@/lib/surfaceMotion";
import { useStore } from "@/store/useStore";
import {
  getDefaultEntrypoint,
  getNavProductSurfaces,
  normalizeSurfaceHref,
} from "@/lib/releaseMatrix";

const SettingsDrawer = dynamic(
  () => import("@/components/settings/SettingsDrawer"),
  {
    ssr: false,
  },
);
const NotificationCenter = dynamic(
  () => import("@/components/ui/NotificationCenter"),
  {
    ssr: false,
  },
);

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const toprailRef = useRef<HTMLElement | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<
    "settings" | "notifications" | null
  >(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [hoverSurface, setHoverSurface] = useState<SurfaceMotionSurface | null>(
    null,
  );
  const unreadCount = useStore((s) => s.unreadCount);
  const activeUIRuleIds = useStore((s) => s.activeUIRuleIds);
  const signals = useStore((s) => s.signals);
  const cves = useStore((s) => s.cves);
  const worldRisk = useStore((s) => s.worldRisk);
  const prices = useStore((s) => s.prices);
  const agentRuntime = useStore((s) => s.agentRuntime);
  const councilMode = useStore((s) => s.councilMode);
  const tabs = getNavProductSurfaces();
  const { grid: operationalLights } = useOperationalLights();

  // Keyboard shortcuts: Alt+1 through Alt+8 switch to the Nth GA tab.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const n = parseInt(e.key, 10);
      if (isNaN(n) || n < 1 || n > 8) return;
      const target = tabs[n - 1];
      if (!target) return;
      e.preventDefault();
      router.push(target.href);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tabs, router]);
  const activePath = normalizeSurfaceHref(pathname);
  const activeTab = tabs.find((tab) => tab.href === activePath) ?? tabs[0];
  const activeBranding = getSurfaceBranding(activeTab?.id);
  const previewSurface =
    hoverSurface ?? (activeTab?.id as SurfaceMotionSurface | undefined) ?? "hq";
  const previewBranding = getSurfaceBranding(previewSurface);
  const signalSpec = resolveSurfaceSignalMotionSpec(
    (activeTab?.id as SurfaceMotionSurface | undefined) ?? "hq",
  );
  const settingsOpen = activeOverlay === "settings";
  const notificationsOpen = activeOverlay === "notifications";
  const uiSnapshot = buildSnapshot({
    signals,
    cves,
    worldRisk,
    prices,
    agentRuntime,
    councilMode,
  });
  const topHeaderIndicator = resolveActiveUIRules(
    uiSnapshot,
    activeUIRuleIds,
  ).find((entry) => entry.rule.action === "header-indicator");

  useEffect(() => {
    const toprail = toprailRef.current;
    if (!toprail || typeof window === "undefined") return;

    const root = document.documentElement;
    let frame = 0;

    const syncToprailHeight = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const height = Math.ceil(toprail.getBoundingClientRect().height);
        if (height > 0) {
          root.style.setProperty("--top-rail-height", `${height}px`);
        }
      });
    };

    syncToprailHeight();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            syncToprailHeight();
          })
        : null;
    observer?.observe(toprail);
    window.addEventListener("resize", syncToprailHeight);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", syncToprailHeight);
      root.style.removeProperty("--top-rail-height");
    };
  }, []);

  return (
    <>
      <nav
        aria-label="Primary navigation"
        ref={toprailRef}
        className="nexus-toprail nexus-command-header nexus-command-header--slim"
        data-overlay-state={activeOverlay ?? "closed"}
      >
        <div
          className="nexus-toprail__inner nexus-command-header__inner"
          data-surface={activeTab?.id ?? "hq"}
          style={
            {
              "--nexus-toprail-route-a": activeBranding.accentPalette[0],
              "--nexus-toprail-route-b": activeBranding.accentPalette[1],
              "--nexus-signal-nav-beam-duration": `${signalSpec.navBeamMs}ms`,
            } as CSSProperties
          }
        >
          <div className="nexus-command-header__mission">
            <Link
              href={getDefaultEntrypoint()}
              className="nexus-command-header__brand"
              data-testid="toprail-brand"
              title={`${BRAND_NAME} · ${BRAND_TAGLINE}`}
            >
              <span className="nexus-command-header__brandLabel">
                {BRAND_NAME}
              </span>
            </Link>
            <div className="nexus-command-header__context">
              <span className="nexus-command-header__contextValue">
                {previewBranding.visibleLabel}
              </span>
            </div>
          </div>

          <div
            className="nexus-command-header__rail"
            data-surface={activeTab?.id ?? "hq"}
          >
            <div className="nexus-command-header__tabs">
              {tabs.map((tab, i) => {
                const active = activePath === tab.href;
                const branding = getSurfaceBranding(tab.id);
                const shortcut = i < 8 ? ` · Alt+${i + 1}` : "";
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={clsx(
                      "nexus-command-header__link",
                      active && "is-active",
                    )}
                    aria-current={active ? "page" : undefined}
                    aria-label={branding.ariaLabel}
                    data-testid={`nav-tab-${tab.href.replace(/\//g, "") || "root"}`}
                    data-nexus-tab={tab.id}
                    title={`${branding.visibleLabel} · ${branding.functionalLabel}${shortcut}`}
                    onMouseEnter={() =>
                      setHoverSurface(tab.id as SurfaceMotionSurface)
                    }
                    onMouseLeave={() => setHoverSurface(null)}
                    onFocus={() =>
                      setHoverSurface(tab.id as SurfaceMotionSurface)
                    }
                    onBlur={() => setHoverSurface(null)}
                    style={
                      {
                        "--nexus-tab-a": branding.accentPalette[0],
                        "--nexus-tab-b": branding.accentPalette[1],
                        "--nexus-signal-nav-beam-duration": `${signalSpec.navBeamMs}ms`,
                      } as CSSProperties
                    }
                  >
                    <span className="nexus-command-header__linkLabel">
                      {branding.visibleLabel}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="nexus-command-header__utility">
            <div className="nexus-command-header__utilityCore">
              <div className="nexus-command-header__status">
                <span
                  className="nexus-command-header__statusValue"
                  title={NEXUS_FREE_USE_DESCRIPTION}
                >
                  {NEXUS_FREE_USE_LABEL}
                </span>
                {topHeaderIndicator?.indicatorText ? (
                  <span
                    className="nexus-command-header__statusAux"
                    data-testid="toprail-dynamic-indicator"
                    title={topHeaderIndicator.rule.label}
                    style={{
                      color:
                        topHeaderIndicator.rule.indicator?.color ?? "inherit",
                    }}
                  >
                    {topHeaderIndicator.indicatorText}
                  </span>
                ) : null}
              </div>
              <OperationalLightGrid
                grid={operationalLights}
                variant="toprail"
                maxLights={6}
                title="Operational lights"
              />
            </div>

            <Link
              href="/security"
              className="nexus-toprail__icon-button"
              data-testid="toprail-trust"
              aria-label="Open trust operations"
              aria-current={pathname === "/security" ? "page" : undefined}
              title="Trust operations"
            >
              <span
                className="nexus-command-header__buttonLabel"
                aria-hidden="true"
              >
                TRST
              </span>
            </Link>

            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setNotificationsLoaded(true);
                flushSync(() => {
                  setActiveOverlay("notifications");
                });
              }}
              onMouseEnter={() => setNotificationsLoaded(true)}
              onFocus={() => setNotificationsLoaded(true)}
              className="nexus-toprail__icon-button"
              data-testid="toprail-notifications"
              title="Notifications"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
              aria-haspopup="dialog"
              aria-expanded={notificationsOpen}
              aria-controls="nexus-notifications-dialog"
            >
              <span
                className="nexus-command-header__buttonLabel"
                aria-hidden="true"
              >
                ALRT
              </span>
              {unreadCount > 0 && (
                <span className="nexus-toprail__badge">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setSettingsLoaded(true);
                flushSync(() => {
                  setActiveOverlay("settings");
                });
              }}
              onMouseEnter={() => setSettingsLoaded(true)}
              onFocus={() => setSettingsLoaded(true)}
              className="nexus-toprail__icon-button"
              data-testid="toprail-settings"
              aria-label="Open settings"
              title="Settings"
              aria-haspopup="dialog"
              aria-expanded={settingsOpen}
              aria-controls="nexus-settings-dialog"
            >
              <span
                className="nexus-command-header__buttonLabel"
                aria-hidden="true"
              >
                CTRL
              </span>
            </button>
          </div>
        </div>
      </nav>

      {settingsLoaded ? (
        <SettingsDrawer
          open={settingsOpen}
          onClose={() =>
            flushSync(() => {
              setActiveOverlay(null);
            })
          }
        />
      ) : null}
      {notificationsLoaded ? (
        <NotificationCenter
          open={notificationsOpen}
          onClose={() =>
            flushSync(() => {
              setActiveOverlay(null);
            })
          }
        />
      ) : null}
    </>
  );
}
