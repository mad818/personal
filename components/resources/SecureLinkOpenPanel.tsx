"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { inspectSecureLink } from "@/lib/secureLink";
import { SectionLabel, ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";

function cardStyle(): CSSProperties {
  return {
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    background: "var(--surf1)",
  };
}

function controlStyle(): CSSProperties {
  return {
    width: "100%",
    minWidth: 0,
    padding: "10px 11px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--surf2)",
    color: "var(--text)",
    fontSize: "13px",
  };
}

function buttonStyle(active = false): CSSProperties {
  return {
    minHeight: "38px",
    padding: "9px 12px",
    borderRadius: "10px",
    border: active
      ? "1px solid var(--accent)"
      : "1px solid var(--border)",
    background: active ? "var(--surf2)" : "var(--surf1)",
    color: "var(--text)",
    fontSize: "12px",
    cursor: active ? "pointer" : "not-allowed",
    opacity: active ? 1 : 0.58,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function badgeTone(risk: ReturnType<typeof inspectSecureLink>["risk"]) {
  if (risk === "safe") return "success";
  if (risk === "private") return "accent";
  if (risk === "blocked") return "default";
  return "muted";
}

export default function SecureLinkOpenPanel() {
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const inspection = useMemo(() => inspectSecureLink(link), [link]);

  async function copySafeLink() {
    if (!inspection.href) return;
    try {
      await navigator.clipboard.writeText(inspection.href);
      setMessage("Copied safe link.");
    } catch {
      setMessage("Copy failed.");
    }
  }

  return (
    <section style={{ display: "grid", gap: "12px" }}>
      <SurfaceCallout
        tone="info"
        compact
        icon="L"
        title="Secure link opener"
        description="Paste a local, Tailscale, or HTTPS link. Nexus validates it locally and opens only after you choose the secure open action."
      />

      <div style={cardStyle()}>
        <SectionLabel detail="No fetch, no history">Open a link</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            gap: "10px",
            alignItems: "end",
            marginTop: "10px",
          }}
        >
          <label style={{ display: "grid", gap: "6px" }}>
            <span
              style={{
                color: "var(--text3)",
                fontSize: "10px",
                textTransform: "uppercase",
              }}
            >
              Link
            </span>
            <input
              value={link}
              onChange={(event) => {
                setLink(event.target.value);
                setMessage("");
              }}
              placeholder="https://example.com or macbook.tailnet.ts.net:8096"
              style={controlStyle()}
            />
          </label>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => void copySafeLink()}
              disabled={!inspection.href}
              style={buttonStyle(Boolean(inspection.href))}
            >
              Copy safe link
            </button>
            {inspection.href ? (
              <a
                href={inspection.href}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                onClick={() => setMessage("Opening without opener or referrer.")}
                style={buttonStyle(true)}
              >
                Open securely
              </a>
            ) : (
              <span aria-disabled="true" style={buttonStyle(false)}>
                Open securely
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginTop: "10px",
          }}
        >
          <ShellBadge tone={badgeTone(inspection.risk)}>
            {inspection.label}
          </ShellBadge>
          {inspection.displayHost ? (
            <ShellBadge tone="muted">{inspection.displayHost}</ShellBadge>
          ) : null}
          {message ? <ShellBadge tone="accent">{message}</ShellBadge> : null}
        </div>

        <p
          style={{
            margin: "10px 0 0",
            color: "var(--text2)",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          {inspection.reason}
        </p>
        {inspection.href ? (
          <p
            style={{
              margin: "6px 0 0",
              color: "var(--text3)",
              fontSize: "11px",
              overflowWrap: "anywhere",
            }}
          >
            {inspection.href}
          </p>
        ) : null}
      </div>
    </section>
  );
}
