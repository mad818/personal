"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import MediaEscapeLibrary from "@/components/resources/MediaEscapeLibrary";
import {
  calculateSubscriptionEscapeTotals,
  countCompletedSafetySteps,
  createDefaultSubscriptionEscapeState,
  createEmptySafetyChecklist,
  isSafeToCancel,
  normalizeMonthlyCost,
  SUBSCRIPTION_ESCAPE_SAFETY_LABELS,
  type MediaEscapeItem,
  type SubscriptionEscapeCategory,
  type SubscriptionEscapeItem,
  type SubscriptionEscapeSource,
  type SubscriptionEscapeState,
  type SubscriptionEscapeStatus,
  type SubscriptionReplacementOption,
  type SubscriptionSafetyKey,
} from "@/lib/subscriptionEscape";
import { SectionLabel, ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";

interface EscapePayload {
  state: SubscriptionEscapeState;
  catalog: SubscriptionReplacementOption[];
  sources: SubscriptionEscapeSource[];
  guardrails: readonly string[];
  storage?: {
    pathHint?: string;
    configured?: boolean;
    resolvedPath?: string;
  };
}

const CATEGORY_LABELS: Record<SubscriptionEscapeCategory, string> = {
  "cloud-storage": "Cloud storage",
  passwords: "Passwords",
  media: "Media",
  "notes-docs": "Notes/docs",
  "dns-privacy": "DNS/privacy",
  "ai-dev": "AI/dev",
  "device-sync": "Device sync",
  other: "Other",
};

const STATUS_LABELS: Record<SubscriptionEscapeStatus, string> = {
  paying: "Paying",
  testing: "Testing replacement",
  ready_to_cancel: "Ready to cancel",
  cancelled: "Cancelled",
};

const SAFETY_KEYS = Object.keys(
  SUBSCRIPTION_ESCAPE_SAFETY_LABELS,
) as SubscriptionSafetyKey[];

const EMPTY_CATALOG: SubscriptionReplacementOption[] = [];
const EMPTY_SOURCES: SubscriptionEscapeSource[] = [];
const EMPTY_GUARDRAILS: readonly string[] = [];

function cardStyle(tone: "normal" | "accent" | "danger" = "normal") {
  const border =
    tone === "accent"
      ? "1px solid rgba(120, 196, 255, 0.36)"
      : tone === "danger"
        ? "1px solid rgba(255, 119, 119, 0.4)"
        : "1px solid var(--border)";
  const background =
    tone === "accent"
      ? "rgba(56, 122, 255, 0.1)"
      : tone === "danger"
        ? "rgba(255, 99, 99, 0.08)"
        : "rgba(10, 15, 30, 0.62)";
  return {
    padding: "12px",
    borderRadius: "12px",
    border,
    background,
  } as const;
}

function controlStyle() {
  return {
    width: "100%",
    minWidth: 0,
    padding: "9px 10px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--surf2)",
    color: "var(--text)",
    fontSize: "12px",
  } as const;
}

function buttonStyle(active = false) {
  return {
    padding: "8px 10px",
    borderRadius: "10px",
    border: active
      ? "1px solid rgba(110, 231, 183, 0.52)"
      : "1px solid var(--border)",
    background: active ? "rgba(110, 231, 183, 0.16)" : "rgba(10, 15, 30, 0.58)",
    color: "var(--text)",
    fontSize: "11px",
    cursor: "pointer",
  } as const;
}

function money(value: number) {
  return `$${normalizeMonthlyCost(value).toFixed(2)}`;
}

function buildId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}`;
}

function findReplacement(
  catalog: SubscriptionReplacementOption[],
  id?: string,
) {
  return catalog.find((entry) => entry.id === id) ?? null;
}

export default function SubscriptionEscapeConsole() {
  const [payload, setPayload] = useState<EscapePayload | null>(null);
  const [loadStatus, setLoadStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [draftName, setDraftName] = useState("");
  const [draftCost, setDraftCost] = useState("");
  const [draftCategory, setDraftCategory] =
    useState<SubscriptionEscapeCategory>("cloud-storage");
  const [draftReplacementId, setDraftReplacementId] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoadStatus("loading");
      try {
        const response = await apiFetch("/api/subscription-escape", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const nextPayload = (await response.json()) as EscapePayload;
        if (!active) return;
        setPayload(nextPayload);
        setLoadStatus("ready");
      } catch {
        if (!active) return;
        setPayload({
          state: createDefaultSubscriptionEscapeState(),
          catalog: [],
          sources: [],
          guardrails: [],
        });
        setLoadStatus("error");
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const state = payload?.state ?? createDefaultSubscriptionEscapeState();
  const catalog = payload?.catalog ?? EMPTY_CATALOG;
  const sources = payload?.sources ?? EMPTY_SOURCES;
  const guardrails = payload?.guardrails ?? EMPTY_GUARDRAILS;
  const totals = useMemo(
    () => calculateSubscriptionEscapeTotals(state.subscriptions),
    [state.subscriptions],
  );

  const replacementByCategory = useMemo(() => {
    return catalog.reduce<Record<SubscriptionEscapeCategory, number>>(
      (acc, item) => {
        acc[item.category] = (acc[item.category] ?? 0) + 1;
        return acc;
      },
      {
        "cloud-storage": 0,
        passwords: 0,
        media: 0,
        "notes-docs": 0,
        "dns-privacy": 0,
        "ai-dev": 0,
        "device-sync": 0,
        other: 0,
      },
    );
  }, [catalog]);

  async function persist(nextState: SubscriptionEscapeState) {
    setSaveStatus("saving");
    try {
      const response = await apiFetch("/api/subscription-escape", {
        method: "POST",
        body: JSON.stringify({ state: nextState }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const nextPayload = (await response.json()) as {
        state: SubscriptionEscapeState;
      };
      setPayload((current) =>
        current
          ? { ...current, state: nextPayload.state }
          : {
              state: nextPayload.state,
              catalog,
              sources,
              guardrails,
              storage: payload?.storage,
            },
      );
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }

  function updateSubscriptions(
    updater: (items: SubscriptionEscapeItem[]) => SubscriptionEscapeItem[],
  ) {
    const nextState: SubscriptionEscapeState = {
      ...state,
      subscriptions: updater(state.subscriptions),
      updatedAt: new Date().toISOString(),
    };
    void persist(nextState);
  }

  function updateMediaLibrary(
    updater: (items: MediaEscapeItem[]) => MediaEscapeItem[],
  ) {
    const nextState: SubscriptionEscapeState = {
      ...state,
      mediaLibrary: updater(state.mediaLibrary),
      updatedAt: new Date().toISOString(),
    };
    void persist(nextState);
  }

  function addSubscription() {
    const name = draftName.trim();
    if (!name) return;
    const replacement =
      draftReplacementId ||
      catalog.find((item) => item.category === draftCategory)?.id;
    const item: SubscriptionEscapeItem = {
      id: buildId("escape"),
      name,
      category: draftCategory,
      monthlyCost: normalizeMonthlyCost(draftCost),
      replacementId: replacement || undefined,
      status: "paying",
      safety: createEmptySafetyChecklist(),
      updatedAt: new Date().toISOString(),
    };
    setDraftName("");
    setDraftCost("");
    setDraftReplacementId("");
    updateSubscriptions((items) => [item, ...items]);
  }

  function patchSubscription(
    item: SubscriptionEscapeItem,
    patch: Partial<SubscriptionEscapeItem>,
  ) {
    updateSubscriptions((items) =>
      items.map((entry) =>
        entry.id === item.id
          ? { ...entry, ...patch, updatedAt: new Date().toISOString() }
          : entry,
      ),
    );
  }

  function toggleSafety(
    item: SubscriptionEscapeItem,
    key: SubscriptionSafetyKey,
  ) {
    patchSubscription(item, {
      safety: {
        ...item.safety,
        [key]: !item.safety[key],
      },
    });
  }

  function removeSubscription(item: SubscriptionEscapeItem) {
    updateSubscriptions((items) =>
      items.filter((entry) => entry.id !== item.id),
    );
  }

  const publicExposureTone =
    state.host.publicExposure === "detected" ? "danger" : "accent";

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <SurfaceCallout
        tone="info"
        compact
        icon="S"
        title="MacBook local hub"
        description="Your MacBook is the always-on Nexus host. Desktop and iPad stay clients over Tailscale/LAN, so subscription data has one local source of truth."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
        }}
      >
        <div style={cardStyle("accent")}>
          <SectionLabel detail="Still active">Monthly burn</SectionLabel>
          <strong style={{ fontSize: "24px" }}>
            {money(totals.activeMonthly)}
          </strong>
          <p
            style={{
              margin: "6px 0 0",
              color: "var(--text2)",
              fontSize: "11px",
            }}
          >
            {money(totals.yearlyActive)} per year if nothing changes.
          </p>
        </div>
        <div style={cardStyle()}>
          <SectionLabel detail="Checklist complete">Ready savings</SectionLabel>
          <strong style={{ fontSize: "24px" }}>
            {money(totals.readyMonthly)}
          </strong>
          <p
            style={{
              margin: "6px 0 0",
              color: "var(--text2)",
              fontSize: "11px",
            }}
          >
            Manual cancellation only after proof is complete.
          </p>
        </div>
        <div style={cardStyle()}>
          <SectionLabel detail="Already removed">Cancelled</SectionLabel>
          <strong style={{ fontSize: "24px" }}>
            {money(totals.cancelledMonthly)}
          </strong>
          <p
            style={{
              margin: "6px 0 0",
              color: "var(--text2)",
              fontSize: "11px",
            }}
          >
            Keep receipts and exports until the next billing cycle clears.
          </p>
        </div>
        <div style={cardStyle(publicExposureTone)}>
          <SectionLabel detail={state.host.accessMode}>
            Access privacy
          </SectionLabel>
          <strong style={{ fontSize: "16px" }}>{state.host.hostLabel}</strong>
          <p
            style={{
              margin: "6px 0 0",
              color: "var(--text2)",
              fontSize: "11px",
            }}
          >
            Tailscale hides the Nexus host from public internet exposure.
            Outbound IP privacy still belongs to OS VPN or exit-node settings.
          </p>
        </div>
      </div>

      <MediaEscapeLibrary
        items={state.mediaLibrary}
        onChangeItems={updateMediaLibrary}
        saveStatus={saveStatus}
      />

      <div style={cardStyle()}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "10px",
            alignItems: "end",
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
              Subscription
            </span>
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Netflix, Dropbox, Notion..."
              style={controlStyle()}
            />
          </label>
          <label style={{ display: "grid", gap: "6px" }}>
            <span
              style={{
                color: "var(--text3)",
                fontSize: "10px",
                textTransform: "uppercase",
              }}
            >
              Monthly
            </span>
            <input
              value={draftCost}
              onChange={(event) => setDraftCost(event.target.value)}
              inputMode="decimal"
              placeholder="9.99"
              style={controlStyle()}
            />
          </label>
          <label style={{ display: "grid", gap: "6px" }}>
            <span
              style={{
                color: "var(--text3)",
                fontSize: "10px",
                textTransform: "uppercase",
              }}
            >
              Category
            </span>
            <select
              value={draftCategory}
              onChange={(event) =>
                setDraftCategory(
                  event.target.value as SubscriptionEscapeCategory,
                )
              }
              style={controlStyle()}
            >
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: "6px" }}>
            <span
              style={{
                color: "var(--text3)",
                fontSize: "10px",
                textTransform: "uppercase",
              }}
            >
              Replacement
            </span>
            <select
              value={draftReplacementId}
              onChange={(event) => setDraftReplacementId(event.target.value)}
              style={controlStyle()}
            >
              <option value="">Auto-pick from category</option>
              {catalog.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={addSubscription}
            style={buttonStyle(true)}
          >
            Add
          </button>
        </div>
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <ShellBadge tone={loadStatus === "error" ? "default" : "muted"}>
            {loadStatus === "error"
              ? "Local API unavailable"
              : "Protected local API"}
          </ShellBadge>
          <ShellBadge
            tone={
              saveStatus === "error"
                ? "default"
                : saveStatus === "saved"
                  ? "success"
                  : "muted"
            }
          >
            {saveStatus === "saving"
              ? "Saving"
              : saveStatus === "saved"
                ? "Saved"
                : saveStatus === "error"
                  ? "Save failed"
                  : "Server-side file"}
          </ShellBadge>
          <ShellBadge tone="muted">
            {payload?.storage?.pathHint ?? "data/subscription-escape.json"}
          </ShellBadge>
        </div>
      </div>

      <div style={{ display: "grid", gap: "12px" }}>
        <SectionLabel detail={`${state.subscriptions.length} tracked`}>
          Subscription inventory
        </SectionLabel>
        {state.subscriptions.length === 0 ? (
          <div style={cardStyle()}>
            <strong>Start with the highest bill.</strong>
            <p
              style={{
                margin: "8px 0 0",
                color: "var(--text2)",
                fontSize: "12px",
              }}
            >
              Add one subscription above, choose a replacement, then work the
              safety checklist before canceling anything.
            </p>
          </div>
        ) : (
          state.subscriptions.map((item) => {
            const replacement = findReplacement(catalog, item.replacementId);
            const completeCount = countCompletedSafetySteps(item);
            const safe = isSafeToCancel(item);
            return (
              <article
                key={item.id}
                style={cardStyle(safe ? "accent" : "normal")}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong>{item.name}</strong>
                    <p
                      style={{
                        margin: "6px 0 0",
                        color: "var(--text2)",
                        fontSize: "12px",
                      }}
                    >
                      {CATEGORY_LABELS[item.category]} |{" "}
                      {money(item.monthlyCost)}/mo
                      {replacement ? ` -> ${replacement.title}` : ""}
                    </p>
                  </div>
                  <div
                    style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                  >
                    <ShellBadge tone={safe ? "success" : "accent"}>
                      {completeCount}/5 safe
                    </ShellBadge>
                    <ShellBadge
                      tone={item.status === "cancelled" ? "success" : "muted"}
                    >
                      {STATUS_LABELS[item.status]}
                    </ShellBadge>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "10px",
                    marginTop: "12px",
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
                      Status
                    </span>
                    <select
                      value={item.status}
                      onChange={(event) =>
                        patchSubscription(item, {
                          status: event.target
                            .value as SubscriptionEscapeStatus,
                        })
                      }
                      style={controlStyle()}
                    >
                      {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: "6px" }}>
                    <span
                      style={{
                        color: "var(--text3)",
                        fontSize: "10px",
                        textTransform: "uppercase",
                      }}
                    >
                      Replacement
                    </span>
                    <select
                      value={item.replacementId ?? ""}
                      onChange={(event) =>
                        patchSubscription(item, {
                          replacementId: event.target.value || undefined,
                        })
                      }
                      style={controlStyle()}
                    >
                      <option value="">Choose replacement</option>
                      {catalog.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: "6px" }}>
                    <span
                      style={{
                        color: "var(--text3)",
                        fontSize: "10px",
                        textTransform: "uppercase",
                      }}
                    >
                      Renewal
                    </span>
                    <input
                      type="date"
                      value={item.renewalDate ?? ""}
                      onChange={(event) =>
                        patchSubscription(item, {
                          renewalDate: event.target.value || undefined,
                          safety: {
                            ...item.safety,
                            cancelDateCaptured: Boolean(event.target.value),
                          },
                        })
                      }
                      style={controlStyle()}
                    />
                  </label>
                </div>

                {replacement ? (
                  <div style={{ ...cardStyle("accent"), marginTop: "12px" }}>
                    <strong style={{ fontSize: "12px" }}>
                      {replacement.bestFor}
                    </strong>
                    <p
                      style={{
                        margin: "6px 0 0",
                        color: "var(--text2)",
                        fontSize: "11px",
                      }}
                    >
                      {replacement.privacyPosture}
                    </p>
                  </div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginTop: "12px",
                  }}
                >
                  {SAFETY_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleSafety(item, key)}
                      style={buttonStyle(item.safety[key])}
                    >
                      {SUBSCRIPTION_ESCAPE_SAFETY_LABELS[key]}
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    marginTop: "12px",
                  }}
                >
                  <span
                    style={{
                      color: safe ? "var(--good)" : "var(--text3)",
                      fontSize: "11px",
                    }}
                  >
                    {safe
                      ? "All safety checks complete. You can review cancellation manually."
                      : "Do not cancel yet. Finish the checklist and verify backup/recovery first."}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSubscription(item)}
                    style={buttonStyle()}
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "12px",
        }}
      >
        <div style={cardStyle()}>
          <SectionLabel detail={`${catalog.length} options`}>
            Replacement map
          </SectionLabel>
          <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
            {Object.entries(CATEGORY_LABELS).map(([category, label]) => (
              <div
                key={category}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px",
                  fontSize: "12px",
                }}
              >
                <span>{label}</span>
                <ShellBadge tone="muted">
                  {replacementByCategory[
                    category as SubscriptionEscapeCategory
                  ] ?? 0}
                </ShellBadge>
              </div>
            ))}
          </div>
        </div>

        <div style={cardStyle()}>
          <SectionLabel detail="No public exposure">
            Safety guardrails
          </SectionLabel>
          <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
            {guardrails.map((entry) => (
              <p
                key={entry}
                style={{
                  margin: 0,
                  color: "var(--text2)",
                  fontSize: "11px",
                  lineHeight: 1.5,
                }}
              >
                {entry}
              </p>
            ))}
          </div>
        </div>

        <div style={cardStyle()}>
          <SectionLabel detail={`${sources.length} links`}>
            Source shelf
          </SectionLabel>
          <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
            {sources.map((source) => (
              <a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "var(--accent)",
                  fontSize: "11px",
                  lineHeight: 1.4,
                }}
              >
                {source.id.replace("yt-", "")} Open
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
