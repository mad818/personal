// ── components/nav/Nav ─────────────────────────────────────
// Top navigation bar with tab links, settings, and user menu.

"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type CSSProperties, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import SettingsDrawer from "@/components/settings/SettingsDrawer";
import NotificationCenter from "@/components/ui/NotificationCenter";
import { ShellBadge } from "@/components/ui/shell";
import { BRAND_NAME, BRAND_TAGLINE, getSurfaceBranding } from "@/lib/brand";
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

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeOverlay, setActiveOverlay] = useState<"settings" | "notifications" | null>(null);
  const unreadCount = useStore((s) => s.unreadCount);
  const tabs = getNavProductSurfaces();

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
  const signalSpec = resolveSurfaceSignalMotionSpec(
    (activeTab?.id as SurfaceMotionSurface | undefined) ?? "hq",
  );
  const settingsOpen = activeOverlay === "settings";
  const notificationsOpen = activeOverlay === "notifications";

  return (
    <>
      <nav className="nexus-toprail" data-overlay-state={activeOverlay ?? "closed"}>
        <div
          className="nexus-toprail__inner"
          data-surface={activeTab?.id ?? "hq"}
          style={
            {
              "--nexus-toprail-route-a": activeBranding.accentPalette[0],
              "--nexus-toprail-route-b": activeBranding.accentPalette[1],
              "--nexus-signal-nav-beam-duration": `${signalSpec.navBeamMs}ms`,
            } as CSSProperties
          }
        >
          <div className="nexus-toprail__identity">
            <Link
              href={getDefaultEntrypoint()}
              className="nexus-toprail__brand"
              data-testid="toprail-brand"
            >
              <span className="nexus-toprail__brand-plaque">
                <span className="nexus-toprail__brand-sigil" aria-hidden="true">
                  <span className="nexus-toprail__brand-sigilMark" />
                </span>
                <span className="nexus-toprail__brand-copy">
                  <span className="nexus-toprail__eyebrow">{BRAND_NAME}</span>
                  <span className="nexus-toprail__subtitle">{BRAND_TAGLINE}</span>
                </span>
              </span>
            </Link>
            <div
              className="nexus-toprail__surface"
              style={
                {
                  "--nexus-toprail-surface-a": activeBranding.accentPalette[0],
                  "--nexus-toprail-surface-b": activeBranding.accentPalette[1],
                } as CSSProperties
              }
              aria-hidden="true"
            >
              <span className="nexus-toprail__surface-label">{activeBranding.visibleLabel}</span>
              <span className="nexus-toprail__surface-note">{activeBranding.heroKicker}</span>
            </div>
          </div>

          <div
            className="nexus-toprail__commandBar"
            data-surface={activeTab?.id ?? "hq"}
          >
            <div className="nexus-toprail__tabs" role="tablist" aria-label="Primary navigation">
              {tabs.map((tab, i) => {
                const active = activePath === tab.href;
                const branding = getSurfaceBranding(tab.id);
                const shortcut = i < 8 ? ` · Alt+${i + 1}` : "";
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={clsx("nexus-toprail__link", active && "is-active")}
                    aria-current={active ? "page" : undefined}
                    aria-label={branding.ariaLabel}
                    data-testid={`nav-tab-${tab.href.replace(/\//g, "") || "root"}`}
                    data-nexus-tab={tab.id}
                    title={`${branding.visibleLabel} · ${branding.functionalLabel}${shortcut}`}
                    style={
                      {
                        "--nexus-tab-a": branding.accentPalette[0],
                        "--nexus-tab-b": branding.accentPalette[1],
                        "--nexus-signal-nav-beam-duration": `${signalSpec.navBeamMs}ms`,
                      } as CSSProperties
                    }
                    >
                      <span className="nexus-toprail__linkCore">
                        <span className="nexus-toprail__linkOrdinal" aria-hidden="true">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="nexus-toprail__linkStud" aria-hidden="true" />
                        <span className="nexus-toprail__linkLabel">{branding.visibleLabel}</span>
                      </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="nexus-toprail__meta">
            <div className="nexus-toprail__status">
              <ShellBadge tone="success">
                <span title={NEXUS_FREE_USE_DESCRIPTION}>{NEXUS_FREE_USE_LABEL}</span>
              </ShellBadge>
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                flushSync(() => {
                  setActiveOverlay("notifications");
                });
              }}
              className="nexus-toprail__icon-button"
              data-testid="toprail-notifications"
              title="Notifications"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
              aria-haspopup="dialog"
              aria-expanded={notificationsOpen}
              aria-controls="nexus-notifications-dialog"
            >
              <span aria-hidden="true">🔔</span>
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
                flushSync(() => {
                  setActiveOverlay("settings");
                });
              }}
              className="nexus-toprail__icon-button"
              data-testid="toprail-settings"
              title="Settings"
              aria-haspopup="dialog"
              aria-expanded={settingsOpen}
              aria-controls="nexus-settings-dialog"
            >
              <span aria-hidden="true">⚙️</span>
            </button>
          </div>
        </div>
      </nav>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() =>
          flushSync(() => {
            setActiveOverlay(null);
          })
        }
      />
      <NotificationCenter
        open={notificationsOpen}
        onClose={() =>
          flushSync(() => {
            setActiveOverlay(null);
          })
        }
      />
    </>
  );
}
