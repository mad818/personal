"use client";

import { useRef, useState, type CSSProperties } from "react";
import {
  getSubscriptionEscapeAccessCounts,
  SUBSCRIPTION_ESCAPE_ACCESS_ROLE_LABELS,
  SUBSCRIPTION_ESCAPE_ACCESS_STATUS_LABELS,
  type SubscriptionEscapeAccessEntry,
  type SubscriptionEscapeAccessPosture,
  type SubscriptionEscapeAccessRole,
  type SubscriptionEscapeAccessStatus,
  type SubscriptionEscapeState,
} from "@/lib/subscriptionEscape";
import { SectionLabel, ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { ActionDialog } from "@/components/ui/ActionDialog";
import { useActionDialog } from "@/hooks/useActionDialog";

interface EscapeAccessBackupPanelProps {
  state: SubscriptionEscapeState;
  saveStatus: "idle" | "saving" | "saved" | "error";
  storageHint: string;
  onReplaceState: (state: Partial<SubscriptionEscapeState>) => void;
  onChangeAccess: (
    updater: (
      access: SubscriptionEscapeAccessPosture,
    ) => SubscriptionEscapeAccessPosture,
  ) => void;
}

function cardStyle(tone: "normal" | "accent" = "normal"): CSSProperties {
  return {
    padding: "12px",
    borderRadius: "12px",
    border:
      tone === "accent"
        ? "1px solid rgba(120, 196, 255, 0.36)"
        : "1px solid var(--border)",
    background:
      tone === "accent" ? "rgba(56, 122, 255, 0.1)" : "rgba(10, 15, 30, 0.62)",
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
      ? "1px solid rgba(110, 231, 183, 0.56)"
      : "1px solid var(--border)",
    background: active ? "rgba(110, 231, 183, 0.18)" : "rgba(10, 15, 30, 0.58)",
    color: "var(--text)",
    fontSize: "12px",
    cursor: "pointer",
  };
}

function labelStyle(): CSSProperties {
  return {
    display: "grid",
    gap: "6px",
  };
}

function labelTextStyle(): CSSProperties {
  return {
    color: "var(--text3)",
    fontSize: "10px",
    textTransform: "uppercase",
  };
}

function buildId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}`;
}

function getBackupFileName() {
  return `nexus-escape-backup-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`;
}

function getImportCandidate(input: unknown): Partial<SubscriptionEscapeState> {
  if (!input || typeof input !== "object") {
    throw new Error("Backup is not an object.");
  }
  const maybeWrapped = input as { state?: unknown };
  const candidate = (maybeWrapped.state ??
    input) as Partial<SubscriptionEscapeState>;
  if (!candidate || typeof candidate !== "object" || candidate.version !== 1) {
    throw new Error("Backup is not a Nexus Escape v1 file.");
  }
  return candidate;
}

function describeImport(candidate: Partial<SubscriptionEscapeState>) {
  const subscriptions = Array.isArray(candidate.subscriptions)
    ? candidate.subscriptions.length
    : 0;
  const media = Array.isArray(candidate.mediaLibrary)
    ? candidate.mediaLibrary.length
    : 0;
  const access = Array.isArray(candidate.access?.authorized)
    ? candidate.access.authorized.length
    : 0;
  return `${subscriptions} subscriptions, ${media} media items, ${access} access records`;
}

export default function EscapeAccessBackupPanel({
  state,
  saveStatus,
  storageHint,
  onReplaceState,
  onChangeAccess,
}: EscapeAccessBackupPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftDevice, setDraftDevice] = useState("");
  const [draftRole, setDraftRole] =
    useState<SubscriptionEscapeAccessRole>("family");
  const [message, setMessage] = useState("");
  const actionDialog = useActionDialog();
  const counts = getSubscriptionEscapeAccessCounts(state.access);

  function exportBackup() {
    const payload = {
      kind: "nexus-subscription-escape-backup-v1",
      exportedAt: new Date().toISOString(),
      source: "Nexus Prime Escape",
      state,
    };
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = getBackupFileName();
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Backup downloaded.");
  }

  async function importBackup(file: File | null) {
    if (!file) return;
    try {
      const raw = await file.text();
      const candidate = getImportCandidate(JSON.parse(raw));
      const description = describeImport(candidate);
      const confirmed = await actionDialog.requestActionDialog({
        eyebrow: "Backup restore",
        title: "Restore this backup?",
        description: `This replaces the current Escape state with ${description}. Download a current backup first if you may need to undo the restore.`,
        confirmLabel: "Restore backup",
        tone: "danger",
      });
      if (!confirmed) return;

      onReplaceState(candidate);
      setMessage(`Restore started: ${description}.`);
    } catch {
      setMessage("Backup import failed.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function addAccessRecord() {
    const label = draftLabel.trim();
    if (!label) {
      setMessage("Add a name first.");
      return;
    }
    const item: SubscriptionEscapeAccessEntry = {
      id: buildId("access"),
      label,
      role: draftRole,
      status: "active",
      deviceHint: draftDevice.trim() || undefined,
      tailscaleManaged: true,
      updatedAt: new Date().toISOString(),
    };
    onChangeAccess((access) => ({
      ...access,
      authorized: [item, ...access.authorized],
    }));
    setDraftLabel("");
    setDraftDevice("");
    setMessage("Access record added.");
  }

  function patchAccessRecord(
    item: SubscriptionEscapeAccessEntry,
    patch: Partial<SubscriptionEscapeAccessEntry>,
  ) {
    onChangeAccess((access) => ({
      ...access,
      authorized: access.authorized.map((entry) =>
        entry.id === item.id
          ? { ...entry, ...patch, updatedAt: new Date().toISOString() }
          : entry,
      ),
    }));
  }

  function removeAccessRecord(item: SubscriptionEscapeAccessEntry) {
    onChangeAccess((access) => ({
      ...access,
      authorized: access.authorized.filter((entry) => entry.id !== item.id),
    }));
    setMessage("Access record removed.");
  }

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <SurfaceCallout
        tone="info"
        compact
        icon="A"
        title="Tailscale-first private access"
        description="Cloud can be used for optional backups, but the local MacBook state stays the source of truth. Link access still needs Tailscale/private network plus Nexus authorization."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "10px",
        }}
      >
        <div style={cardStyle("accent")}>
          <SectionLabel detail="Private path">Tailscale</SectionLabel>
          <strong style={{ fontSize: "18px" }}>Primary</strong>
        </div>
        <div style={cardStyle()}>
          <SectionLabel detail="App gate">Nexus auth</SectionLabel>
          <strong style={{ fontSize: "18px" }}>Required</strong>
        </div>
        <div style={cardStyle()}>
          <SectionLabel detail="Not required">Cloud</SectionLabel>
          <strong style={{ fontSize: "18px" }}>Backup only</strong>
        </div>
        <div style={cardStyle()}>
          <SectionLabel detail="People/devices">Active</SectionLabel>
          <strong style={{ fontSize: "18px" }}>{counts.active}</strong>
        </div>
      </div>

      <section style={cardStyle()}>
        <SectionLabel detail={storageHint}>Backup and restore</SectionLabel>
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginTop: "10px",
          }}
        >
          <button
            type="button"
            onClick={exportBackup}
            style={buttonStyle(true)}
          >
            Download backup
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={buttonStyle()}
          >
            Import backup
          </button>
          <input
            aria-label="Import access backup"
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={(event) =>
              void importBackup(event.currentTarget.files?.[0] ?? null)
            }
            style={{ display: "none" }}
          />
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
                  : "Local source of truth"}
          </ShellBadge>
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
          Keep the downloaded JSON locally or in an encrypted cloud backup if
          you want offsite recovery. Nexus does not need cloud to run.
        </p>
      </section>

      <section style={cardStyle()}>
        <SectionLabel detail={`${counts.total} tracked`}>
          Authorized people and devices
        </SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "10px",
            marginTop: "10px",
            alignItems: "end",
          }}
        >
          <label style={labelStyle()}>
            <span style={labelTextStyle()}>Person or device</span>
            <input
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              placeholder="Mario iPad, family member..."
              style={controlStyle()}
            />
          </label>
          <label style={labelStyle()}>
            <span style={labelTextStyle()}>Device note</span>
            <input
              value={draftDevice}
              onChange={(event) => setDraftDevice(event.target.value)}
              placeholder="Tailscale name or device"
              style={controlStyle()}
            />
          </label>
          <label style={labelStyle()}>
            <span style={labelTextStyle()}>Role</span>
            <select
              value={draftRole}
              onChange={(event) =>
                setDraftRole(event.target.value as SubscriptionEscapeAccessRole)
              }
              style={controlStyle()}
            >
              {Object.entries(SUBSCRIPTION_ESCAPE_ACCESS_ROLE_LABELS).map(
                ([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>
          <button
            type="button"
            onClick={addAccessRecord}
            style={buttonStyle(true)}
          >
            Add access
          </button>
        </div>

        <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
          {state.access.authorized.length === 0 ? (
            <div style={cardStyle("accent")}>
              <strong>No shared access recorded yet.</strong>
              <p
                style={{
                  margin: "8px 0 0",
                  color: "var(--text2)",
                  fontSize: "12px",
                }}
              >
                Add people or devices here when you share the Tailscale/Nexus
                path. This tracker helps you revoke access cleanly later.
              </p>
            </div>
          ) : (
            state.access.authorized.map((item) => (
              <article key={item.id} style={cardStyle()}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong>{item.label}</strong>
                    <p
                      style={{
                        margin: "6px 0 0",
                        color: "var(--text2)",
                        fontSize: "12px",
                      }}
                    >
                      {item.deviceHint || "No device note"} |{" "}
                      {SUBSCRIPTION_ESCAPE_ACCESS_ROLE_LABELS[item.role]}
                    </p>
                  </div>
                  <ShellBadge
                    tone={item.status === "active" ? "success" : "muted"}
                  >
                    {SUBSCRIPTION_ESCAPE_ACCESS_STATUS_LABELS[item.status]}
                  </ShellBadge>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    marginTop: "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      patchAccessRecord(item, { status: "remove_pending" })
                    }
                    style={buttonStyle(item.status === "remove_pending")}
                  >
                    Mark remove pending
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      patchAccessRecord(item, { status: "revoked" })
                    }
                    style={buttonStyle(item.status === "revoked")}
                  >
                    Mark revoked
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAccessRecord(item)}
                    style={buttonStyle()}
                  >
                    Delete record
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section style={cardStyle()}>
        <SectionLabel detail="Manual outside Nexus">Revoke access</SectionLabel>
        <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
          {state.access.revocationChecklist.map((step) => (
            <p
              key={step}
              style={{
                margin: 0,
                color: "var(--text2)",
                fontSize: "12px",
                lineHeight: 1.5,
              }}
            >
              {step}
            </p>
          ))}
        </div>
      </section>
      <ActionDialog controller={actionDialog} />
    </div>
  );
}
