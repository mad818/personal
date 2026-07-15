"use client";

import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useStore, type PrivacyShieldStatus } from "@/store/useStore";
import { ShellBadge, ShellButton } from "@/components/ui/shell";

type PrivacyShieldPreviewPayload = PrivacyShieldStatus & {
  safePreview: string;
};

const SAMPLE_TEXT = [
  "token=exampleSecretValue1234567890",
  "open localhost:11434 for local model checks",
  "path C:\\private\\secrets\\vault.txt",
  "operator-only incident evidence must stay local",
].join("\n");

function normalizePreview(value: unknown): PrivacyShieldPreviewPayload | null {
  if (!value || typeof value !== "object") return null;
  const preview = value as Partial<PrivacyShieldPreviewPayload>;
  if (typeof preview.safePreview !== "string") return null;
  return {
    active: preview.active === true,
    provider: preview.provider,
    policy: preview.policy,
    protectedKinds: Array.isArray(preview.protectedKinds)
      ? preview.protectedKinds.filter(
          (kind): kind is string => typeof kind === "string",
        )
      : [],
    protectedFields: Array.isArray(preview.protectedFields)
      ? preview.protectedFields.filter(
          (field): field is string => typeof field === "string",
        )
      : [],
    protectedCount:
      typeof preview.protectedCount === "number" &&
      Number.isFinite(preview.protectedCount)
        ? preview.protectedCount
        : 0,
    summary:
      typeof preview.summary === "string"
        ? preview.summary
        : "Privacy shield preview completed.",
    classCounts:
      preview.classCounts && typeof preview.classCounts === "object"
        ? preview.classCounts
        : {},
    dispatchMode: preview.dispatchMode === "blocked" ? "blocked" : "redacted",
    blockedReason:
      typeof preview.blockedReason === "string" ? preview.blockedReason : null,
    updatedAt: Date.now(),
    safePreview: preview.safePreview,
  };
}

export default function PrivacyShieldPreviewPanel() {
  const setPrivacyShieldStatus = useStore((s) => s.setPrivacyShieldStatus);
  const [text, setText] = useState(SAMPLE_TEXT);
  const [preview, setPreview] = useState<PrivacyShieldPreviewPayload | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const runPreview = useCallback(async () => {
    setBusy(true);
    setNote(null);
    try {
      const response = await apiFetch("/api/privacy-shield/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        setNote("Preview unavailable.");
        return;
      }
      const payload = (await response.json().catch(() => null)) as {
        preview?: unknown;
      } | null;
      const normalized = normalizePreview(payload?.preview);
      if (!normalized) {
        setNote("Preview returned no usable posture.");
        return;
      }
      setPreview(normalized);
      setPrivacyShieldStatus(normalized.active ? normalized : null);
    } catch {
      setNote("Preview unavailable.");
    } finally {
      setBusy(false);
    }
  }, [setPrivacyShieldStatus, text]);

  return (
    <section
      className="rounded-xl border border-white/10 bg-black/20 p-3"
      data-testid="privacy-shield-preview-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black text-[var(--text)]">
            Privacy shield preview
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--text2)]">
            Local redaction posture for cloud-bound dispatch.
          </p>
        </div>
        <ShellBadge
          tone={preview?.dispatchMode === "blocked" ? "accent" : "muted"}
        >
          {preview?.dispatchMode ?? "idle"}
        </ShellBadge>
      </div>

      <textarea
        aria-label="Privacy shield preview text"
        className="mt-3 min-h-[96px] w-full resize-y rounded-xl border border-white/10 bg-black/30 p-3 text-xs leading-5 text-[var(--text)] outline-none"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ShellButton onClick={runPreview} disabled={busy}>
          {busy ? "Checking" : "Preview shield"}
        </ShellButton>
        {note ? (
          <span className="text-[11px] font-bold text-[var(--text3)]">
            {note}
          </span>
        ) : null}
      </div>

      {preview ? (
        <div className="mt-3 grid gap-3">
          <div className="flex flex-wrap gap-2">
            <ShellBadge tone="muted">
              {preview.policy ?? "local policy"}
            </ShellBadge>
            <ShellBadge tone="muted">
              {preview.protectedCount} protected
            </ShellBadge>
            {(preview.protectedFields ?? []).map((field) => (
              <ShellBadge key={field} tone="muted">
                {field.replace(/_/g, " ")}
              </ShellBadge>
            ))}
          </div>
          <p className="text-xs leading-5 text-[var(--text2)]">
            {preview.summary}
          </p>
          {preview.blockedReason ? (
            <p className="text-xs font-bold leading-5 text-[var(--text2)]">
              {preview.blockedReason}
            </p>
          ) : null}
          <pre
            className="max-h-40 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] leading-5 text-[var(--text2)]"
            data-testid="privacy-shield-safe-preview"
          >
            {preview.safePreview}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
