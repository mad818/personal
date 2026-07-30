"use client";

import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { validateToken, type TokenValidationStatus } from "@/lib/apiFetch";
import { useModalDialog } from "@/hooks/useModalDialog";
import type { ActionDialogController } from "@/hooks/useActionDialog";

interface ActionDialogFrameProps {
  open: boolean;
  eyebrow: string;
  title: string;
  description: string;
  tone?: "default" | "danger";
  role?: "dialog" | "alertdialog";
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
}

function ActionDialogFrame({
  open,
  eyebrow,
  title,
  description,
  tone = "default",
  role = "alertdialog",
  busy = false,
  onClose,
  children,
}: ActionDialogFrameProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useModalDialog({ open, onClose });

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="nexus-action-dialog__overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={busy}
        tabIndex={-1}
        className="nexus-action-dialog"
        data-tone={tone}
      >
        <div className="nexus-action-dialog__signal" aria-hidden="true" />
        <div className="nexus-action-dialog__body">
          <span className="nexus-action-dialog__eyebrow">{eyebrow}</span>
          <h2 id={titleId} className="nexus-action-dialog__title">
            {title}
          </h2>
          <p id={descriptionId} className="nexus-action-dialog__description">
            {description}
          </p>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ActionDialog({
  controller,
}: {
  controller: ActionDialogController;
}) {
  const { dialog, confirmDialog, cancelDialog } = controller;
  const hasCancel = dialog?.cancelLabel !== null;

  return (
    <ActionDialogFrame
      open={Boolean(dialog)}
      eyebrow={dialog?.eyebrow ?? "Confirm action"}
      title={dialog?.title ?? "Confirm action"}
      description={dialog?.description ?? ""}
      tone={dialog?.tone}
      onClose={cancelDialog}
    >
      <div className="nexus-action-dialog__actions">
        {hasCancel ? (
          <button
            type="button"
            className="nexus-action-dialog__button"
            data-dialog-initial-focus
            onClick={cancelDialog}
          >
            {dialog?.cancelLabel ?? "Cancel"}
          </button>
        ) : null}
        <button
          type="button"
          className="nexus-action-dialog__button nexus-action-dialog__button--primary"
          data-dialog-initial-focus={hasCancel ? undefined : true}
          onClick={confirmDialog}
        >
          {dialog?.confirmLabel ?? "Confirm"}
        </button>
      </div>
    </ActionDialogFrame>
  );
}

function tokenValidationMessage(status: TokenValidationStatus) {
  if (status === "ok") return "Step-up refreshed.";
  if (status === "rate_limited") return "Revalidation is rate limited.";
  if (status === "server_error") return "Runtime could not refresh privilege.";
  if (status === "unreachable") return "Runtime unreachable.";
  return "Token rejected.";
}

interface StepUpAccessDialogProps {
  open: boolean;
  onClose: () => void;
  onResult?: (
    status: TokenValidationStatus,
    message: string,
  ) => void | Promise<void>;
}

export function StepUpAccessDialog({
  open,
  onClose,
  onResult,
}: StepUpAccessDialogProps) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  useEffect(() => {
    if (open) return;
    setToken("");
    setBusy(false);
    setError(null);
  }, [open]);

  const closeIfIdle = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || busy) return;

    setBusy(true);
    setError(null);

    let status: TokenValidationStatus = "unreachable";
    try {
      status = await validateToken(token, {
        persistOnSuccess: true,
        elevate: true,
      });
    } catch {
      status = "unreachable";
    }

    const message = tokenValidationMessage(status);
    try {
      await onResult?.(status, message);
    } catch {
      // Diagnostics refresh is best-effort; the validation result remains authoritative.
    }

    if (status === "ok") {
      onClose();
    } else {
      setError(message);
    }
    setBusy(false);
  }

  return (
    <ActionDialogFrame
      open={open}
      eyebrow="Protected action"
      title="Refresh elevated access"
      description="Re-enter the Nexus token to refresh review-gated protected actions. The value stays in this dialog and is cleared when it closes."
      role="dialog"
      busy={busy}
      onClose={closeIfIdle}
    >
      <form className="nexus-action-dialog__form" onSubmit={handleSubmit}>
        <label className="nexus-action-dialog__field">
          <span className="nexus-action-dialog__label">Nexus token</span>
          <input
            type="password"
            name="nexus-token-revalidation"
            autoComplete="off"
            spellCheck={false}
            value={token}
            disabled={busy}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            data-dialog-initial-focus
            className="nexus-action-dialog__input"
            onChange={(event) => {
              setToken(event.target.value);
              setError(null);
            }}
          />
        </label>
        {error ? (
          <p id={errorId} role="alert" className="nexus-action-dialog__error">
            {error}
          </p>
        ) : null}
        <div className="nexus-action-dialog__actions">
          <button
            type="button"
            className="nexus-action-dialog__button"
            disabled={busy}
            onClick={closeIfIdle}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="nexus-action-dialog__button nexus-action-dialog__button--primary"
            disabled={!token || busy}
          >
            {busy ? "Checking" : "Refresh access"}
          </button>
        </div>
      </form>
    </ActionDialogFrame>
  );
}
