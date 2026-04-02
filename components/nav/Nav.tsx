// ── components/nav/Nav ─────────────────────────────────────
// Top navigation bar with tab links, settings, and user menu.

"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { flushSync } from "react-dom";
import SettingsDrawer from "@/components/settings/SettingsDrawer";
import NotificationCenter from "@/components/ui/NotificationCenter";
import { ShellBadge } from "@/components/ui/shell";
import { BRAND_NAME, BRAND_TAGLINE, getSurfaceBranding } from "@/lib/brand";
import {
  NEXUS_FREE_USE_DESCRIPTION,
  NEXUS_FREE_USE_LABEL,
} from "@/lib/productGuarantees";
import { useStore } from "@/store/useStore";
import {
  getDefaultEntrypoint,
  getNavProductSurfaces,
  normalizeSurfaceHref,
} from "@/lib/releaseMatrix";

export default function Nav() {
  const pathname = usePathname();
  const [activeOverlay, setActiveOverlay] = useState<"settings" | "notifications" | null>(null);
  const unreadCount = useStore((s) => s.unreadCount);
  const tabs = getNavProductSurfaces();
  const activePath = normalizeSurfaceHref(pathname);
  const settingsOpen = activeOverlay === "settings";
  const notificationsOpen = activeOverlay === "notifications";

  return (
    <>
      <nav className="nexus-toprail" data-overlay-state={activeOverlay ?? "closed"}>
        <div className="nexus-toprail__inner">
        <Link
          href={getDefaultEntrypoint()}
          className="nexus-toprail__brand"
          data-testid="toprail-brand"
        >
          <span className="nexus-toprail__eyebrow">{BRAND_NAME}</span>
          <span className="nexus-toprail__subtitle">{BRAND_TAGLINE}</span>
        </Link>

        <div className="nexus-toprail__tabs" role="tablist" aria-label="Primary navigation">
          {tabs.map((tab) => {
            const active = activePath === tab.href;
            const branding = getSurfaceBranding(tab.id);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={clsx("nexus-toprail__link", active && "is-active")}
                aria-current={active ? "page" : undefined}
                aria-label={branding.ariaLabel}
                data-testid={`nav-tab-${tab.href.replace(/\//g, "") || "root"}`}
                title={`${branding.visibleLabel} · ${branding.functionalLabel}`}
              >
                {branding.visibleLabel}
              </Link>
            );
          })}
        </div>

        <div className="nexus-toprail__meta">
          <ShellBadge tone="success">
            <span title={NEXUS_FREE_USE_DESCRIPTION}>{NEXUS_FREE_USE_LABEL}</span>
          </ShellBadge>

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
