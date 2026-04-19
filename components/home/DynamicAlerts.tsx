// ── components/home/DynamicAlerts.tsx ─────────────────────────────────────────
// Renders active UI rules as floating cards and nav badges.
// Uses React portals for badges (injected into nav elements).
// Returns null when no rules are active — zero DOM cost.
"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/store/useStore";
import { resolveSurfaceSignalMotionSpec } from "@/lib/surfaceMotion";
import { buildSnapshot, resolveActiveUIRules } from "@/lib/uiRules";
import type { UIRule } from "@/components/home/office/types";

// ── Float cards ───────────────────────────────────────────────────────────────
function FloatCard({ rule, snapshot, onDismiss }: {
  rule: UIRule;
  snapshot: ReturnType<typeof buildSnapshot>;
  onDismiss: () => void;
}) {
  const card = rule.card;

  // Hooks must be called unconditionally — guard internals instead of early-returning before them.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!card || !rule.ttl) return;
    timerRef.current = setTimeout(onDismiss, rule.ttl);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [card, rule.id, rule.ttl, onDismiss]);

  if (!card) return null;
  const title = card.title;
  const body  = card.body;
  const signalSpec = resolveSurfaceSignalMotionSpec("hq");

  return (
    <div
      className="nexus-command-ping"
      data-signal-state="stamp"
      style={{
        "--nexus-command-ping-color": card.color,
        "--nexus-signal-alert-stamp-duration": `${signalSpec.alertStampMs}ms`,
      } as CSSProperties}
    >
      <button
        onClick={onDismiss}
        className="nexus-command-ping__dismiss"
        aria-label="Dismiss"
      >
        ×
      </button>
      <div className="nexus-command-ping__eyebrow">Command ping</div>
      <div className="nexus-command-ping__header">
        {card.emoji && <span className="nexus-command-ping__emoji">{card.emoji}</span>}
        <span className="nexus-command-ping__title" style={{ color: card.color }}>
          {title}
        </span>
      </div>
      <p className="nexus-command-ping__body">{body}</p>
    </div>
  );
}

// ── Nav badge portal ──────────────────────────────────────────────────────────
function NavBadge({ rule, snapshot }: { rule: UIRule; snapshot: ReturnType<typeof buildSnapshot> }) {
  if (!rule.badge) return null;
  const el = typeof document !== "undefined"
    ? document.querySelector(`[data-nexus-tab="${rule.badge.tab}"]`)
    : null;
  if (!el) return null;

  const label = rule.badge.label;

  return createPortal(
    <span
      style={{
        position: "absolute",
        top: "-4px",
        right: "-4px",
        background: rule.badge.color,
        color: "#fff",
        borderRadius: "9999px",
        fontSize: "9px",
        fontWeight: 700,
        padding: "0 4px",
        minWidth: "14px",
        textAlign: "center",
        lineHeight: "14px",
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      {label}
    </span>,
    el as Element,
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function DynamicAlerts() {
  const activeUIRuleIds = useStore((s) => s.activeUIRuleIds);
  const dismissUIRule   = useStore((s) => s.dismissUIRule);
  const signals   = useStore((s) => s.signals);
  const cves      = useStore((s) => s.cves);
  const worldRisk = useStore((s) => s.worldRisk);
  const prices    = useStore((s) => s.prices);
  const agentRuntime = useStore((s) => s.agentRuntime);
  const councilMode = useStore((s) => s.councilMode);

  if (activeUIRuleIds.length === 0) return null;

  const snapshot = buildSnapshot({
    signals,
    cves,
    worldRisk,
    prices,
    agentRuntime,
    councilMode,
  });
  const activeRules = resolveActiveUIRules(snapshot, activeUIRuleIds);

  const floatCards = activeRules.filter((entry) => entry.rule.action === "float-card");
  const navBadges  = activeRules.filter((entry) => entry.rule.action === "nav-badge");

  return (
    <>
      {/* Float cards — fixed bottom-right stack */}
      {floatCards.length > 0 && (
        <div
          className="nexus-command-ping-stack"
        >
          {floatCards.map((rule) => (
            <FloatCard
              key={rule.activationKey}
              rule={{
                ...rule.rule,
                card: rule.rule.card
                  ? {
                      ...rule.rule.card,
                      title: rule.title ?? rule.rule.card.title,
                      body: rule.body ?? rule.rule.card.body,
                    }
                  : undefined,
              }}
              snapshot={snapshot}
              onDismiss={() => dismissUIRule(rule.activationKey)}
            />
          ))}
        </div>
      )}

      {/* Nav badges — via portals */}
      {navBadges.map((rule) => (
        <NavBadge
          key={rule.activationKey}
          rule={{
            ...rule.rule,
            badge: rule.rule.badge
              ? {
                  ...rule.rule.badge,
                  label: rule.badgeLabel ?? rule.rule.badge.label,
                }
              : undefined,
          }}
          snapshot={snapshot}
        />
      ))}
    </>
  );
}
