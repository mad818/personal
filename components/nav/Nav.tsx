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
import { getNavProductSurfaces } from "@/lib/releaseMatrix";

export default function Nav() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const tabs = getNavProductSurfaces();

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "48px",
          /* Dark warm glassmorphism */
          background: "rgba(10, 7, 8, 0.88)",
          backdropFilter: "blur(18px) saturate(180%)",
          WebkitBackdropFilter: "blur(18px) saturate(180%)",
          borderBottom: "1px solid rgba(196,72,90,0.08)",
          boxShadow:
            "0 1px 0 rgba(212,149,106,0.04), 0 2px 20px rgba(0,0,0,.6)",
          display: "flex",
          alignItems: "center",
          gap: "2px",
          padding: "0 12px",
          zIndex: 1000,
          overflowX: "auto",
        }}
      >
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || (pathname === "/" && tab.href === "/home");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                position: "relative",
                padding: "5px 11px",
                borderRadius: "6px",
                fontSize: "11.5px",
                fontWeight: 700,
                whiteSpace: "nowrap",
                background: active ? "rgba(196,72,90,0.18)" : "transparent",
                color: active ? "#f5d0d6" : "var(--text2)",
                transition: "all 0.15s ease",
                textDecoration: "none",
                letterSpacing: "0.2px",
              }}
            >
              {tab.label}
              {/* Active underline glow — rose */}
              {active && (
                <span
                  style={{
                    position: "absolute",
                    bottom: "-1px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "60%",
                    height: "2px",
                    borderRadius: "2px 2px 0 0",
                    background:
                      "linear-gradient(90deg, transparent, #c4485a, transparent)",
                    boxShadow: "0 0 8px 1px rgba(196,72,90,.7)",
                  }}
                />
              )}
            </Link>
          );
        })}

        <span
          title={NEXUS_FREE_USE_DESCRIPTION}
          style={{
            marginLeft: "auto",
            flexShrink: 0,
            fontSize: "9.5px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--text3)",
            padding: "4px 8px",
            borderRadius: "6px",
            border: "1px solid rgba(196,72,90,0.2)",
            background: "rgba(16,185,129,0.08)",
            whiteSpace: "nowrap",
          }}
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
