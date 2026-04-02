// ── components/nav/Nav ─────────────────────────────────────
// Top navigation bar with tab links, settings, and user menu.

"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import SettingsDrawer from "@/components/settings/SettingsDrawer";
import NotificationCenter from "@/components/ui/NotificationCenter";
import { ShellBadge } from "@/components/ui/shell";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadCount = useStore((s) => s.unreadCount);
  const tabs = getNavProductSurfaces();
  const activePath = normalizeSurfaceHref(pathname);

  return (
    <>
      <nav className="nexus-toprail">
        <div className="nexus-toprail__inner">
        <Link
          href={getDefaultEntrypoint()}
          className="nexus-toprail__brand"
        >
          <span className="nexus-toprail__eyebrow">Nexus Prime</span>
          <span className="nexus-toprail__subtitle">After-dark command center</span>
        </Link>

        <div className="nexus-toprail__tabs" role="tablist" aria-label="Primary navigation">
          {tabs.map((tab) => {
            const active = activePath === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={clsx("nexus-toprail__link", active && "is-active")}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
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
            onClick={() => {
              setSettingsOpen(false);
              setNotificationsOpen(true);
            }}
            className="nexus-toprail__icon-button"
            title="Notifications"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            aria-haspopup="dialog"
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
            onClick={() => {
              setNotificationsOpen(false);
              setSettingsOpen(true);
            }}
            className="nexus-toprail__icon-button"
            title="Settings"
            aria-haspopup="dialog"
          >
            <span aria-hidden="true">⚙️</span>
          </button>
        </div>
        </div>
      </nav>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <NotificationCenter
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </>
  );
}
