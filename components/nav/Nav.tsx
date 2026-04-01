// ── components/nav/Nav ─────────────────────────────────────
// Top navigation bar with tab links, settings, and user menu.

"use client";

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
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          minHeight: "var(--top-rail-height)",
          background: "rgba(10, 7, 8, 0.82)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          borderBottom: "1px solid var(--hairline)",
          boxShadow: "0 1px 0 rgba(212,149,106,0.03), 0 18px 48px rgba(0,0,0,.4)",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "10px 16px",
          zIndex: 1000,
        }}
      >
        <Link
          href={getDefaultEntrypoint()}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "3px",
            minWidth: "fit-content",
            textDecoration: "none",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--accent2)",
            }}
          >
            Nexus Prime
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--text-muted)",
              letterSpacing: "0.02em",
            }}
          >
            Cinematic command center
          </span>
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flex: 1,
            minWidth: 0,
            overflowX: "auto",
            paddingBottom: "2px",
          }}
        >
          {tabs.map((tab) => {
            const active = activePath === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "38px",
                  padding: "0 14px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  background: active
                    ? "linear-gradient(135deg, rgba(196,72,90,.24), rgba(212,149,106,.18))"
                    : "rgba(255,255,255,0.02)",
                  color: active ? "var(--text-strong)" : "var(--text2)",
                  border: active
                    ? "1px solid rgba(212,149,106,.24)"
                    : "1px solid transparent",
                  transition:
                    "background var(--t), color var(--t), border-color var(--t), transform var(--t)",
                  textDecoration: "none",
                  letterSpacing: "0.04em",
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <ShellBadge tone="success">
          <span title={NEXUS_FREE_USE_DESCRIPTION}>{NEXUS_FREE_USE_LABEL}</span>
        </ShellBadge>

        <button
          type="button"
          onClick={() => {
            setSettingsOpen(false);
            setNotificationsOpen(true);
          }}
          style={{
            position: "relative",
            padding: "0 14px",
            minHeight: "38px",
            borderRadius: "999px",
            fontSize: "14px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--hairline)",
            color: "var(--text2)",
            cursor: "pointer",
            flexShrink: 0,
            transition: "background var(--t), color var(--t), border-color var(--t)",
          }}
          title="Notifications"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          aria-haspopup="dialog"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(196,72,90,.08)";
            e.currentTarget.style.borderColor = "rgba(196,72,90,.22)";
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.02)";
            e.currentTarget.style.borderColor = "var(--hairline)";
            e.currentTarget.style.color = "var(--text2)";
          }}
        >
          🔔
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "6px",
                right: "6px",
                minWidth: "15px",
                height: "15px",
                padding: "0 4px",
                borderRadius: "999px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #c4485a, #d4956a)",
                color: "#fff",
                fontSize: "9px",
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Settings button */}
        <button
          type="button"
          onClick={() => {
            setNotificationsOpen(false);
            setSettingsOpen(true);
          }}
          style={{
            padding: "0 14px",
            minHeight: "38px",
            borderRadius: "999px",
            fontSize: "14px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--hairline)",
            color: "var(--text2)",
            cursor: "pointer",
            flexShrink: 0,
            transition: "background var(--t), color var(--t), border-color var(--t)",
          }}
          title="Settings"
          aria-haspopup="dialog"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(196,72,90,.08)";
            e.currentTarget.style.borderColor = "rgba(196,72,90,.22)";
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.02)";
            e.currentTarget.style.borderColor = "var(--hairline)";
            e.currentTarget.style.color = "var(--text2)";
          }}
        >
          ⚙️
        </button>
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
